/**
 * Dedicated "Taxonomic Lineage" Explorer Page (/taxonomy/)
 * Step 1: Glassmorphism grid of botanical families with description, Bengali name & live species count
 * Step 2: Filtered family diagnostic traits & species archive + fixed bottom-right Floating "← Go Back" button
 */

import {
  createEl,
  createSpeciesCardElement,
  sanitizeUrl,
} from "../utils/templates.js";
import { animateDynamicSpeciesGrid } from "../../core/telemetry/animations.js";
import { applyTaxonomySeo } from "../utils/seo.js";

function buildFamilyDirectory(speciesIndex, familiesMeta = {}) {
  const map = new Map();
  (speciesIndex || []).forEach((plant) => {
    const familyName = plant.family || plant.overview?.family;
    if (!familyName) return;
    if (!map.has(familyName)) {
      const meta = familiesMeta[familyName] || {};
      map.set(familyName, {
        name: familyName,
        familyBn: plant.familyBn || meta.familyBn || "",
        order: meta.order || "Angiosperms",
        clade: meta.clade || plant.plantGroup || "Vascular Flora",
        description:
          meta.description ||
          `Documented monographs belonging to the ${familyName} botanical family.`,
        traits: Array.isArray(meta.traits) ? meta.traits : [],
        species: [],
      });
    }
    map.get(familyName).species.push(plant);
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function renderTaxonomyBanner(container, bannerCfg, activeFamilyObj) {
  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  const ol = createEl("ol", "breadcrumb-list");

  const crumbs = activeFamilyObj
    ? [
        { label: "Home", href: "./" },
        { label: "Taxonomic Lineage", href: "./taxonomy/" },
        { label: activeFamilyObj.name, current: true },
      ]
    : bannerCfg.breadcrumbs || [
        { label: "Home", href: "./" },
        { label: "Taxonomic Lineage", current: true },
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
      activeFamilyObj
        ? `${activeFamilyObj.order} · ${activeFamilyObj.clade}`
        : bannerCfg.eyebrow || "Phylogenetic Archive",
    ),
  );
  header.appendChild(
    createEl(
      "h1",
      "directory-headline",
      activeFamilyObj
        ? activeFamilyObj.familyBn
          ? `${activeFamilyObj.name} — ${activeFamilyObj.familyBn}`
          : activeFamilyObj.name
        : bannerCfg.headline || "Taxonomic Lineage Explorer",
    ),
  );
  header.appendChild(
    createEl(
      "p",
      "directory-subcopy",
      activeFamilyObj
        ? activeFamilyObj.description
        : bannerCfg.subcopy || "",
    ),
  );
  container.appendChild(header);
}

export function renderTaxonomyExplorer(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const ui = pageData.ui || {};
  const families = buildFamilyDirectory(speciesIndex, pageData.families || {});
  const familyLookup = new Map(
    families.map((f) => [f.name.toLowerCase(), f]),
  );

  function resolveUrlFamily() {
    const param = new URLSearchParams(window.location.search).get("family");
    if (!param) return null;
    return familyLookup.get(param.trim().toLowerCase()) || null;
  }

  let activeFamily = resolveUrlFamily();

  function syncFloatingBackButton(visible, onBack) {
    let btn = document.getElementById("taxonomyFloatingBackBtn");
    if (!visible) {
      if (btn) btn.remove();
      return;
    }
    if (!btn) {
      btn = createEl("button", "floating-back-btn", ui.goBackLabel || "← Go Back");
      btn.type = "button";
      btn.id = "taxonomyFloatingBackBtn";
      btn.setAttribute("aria-label", "Return to all botanical families");
      document.body.appendChild(btn);
    }
    btn.onclick = onBack;
  }

  function updateQueryParam(familyName) {
    try {
      const url = new URL(window.location.href);
      if (familyName) {
        url.searchParams.set("family", familyName);
      } else {
        url.searchParams.delete("family");
      }
      window.history.pushState({ family: familyName || null }, "", url.toString());
    } catch {
      // Ignore history errors
    }
  }

  function renderView() {
    try {
      applyTaxonomySeo({ pageData, families, activeFamily });
    } catch {
      // Non-blocking SEO update
    }
    const wrapper = createEl("div", "taxonomy-explorer-shell");
    const container = createEl("div", "section-container");

    renderTaxonomyBanner(container, pageData.banner || {}, activeFamily);

    if (!activeFamily) {
      syncFloatingBackButton(false);

      const grid = createEl("div", "family-lineage-grid");
      families.forEach((fam) => {
        const card = createEl("button", "family-lineage-card");
        card.type = "button";
        card.setAttribute("data-family-select", fam.name);

        const topRow = createEl("div", "family-card-top");
        topRow.appendChild(createEl("span", "family-order-label", `${fam.order} · ${fam.clade}`));
        const countText =
          fam.species.length === 1
            ? ui.speciesCountSingular || "1 Documented Species"
            : (ui.speciesCountPlural || "{count} Documented Species").replace(
                "{count}",
                String(fam.species.length),
              );
        topRow.appendChild(createEl("span", "family-count-badge", countText));
        card.appendChild(topRow);

        card.appendChild(createEl("h2", "family-card-title", fam.name));
        if (fam.familyBn) {
          card.appendChild(createEl("p", "family-card-bn", fam.familyBn));
        }
        card.appendChild(createEl("p", "family-card-desc", fam.description));

        const footer = createEl("div", "family-card-footer");
        const previewNames = fam.species.map((s) => s.commonName).slice(0, 3).join(", ");
        footer.appendChild(createEl("span", "family-members-preview", previewNames));
        footer.appendChild(
          createEl("span", "family-inspect-cta", ui.viewFamilyCta || "Inspect Lineage →"),
        );
        card.appendChild(footer);

        card.addEventListener("click", () => {
          activeFamily = fam;
          updateQueryParam(fam.name);
          renderView();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        grid.appendChild(card);
      });

      container.appendChild(grid);
    } else {
      // Step 2: Family Diagnostic Traits + Filtered Species Cards
      if (activeFamily.traits.length > 0) {
        const traitsBox = createEl("section", "family-diagnostic-card");
        traitsBox.setAttribute("aria-label", "Diagnostic family traits");
        traitsBox.appendChild(
          createEl("h2", "family-traits-heading", ui.traitsHeading || "Diagnostic Family Traits"),
        );
        const list = createEl("ul", "family-traits-list");
        activeFamily.traits.forEach((trait) => {
          list.appendChild(createEl("li", "family-trait-item", trait));
        });
        traitsBox.appendChild(list);
        container.appendChild(traitsBox);
      }

      const membersHeading = createEl(
        "h2",
        "taxonomy-members-heading",
        (ui.membersHeading || "Documented Species in {family}").replace(
          "{family}",
          activeFamily.name,
        ),
      );
      container.appendChild(membersHeading);

      const speciesGrid = createEl("div", "species-grid species-grid--directory");
      activeFamily.species.forEach((plant) => {
        speciesGrid.appendChild(createSpeciesCardElement(plant, "Explore Monograph"));
      });
      container.appendChild(speciesGrid);
      animateDynamicSpeciesGrid(speciesGrid);

      syncFloatingBackButton(true, () => {
        activeFamily = null;
        updateQueryParam(null);
        renderView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    wrapper.appendChild(container);
    mountEl.replaceChildren(wrapper);
  }

  window.addEventListener("popstate", () => {
    activeFamily = resolveUrlFamily();
    renderView();
  });

  renderView();
}
