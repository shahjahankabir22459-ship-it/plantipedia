/**
 * Dedicated "Bangladeshi 6-Season Botanical Calendar" Page (/seasons/)
 * - Auto-highlights the current Bangladeshi season (Shororitu) by default
 * - Allows clicking any season card to inspect seasonal ecological notes & filtered flora
 * - Renders a fixed bottom-right floating "← Go Back" button when inspecting an individual season view
 */

import {
  createEl,
  createSpeciesCardElement,
  sanitizeUrl,
} from "../utils/templates.js";
import { animateDynamicSpeciesGrid } from "../../core/telemetry/animations.js";
import { applySeasonsSeo } from "../utils/seo.js";

function detectCurrentBangladeshiSeasonId(seasons) {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const mmdd = m * 100 + d;

  for (const s of seasons) {
    const windows = Array.isArray(s.monthWindows) ? s.monthWindows : [];
    for (const [m1, d1, m2, d2] of windows) {
      const start = m1 * 100 + d1;
      const end = m2 * 100 + d2;
      if (mmdd >= start && mmdd <= end) {
        return s.id;
      }
    }
  }
  return seasons[0]?.id || "grishmo";
}

function renderSeasonSpeciesGrid(speciesList, seasonObj) {
  const grid = createEl("div", "species-grid species-grid--directory");
  speciesList.forEach((plant) => {
    const card = createSpeciesCardElement(plant, "Explore Monograph");
    const phenologyNote = plant.seasonalPhenology?.[seasonObj.id];
    if (phenologyNote) {
      const body = card.querySelector(".species-card-body");
      const cta = card.querySelector(".species-card-cta");
      if (body && cta) {
        const noteEl = createEl(
          "p",
          "season-phenology-note",
          `${seasonObj.nameBn}: ${phenologyNote}`,
        );
        body.insertBefore(noteEl, cta);
      }
    }
    grid.appendChild(card);
  });
  return grid;
}

export function renderSeasonsCalendar(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const seasons = Array.isArray(pageData.seasons) ? pageData.seasons : [];
  const ui = pageData.ui || {};
  const bannerCfg = pageData.banner || {};
  const currentSeasonId = detectCurrentBangladeshiSeasonId(seasons);
  const seasonMap = new Map(seasons.map((s) => [s.id, s]));

  function resolveFocusedSeasonFromUrl() {
    const q = new URLSearchParams(window.location.search).get("season");
    if (!q) return null;
    return seasonMap.get(q.trim().toLowerCase()) || null;
  }

  let focusedSeason = resolveFocusedSeasonFromUrl();
  let highlightedSeasonId = focusedSeason?.id || currentSeasonId;

  function syncFloatingBackButton(visible, onBack) {
    let btn = document.getElementById("seasonsFloatingBackBtn");
    if (!visible) {
      if (btn) btn.remove();
      return;
    }
    if (!btn) {
      btn = createEl("button", "floating-back-btn", ui.goBackLabel || "← Go Back");
      btn.type = "button";
      btn.id = "seasonsFloatingBackBtn";
      btn.setAttribute("aria-label", "Return to all 6 Bangladeshi seasons");
      document.body.appendChild(btn);
    }
    btn.onclick = onBack;
  }

  function updateSeasonParam(seasonId) {
    try {
      const url = new URL(window.location.href);
      if (seasonId) {
        url.searchParams.set("season", seasonId);
      } else {
        url.searchParams.delete("season");
      }
      window.history.pushState({ season: seasonId || null }, "", url.toString());
    } catch {
      // Ignore history restrictions
    }
  }

  function renderSeasonDetailBlock(container, seasonObj) {
    const activeSpecies = (speciesIndex || []).filter(
      (p) => Array.isArray(p.seasons) && p.seasons.includes(seasonObj.id),
    );

    const ecoCard = createEl("section", "season-ecological-panel");
    ecoCard.setAttribute("aria-label", `${seasonObj.nameEn} ecological notes`);

    const ecoHead = createEl("div", "season-eco-head");
    const ecoTitles = document.createElement("div");
    ecoTitles.appendChild(
      createEl(
        "span",
        "section-eyebrow",
        `${seasonObj.bengaliMonths} · ${seasonObj.gregorianRange}`,
      ),
    );
    ecoTitles.appendChild(
      createEl(
        "h2",
        "season-eco-heading",
        `${seasonObj.nameEn} (${seasonObj.nameBn}) — ${seasonObj.phenologyHighlight}`,
      ),
    );
    ecoHead.appendChild(ecoTitles);

    if (seasonObj.id === currentSeasonId) {
      ecoHead.appendChild(
        createEl("span", "season-current-indicator", ui.currentBadge || "Current Season"),
      );
    }
    ecoCard.appendChild(ecoHead);
    ecoCard.appendChild(createEl("p", "justified-prose", seasonObj.climateSummary));

    if (Array.isArray(seasonObj.ecologicalNotes) && seasonObj.ecologicalNotes.length > 0) {
      const ul = createEl("ul", "family-traits-list");
      seasonObj.ecologicalNotes.forEach((n) => ul.appendChild(createEl("li", "family-trait-item", n)));
      ecoCard.appendChild(ul);
    }
    container.appendChild(ecoCard);

    const floraTitle = createEl(
      "h2",
      "taxonomy-members-heading",
      (ui.floraSectionHeading || "Flora Active in {season} ({bn})")
        .replace("{season}", seasonObj.nameEn)
        .replace("{bn}", seasonObj.nameBn),
    );
    container.appendChild(floraTitle);

    const grid = renderSeasonSpeciesGrid(activeSpecies, seasonObj);
    container.appendChild(grid);
    animateDynamicSpeciesGrid(grid);
  }

  function renderView() {
    try {
      const seoSpecies = focusedSeason
        ? (speciesIndex || []).filter(
            (p) => Array.isArray(p.seasons) && p.seasons.includes(focusedSeason.id),
          )
        : [];
      applySeasonsSeo({
        pageData,
        seasons,
        focusedSeason,
        activeSpecies: seoSpecies,
      });
    } catch {
      // Non-blocking SEO update
    }
    const wrapper = createEl("div", "seasons-calendar-shell");
    const container = createEl("div", "section-container");

    // Breadcrumb & Banner
    const breadcrumbNav = createEl("nav", "breadcrumb-bar");
    breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
    const ol = createEl("ol", "breadcrumb-list");
    const crumbs = focusedSeason
      ? [
          { label: "Home", href: "./" },
          { label: "6-Season Calendar", href: "./seasons/" },
          { label: `${focusedSeason.nameEn} (${focusedSeason.nameBn})`, current: true },
        ]
      : bannerCfg.breadcrumbs || [
          { label: "Home", href: "./" },
          { label: "6-Season Calendar", current: true },
        ];

    crumbs.forEach((crumb, idx) => {
      const li = createEl("li", "breadcrumb-item");
      if (idx > 0) {
        const sep = createEl("span", "breadcrumb-sep", "/");
        sep.setAttribute("aria-hidden", "true");
        li.appendChild(sep);
      }
      if (crumb.current || !crumb.href) {
        const span = createEl("span", "breadcrumb-current", crumb.label);
        span.setAttribute("aria-current", "page");
        li.appendChild(span);
      } else {
        const a = createEl("a", "breadcrumb-link", crumb.label);
        a.href = sanitizeUrl(crumb.href, "./");
        li.appendChild(a);
      }
      ol.appendChild(li);
    });
    breadcrumbNav.appendChild(ol);
    container.appendChild(breadcrumbNav);

    const header = createEl("div", "taxonomy-page-header");
    header.appendChild(
      createEl(
        "span",
        "section-eyebrow",
        focusedSeason
          ? `${focusedSeason.bengaliMonths} · ${focusedSeason.gregorianRange}`
          : bannerCfg.eyebrow || "Phenology & Climate",
      ),
    );
    header.appendChild(
      createEl(
        "h1",
        "directory-headline",
        focusedSeason
          ? `${focusedSeason.nameEn} (${focusedSeason.nameBn})`
          : bannerCfg.headline || "Bangladeshi 6-Season Botanical Calendar",
      ),
    );
    header.appendChild(
      createEl(
        "p",
        "directory-subcopy",
        focusedSeason ? focusedSeason.climateSummary : bannerCfg.subcopy || "",
      ),
    );
    container.appendChild(header);

    if (!focusedSeason) {
      syncFloatingBackButton(false);

      const seasonGrid = createEl("div", "seasons-grid");
      seasons.forEach((s) => {
        const isCurrent = s.id === currentSeasonId;
        const isActive = s.id === highlightedSeasonId;
        const count = (speciesIndex || []).filter(
          (p) => Array.isArray(p.seasons) && p.seasons.includes(s.id),
        ).length;

        const card = createEl(
          "button",
          `season-card${isCurrent ? " is-current-season" : ""}${isActive ? " is-selected" : ""}`,
        );
        card.type = "button";
        card.setAttribute("data-season-id", s.id);

        const top = createEl("div", "season-card-top");
        top.appendChild(createEl("span", "season-number", s.number));
        if (isCurrent) {
          top.appendChild(
            createEl("span", "season-current-indicator", ui.currentBadge || "Current Season"),
          );
        } else {
          top.appendChild(createEl("span", "season-months-meta", s.gregorianRange));
        }
        card.appendChild(top);

        const titles = createEl("div", "season-card-titles");
        titles.appendChild(createEl("h2", "season-card-en", s.nameEn));
        titles.appendChild(createEl("span", "season-card-bn", s.nameBn));
        card.appendChild(titles);

        card.appendChild(createEl("p", "season-card-bengali-months", s.bengaliMonths));
        card.appendChild(createEl("p", "season-card-highlight", s.phenologyHighlight));

        const foot = createEl("div", "season-card-footer");
        foot.appendChild(
          createEl(
            "span",
            "season-count-label",
            (ui.speciesCountTemplate || "{count} Active Species").replace(
              "{count}",
              String(count),
            ),
          ),
        );
        foot.appendChild(
          createEl("span", "family-inspect-cta", ui.inspectSeasonCta || "Explore Season Flora →"),
        );
        card.appendChild(foot);

        card.addEventListener("click", () => {
          focusedSeason = s;
          highlightedSeasonId = s.id;
          updateSeasonParam(s.id);
          renderView();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        seasonGrid.appendChild(card);
      });

      container.appendChild(seasonGrid);

      const previewSeason = seasonMap.get(highlightedSeasonId) || seasons[0];
      if (previewSeason) {
        renderSeasonDetailBlock(container, previewSeason);
      }
    } else {
      // Individual Focused Season View + Floating Go Back
      renderSeasonDetailBlock(container, focusedSeason);

      syncFloatingBackButton(true, () => {
        focusedSeason = null;
        highlightedSeasonId = currentSeasonId;
        updateSeasonParam(null);
        renderView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    wrapper.appendChild(container);
    mountEl.replaceChildren(wrapper);
  }

  window.addEventListener("popstate", () => {
    focusedSeason = resolveFocusedSeasonFromUrl();
    highlightedSeasonId = focusedSeason?.id || currentSeasonId;
    renderView();
  });

  renderView();
}
