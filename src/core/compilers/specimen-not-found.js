/**
 * Shared "Specimen Not Found in Archive" Dark Botanical Luxury View
 * - Powers both root 404.html (for any invalid URL path on GitHub Pages)
 * - And /plant/ whenever ?species=<invalid-slug> is requested
 * - Features bilingual instant search (EN / বাংলা / Latin / Family) connected to species-index.json
 */

import { fetchDataset } from "../../engines/global-server/api.js";
import { getSpeciesIndex, setSpeciesIndex } from "../bootstrap/state.js";
import { applyNotFoundSeo } from "../../modules/utils/seo.js";
import { resolveSitePath } from "./navbar-compiler.js";
import { createEl, createSearchIconSvg } from "../../modules/utils/templates.js";
import {
  buildNotFoundTelemetryStats,
  createTelemetryStatsGrid,
} from "../telemetry/telemetry-stats.js";

const PLACEHOLDER_SVG_PATH = "./assets/images/placeholder-botanical.svg";

function matchesQuery(plant, query) {
  if (!query) return false;
  const q = query.trim().toLowerCase();
  const family = plant.family || plant.overview?.family || "";
  const familyBn = plant.familyBn || "";
  const plantGroup = plant.plantGroup || plant.overview?.plantGroup || "";
  const localName = plant.localName || "";
  const commonNameBn = plant.commonNameBn || "";
  const summaryBn = plant.summaryBn || "";
  return (
    plant.commonName.toLowerCase().includes(q) ||
    plant.scientificName.toLowerCase().includes(q) ||
    localName.toLowerCase().includes(q) ||
    commonNameBn.toLowerCase().includes(q) ||
    family.toLowerCase().includes(q) ||
    familyBn.toLowerCase().includes(q) ||
    summaryBn.toLowerCase().includes(q) ||
    (plant.category || "").toLowerCase().includes(q) ||
    plantGroup.toLowerCase().includes(q)
  );
}

function buildSpeciesHref(slug, isEmbed) {
  return resolveSitePath(
    `./plant/?species=${encodeURIComponent(slug)}${isEmbed ? "&embed=true" : ""}`,
  );
}

function createChipLeafSvg() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "not-found-chip-leaf");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "13");
  svg.setAttribute("height", "13");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute(
    "d",
    "M13.5 2.5C9.2 2.5 5.4 4.2 3.4 7.3c-1 1.6-1.3 3.4-.9 5.1 1.7.4 3.5.1 5.1-.9 3.1-2 4.8-5.8 5.9-9Zm-7.6 7.7c.9-.9 2-1.9 3.6-2.9a.5.5 0 1 1 .5.8c-1.4.9-2.5 1.8-3.3 2.7l-.8-.6Z",
  );
  svg.appendChild(path);
  return svg;
}

function buildQuickChipEl(entry, isEmbed) {
  const chip = document.createElement("a");
  chip.className = "not-found-pill-chip";
  chip.href = buildSpeciesHref(entry.slug, isEmbed);

  chip.appendChild(createChipLeafSvg());
  chip.appendChild(createEl("span", "not-found-chip-en", entry.commonName));

  if (entry.commonNameBn) {
    const sep = createEl("span", "not-found-chip-sep", "·");
    sep.setAttribute("aria-hidden", "true");
    chip.appendChild(sep);
    chip.appendChild(createEl("span", "not-found-chip-bn", entry.commonNameBn));
  }
  return chip;
}

function createNotFoundGlobalCta(query) {
  const cleanQuery = String(query || "").trim();
  const cta = document.createElement("a");
  cta.href = resolveSitePath(`./plant/live/?q=${encodeURIComponent(cleanQuery)}`);
  cta.className = "global-server-cta-item";
  cta.setAttribute("role", "option");

  const label = createEl(
    "span",
    "global-server-cta-label",
    `🌐 Query Global Botanical Server for "${cleanQuery}"`,
  );
  const arrow = createEl("span", "global-server-cta-arrow", "→");
  arrow.setAttribute("aria-hidden", "true");

  cta.appendChild(label);
  cta.appendChild(arrow);
  return cta;
}

function resolveNotFoundMessaging({ list, requestedSlug, requestedPath, reason, queryLabel }) {
  const totalAvailable = list.length > 0 ? list.length : 50;
  const qLabel = String(queryLabel || requestedSlug || "").trim();

  if (reason === "invalid") {
    return {
      badgeText: "GLOBAL BOTANICAL SERVER · TAXON UNRECOGNIZED",
      headingText: "Unrecognized Botanical Specimen",
      detailCopy: qLabel
        ? `"${qLabel}" is not a real plant species or recognized botanical taxon in the Global Botanical Server. Search our documented catalog below or try another botanical query.`
        : "The submitted query is not a real plant species or recognized botanical taxon in the Global Botanical Server.",
    };
  }

  if (reason === "network") {
    return {
      badgeText: "GLOBAL BOTANICAL SERVER · CONNECTION FAILED",
      headingText: "Network Connection Failed",
      detailCopy: qLabel
        ? `Unable to reach the Global Botanical Server after multiple attempts while searching for "${qLabel}". Please check your internet connection and try again.`
        : "Unable to reach the Global Botanical Server after multiple attempts. Please check your internet connection and try again.",
    };
  }

  let detailCopy = `The requested botanical monograph or archive route does not exist in our current ${totalAvailable}-species registry. Search our living catalog below or return to the main flora index.`;
  if (requestedSlug) {
    detailCopy = `No herbarium monograph matched specimen identifier "${requestedSlug}" in the current registry. Search below by English, বাংলা, or Latin name to locate a documented species.`;
  } else if (requestedPath && requestedPath !== "/404.html") {
    detailCopy = `Archive route "${requestedPath}" could not be resolved in Plantipedia. Search our ${totalAvailable} documented botanical monographs below or return to the flora gateway.`;
  }

  return {
    badgeText: "ERROR 404 · HERBARIUM RECORD MISSING",
    headingText: "Specimen Not Found in Archive",
    detailCopy,
  };
}

function bindNotFoundAutocomplete({ searchWrap, form, input, clearBtn, suggestionsEl, list, isEmbed }) {
  if (!searchWrap || !form || !input || !suggestionsEl) return () => {};

  let activeIdx = -1;
  let currentMatches = [];

  const getOptionItems = () =>
    Array.from(suggestionsEl.querySelectorAll('a[role="option"]'));

  const hideSuggestions = () => {
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
    activeIdx = -1;
  };

  const renderSuggestions = (query) => {
    const q = query.trim();
    if (clearBtn) clearBtn.hidden = q.length === 0;
    if (!q) {
      currentMatches = [];
      hideSuggestions();
      return;
    }

    currentMatches = list.filter((p) => matchesQuery(p, q)).slice(0, 8);
    activeIdx = -1;

    const frag = document.createDocumentFragment();
    if (currentMatches.length === 0) {
      const empty = createEl(
        "div",
        "nav-suggestion-empty",
        `No local species matched "${q}"`,
      );
      frag.appendChild(empty);
      if (q.length >= 2) {
        frag.appendChild(createNotFoundGlobalCta(q));
      }
      suggestionsEl.replaceChildren(frag);
      suggestionsEl.hidden = false;
      return;
    }

    currentMatches.forEach((plant, idx) => {
      const link = document.createElement("a");
      link.href = buildSpeciesHref(plant.slug, isEmbed);
      link.className = "nav-suggestion-item";
      link.setAttribute("role", "option");
      link.setAttribute("data-nf-idx", String(idx));

      const left = createEl("div", "nav-suggestion-left");
      const thumb = document.createElement("img");
      thumb.className = "nav-suggestion-thumb";
      thumb.src = plant.thumbnailUrl || resolveSitePath(PLACEHOLDER_SVG_PATH);
      thumb.alt = plant.commonName;
      thumb.loading = "lazy";
      thumb.setAttribute("referrerpolicy", "no-referrer");

      const col = document.createElement("div");
      const title = createEl(
        "span",
        "nav-suggestion-title",
        plant.commonNameBn
          ? `${plant.commonName} (${plant.commonNameBn})`
          : plant.commonName,
      );
      const sci = createEl("span", "nav-suggestion-sci", plant.scientificName);
      col.appendChild(title);
      col.appendChild(sci);

      left.appendChild(thumb);
      left.appendChild(col);

      const fam = createEl(
        "span",
        "nav-suggestion-family",
        plant.family || plant.overview?.family || "",
      );

      link.appendChild(left);
      link.appendChild(fam);
      frag.appendChild(link);
    });

    if (q.length >= 2 && currentMatches.length < 2) {
      frag.appendChild(createNotFoundGlobalCta(q));
    }

    suggestionsEl.replaceChildren(frag);
    suggestionsEl.hidden = false;
  };

  const syncSelection = () => {
    const items = getOptionItems();
    items.forEach((el, idx) => {
      el.classList.toggle("is-active", idx === activeIdx);
    });
    if (activeIdx >= 0 && items[activeIdx]) {
      items[activeIdx].scrollIntoView({ block: "nearest" });
    }
  };

  input.addEventListener("input", () => renderSuggestions(input.value));
  input.addEventListener("focus", () => {
    if (input.value.trim()) renderSuggestions(input.value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideSuggestions();
      input.blur();
      return;
    }
    const optionItems = getOptionItems();
    if (suggestionsEl.hidden || optionItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % optionItems.length;
      syncSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + optionItems.length) % optionItems.length;
      syncSelection();
    } else if (e.key === "Enter" && activeIdx >= 0 && optionItems[activeIdx]) {
      e.preventDefault();
      window.location.href = optionItems[activeIdx].href;
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.hidden = true;
      hideSuggestions();
      input.focus();
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const optionItems = getOptionItems();
    if (activeIdx >= 0 && optionItems[activeIdx]) {
      window.location.href = optionItems[activeIdx].href;
      return;
    }
    const q = input.value.trim();
    const matches = list.filter((p) => matchesQuery(p, q));
    if (matches.length === 1) {
      window.location.href = buildSpeciesHref(matches[0].slug, isEmbed);
      return;
    }
    if (q) {
      const target =
        matches.length === 0 && q.length >= 2
          ? resolveSitePath(`./plant/live/?q=${encodeURIComponent(q)}`)
          : resolveSitePath(`./species/?q=${encodeURIComponent(q)}`);
      if (isEmbed && window.top) {
        window.top.location.href = target;
      } else {
        window.location.href = target;
      }
    }
  });

  const handleDocumentClick = (e) => {
    if (!searchWrap.contains(e.target)) {
      hideSuggestions();
    }
  };
  document.addEventListener("click", handleDocumentClick);

  return () => {
    document.removeEventListener("click", handleDocumentClick);
  };
}

export function renderSpecimenNotFoundCard(
  mountEl,
  {
    speciesIndex = [],
    requestedSlug = "",
    isEmbed = false,
    requestedPath = "",
    reason = "",
    queryLabel = "",
    fromSource = "",
  } = {},
) {
  if (!mountEl) return;

  const list = Array.isArray(speciesIndex) ? speciesIndex : [];
  applyNotFoundSeo({ requestedSlug: queryLabel || requestedSlug });

  if (typeof window.__plantipedia404Cleanup === "function") {
    window.__plantipedia404Cleanup();
    window.__plantipedia404Cleanup = null;
  }

  const messaging = resolveNotFoundMessaging({
    list,
    requestedSlug,
    requestedPath,
    reason,
    queryLabel,
  });

  // Non-destructive hydration path for 404.html where .not-found-card & #redirect-timer-box are pre-rendered in HTML
  const existingTimerBox = mountEl.querySelector("#redirect-timer-box");
  if (existingTimerBox) {
    const badgeEl = mountEl.querySelector("#notFoundBadge");
    const headingEl = mountEl.querySelector("#notFoundHeading");
    const copyEl = mountEl.querySelector("#notFoundCopy");
    const compareBtn = mountEl.querySelector("#notFoundCompareReturnBtn");
    const homeBtn = mountEl.querySelector("#notFoundHomeBtn");
    const atlasBtn = mountEl.querySelector("#notFoundAtlasBtn");
    const quickSlot = mountEl.querySelector("#notFoundQuickSlot");
    const telemetrySlot = mountEl.querySelector("#notFoundTelemetrySlot");

    if (badgeEl) badgeEl.textContent = messaging.badgeText;
    if (headingEl) headingEl.textContent = messaging.headingText;
    if (copyEl) copyEl.textContent = messaging.detailCopy;

    if (homeBtn) homeBtn.href = resolveSitePath("./");
    if (atlasBtn) atlasBtn.href = resolveSitePath("./species/");

    if (compareBtn) {
      if (fromSource === "compare") {
        compareBtn.href = resolveSitePath("./compare/");
        compareBtn.hidden = false;
      } else {
        compareBtn.hidden = true;
      }
    }

    if (quickSlot && list.length > 0) {
      const featuredSlugs = ["mango", "water-lily", "lotus", "tulsi"];
      const chips = featuredSlugs
        .map((slug) => list.find((s) => s.slug === slug))
        .filter(Boolean);
      const chipPool = chips.length > 0 ? chips : list.slice(0, 4);

      const frag = document.createDocumentFragment();
      frag.appendChild(createEl("span", "specimen-not-found-quick-label", "Quick Specifier"));
      const quickRow = createEl("div", "not-found-quick-links");
      chipPool.forEach((entry) => {
        quickRow.appendChild(buildQuickChipEl(entry, isEmbed));
      });
      frag.appendChild(quickRow);
      quickSlot.replaceChildren(frag);
      quickSlot.hidden = false;
    }

    if (telemetrySlot && !isEmbed) {
      telemetrySlot.replaceChildren(
        createTelemetryStatsGrid(buildNotFoundTelemetryStats(list), {
          variant: "compact",
          ariaLabel: "Explore Plantipedia archive metrics",
          sectionId: "notFoundTelemetryGrid",
        }),
      );
    }

    const searchWrap = mountEl.querySelector("#notFoundSearchWrap");
    const form = mountEl.querySelector("#notFoundSearchForm");
    const input = mountEl.querySelector("#notFoundSearchInput");
    const clearBtn = mountEl.querySelector("#notFoundSearchClear");
    const suggestionsEl = mountEl.querySelector("#notFoundSuggestions");

    const cleanupSearch = bindNotFoundAutocomplete({
      searchWrap,
      form,
      input,
      clearBtn,
      suggestionsEl,
      list,
      isEmbed,
    });

    window.__plantipedia404Cleanup = cleanupSearch;
    return;
  }

  // Dynamic render path (used inside /plant/?species=<invalid> when mountEl starts empty)
  const shell = createEl("section", "specimen-not-found-shell");
  shell.setAttribute("aria-labelledby", "notFoundHeading");

  const card = createEl("div", "specimen-not-found-card not-found-card");

  const badge = createEl("span", "specimen-not-found-badge", messaging.badgeText);
  card.appendChild(badge);

  const heading = createEl("h1", "specimen-not-found-title", messaging.headingText);
  heading.id = "notFoundHeading";
  card.appendChild(heading);
  card.appendChild(createEl("p", "specimen-not-found-copy", messaging.detailCopy));

  const searchWrap = createEl("div", "specimen-not-found-search-wrap");
  const form = createEl("form", "specimen-not-found-search-form");
  form.setAttribute("role", "search");
  form.appendChild(createSearchIconSvg(18));

  const input = document.createElement("input");
  input.type = "search";
  input.className = "specimen-not-found-search-input";
  input.placeholder = "Search species (EN / বাংলা / Latin)...";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Search documented plant species");

  const clearBtn = createEl("button", "navbar-search-clear", "×");
  clearBtn.type = "button";
  clearBtn.setAttribute("aria-label", "Clear search query");
  clearBtn.hidden = true;

  form.appendChild(input);
  form.appendChild(clearBtn);

  const suggestionsEl = createEl("div", "specimen-not-found-suggestions");
  suggestionsEl.setAttribute("role", "listbox");
  suggestionsEl.setAttribute("aria-label", "Matching botanical species");
  suggestionsEl.hidden = true;

  searchWrap.appendChild(form);
  searchWrap.appendChild(suggestionsEl);
  card.appendChild(searchWrap);

  const cleanupSearch = bindNotFoundAutocomplete({
    searchWrap,
    form,
    input,
    clearBtn,
    suggestionsEl,
    list,
    isEmbed,
  });

  if (list.length > 0) {
    const featuredSlugs = ["mango", "water-lily", "lotus", "tulsi"];
    const chips = featuredSlugs
      .map((slug) => list.find((s) => s.slug === slug))
      .filter(Boolean);
    const chipPool = chips.length > 0 ? chips : list.slice(0, 4);

    const quickWrap = createEl("div", "specimen-not-found-quick");
    quickWrap.appendChild(createEl("span", "specimen-not-found-quick-label", "Quick Specifier"));
    const quickRow = createEl("div", "not-found-quick-links");
    chipPool.forEach((entry) => {
      quickRow.appendChild(buildQuickChipEl(entry, isEmbed));
    });
    quickWrap.appendChild(quickRow);
    card.appendChild(quickWrap);
  }

  const actionsRow = createEl("div", "specimen-not-found-actions");

  if (fromSource === "compare") {
    const compareBtn = createEl(
      "a",
      "specimen-nf-btn specimen-nf-btn--compare",
      "⇄ Return to Compare",
    );
    compareBtn.href = resolveSitePath("./compare/");
    if (isEmbed) compareBtn.target = "_top";
    actionsRow.appendChild(compareBtn);
  }

  const homeBtn = createEl("a", "specimen-nf-btn specimen-nf-btn--secondary", "Return to Home");
  homeBtn.href = resolveSitePath("./");
  if (isEmbed) homeBtn.target = "_top";

  const atlasBtn = createEl(
    "a",
    "specimen-nf-btn specimen-nf-btn--primary",
    "Browse Species Atlas →",
  );
  atlasBtn.href = resolveSitePath("./species/");
  if (isEmbed) atlasBtn.target = "_top";

  actionsRow.appendChild(homeBtn);
  actionsRow.appendChild(atlasBtn);
  card.appendChild(actionsRow);

  window.__plantipedia404Cleanup = cleanupSearch;

  shell.appendChild(card);

  if (!isEmbed) {
    const telemetryWrap = createEl("div", "not-found-telemetry-wrap");
    telemetryWrap.appendChild(
      createTelemetryStatsGrid(buildNotFoundTelemetryStats(list), {
        variant: "compact",
        ariaLabel: "Explore Plantipedia archive metrics",
        sectionId: "notFoundTelemetryGrid",
      }),
    );
    shell.appendChild(telemetryWrap);
  }

  mountEl.replaceChildren(shell);
}

export async function mountStandalone404Page() {
  const mountEl = document.getElementById("mount-404");
  if (!mountEl) return;

  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get("species") || params.get("slug") || "";
  const reason = (params.get("reason") || "").trim().toLowerCase();
  const queryLabel = (params.get("q") || "").trim();
  const fromSource = (params.get("from") || "").trim().toLowerCase();

  let speciesList = getSpeciesIndex();
  if (!Array.isArray(speciesList) || speciesList.length === 0) {
    try {
      speciesList = await fetchDataset("speciesIndex");
      if (Array.isArray(speciesList)) {
        setSpeciesIndex(speciesList);
      }
    } catch {
      speciesList = [];
    }
  }

  renderSpecimenNotFoundCard(mountEl, {
    speciesIndex: speciesList,
    requestedSlug,
    requestedPath: window.location.pathname,
    isEmbed: false,
    reason,
    queryLabel,
    fromSource,
  });
}
