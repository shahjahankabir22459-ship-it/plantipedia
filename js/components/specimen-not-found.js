/**
 * Shared "Specimen Not Found in Archive" Dark Botanical Luxury View
 * - Powers both root 404.html (for any invalid URL path on GitHub Pages)
 * - And /plant/ whenever ?species=<invalid-slug> is requested
 * - Features bilingual instant search (EN / বাংলা / Latin / Family) connected to species-index.json
 */

import { fetchDataset } from "../services/api.js";
import { getSpeciesIndex, setSpeciesIndex } from "../core/state.js";
import { applyNotFoundSeo } from "../services/seo.js";
import { resolveSitePath } from "./navbar-compiler.js";
import { createEl, createSearchIconSvg } from "../utils/templates.js";

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

export function renderSpecimenNotFoundCard(
  mountEl,
  {
    speciesIndex = [],
    requestedSlug = "",
    isEmbed = false,
    requestedPath = "",
  } = {},
) {
  if (!mountEl) return;

  const list = Array.isArray(speciesIndex) ? speciesIndex : [];
  applyNotFoundSeo({ requestedSlug });

  const shell = createEl("section", "specimen-not-found-shell");
  shell.setAttribute("aria-labelledby", "notFoundHeading");

  const card = createEl("div", "specimen-not-found-card");

  const badge = createEl(
    "span",
    "specimen-not-found-badge",
    "ERROR 404 · HERBARIUM RECORD MISSING",
  );
  card.appendChild(badge);

  const heading = createEl(
    "h1",
    "specimen-not-found-title",
    "Specimen Not Found in Archive",
  );
  heading.id = "notFoundHeading";
  card.appendChild(heading);

  let detailCopy =
    "The requested botanical monograph or archive route does not exist in our current 20-species registry. Search our living catalog below or return to the main flora index.";
  if (requestedSlug) {
    detailCopy = `No herbarium monograph matched specimen identifier "${requestedSlug}" in the current registry. Search below by English, বাংলা, or Latin name to locate a documented species.`;
  } else if (requestedPath && requestedPath !== "/404.html") {
    detailCopy = `Archive route "${requestedPath}" could not be resolved in Plantipedia. Search our 20 documented botanical monographs below or return to the flora gateway.`;
  }
  card.appendChild(createEl("p", "specimen-not-found-copy", detailCopy));

  // Inline Bilingual Instant Search Bar
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

  let activeIdx = -1;
  let currentMatches = [];

  const hideSuggestions = () => {
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
    activeIdx = -1;
  };

  const renderSuggestions = (query) => {
    const q = query.trim();
    clearBtn.hidden = q.length === 0;
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
        `No documented species matched "${q}"`,
      );
      frag.appendChild(empty);
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

    suggestionsEl.replaceChildren(frag);
    suggestionsEl.hidden = false;
  };

  const syncSelection = () => {
    const items = suggestionsEl.querySelectorAll(".nav-suggestion-item");
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
    if (suggestionsEl.hidden || currentMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % currentMatches.length;
      syncSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx =
        (activeIdx - 1 + currentMatches.length) % currentMatches.length;
      syncSelection();
    } else if (
      e.key === "Enter" &&
      activeIdx >= 0 &&
      currentMatches[activeIdx]
    ) {
      e.preventDefault();
      window.location.href = buildSpeciesHref(
        currentMatches[activeIdx].slug,
        isEmbed,
      );
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    hideSuggestions();
    input.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (activeIdx >= 0 && currentMatches[activeIdx]) {
      window.location.href = buildSpeciesHref(
        currentMatches[activeIdx].slug,
        isEmbed,
      );
      return;
    }
    const q = input.value.trim();
    const matches = list.filter((p) => matchesQuery(p, q));
    if (matches.length === 1) {
      window.location.href = buildSpeciesHref(matches[0].slug, isEmbed);
      return;
    }
    if (q) {
      const target = resolveSitePath(`./species/?q=${encodeURIComponent(q)}`);
      if (isEmbed && window.top) {
        window.top.location.href = target;
      } else {
        window.location.href = target;
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchWrap.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Quick-jump popular species chips
  if (list.length > 0) {
    const featuredSlugs = ["mango", "water-lily", "lotus", "tulsi"];
    const chips = featuredSlugs
      .map((slug) => list.find((s) => s.slug === slug))
      .filter(Boolean);
    const chipPool = chips.length > 0 ? chips : list.slice(0, 4);

    const quickWrap = createEl("div", "specimen-not-found-quick");
    quickWrap.appendChild(
      createEl("span", "specimen-not-found-quick-label", "Quick Specifier"),
    );
    const quickRow = createEl("div", "not-found-quick-links");
    chipPool.forEach((entry) => {
      const chip = createEl(
        "a",
        "mobile-quick-chip",
        entry.commonNameBn
          ? `${entry.commonName} · ${entry.commonNameBn}`
          : entry.commonName,
      );
      chip.href = buildSpeciesHref(entry.slug, isEmbed);
      quickRow.appendChild(chip);
    });
    quickWrap.appendChild(quickRow);
    card.appendChild(quickWrap);
  }

  // Primary Action Buttons
  const actionsRow = createEl("div", "specimen-not-found-actions");

  const homeBtn = createEl(
    "a",
    "specimen-nf-btn specimen-nf-btn--secondary",
    "Return to Home",
  );
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

  shell.appendChild(card);
  mountEl.replaceChildren(shell);
}

export async function mountStandalone404Page() {
  const mountEl = document.getElementById("mount-404");
  if (!mountEl) return;

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

  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get("species") || params.get("slug") || "";
  renderSpecimenNotFoundCard(mountEl, {
    speciesIndex: speciesList,
    requestedSlug,
    requestedPath: window.location.pathname,
    isEmbed: false,
  });
}
