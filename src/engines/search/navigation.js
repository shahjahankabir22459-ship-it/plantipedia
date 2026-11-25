/**
 * Shared live species autocomplete interactions for Home Hero search.
 * (Navbar & Mobile search are bound independently by js/components/navbar-compiler.js.)
 */

import { getSpeciesIndex } from "../../core/bootstrap/state.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { renderSearchSuggestionNodes } from "../../modules/utils/templates.js";
import { bindGlobalImageFallbackHandler } from "../../core/compilers/navbar-compiler.js";

function plantMatchesQuery(plant, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  const family = plant.family || plant.overview?.family || "";
  const familyBn = plant.familyBn || "";
  const plantGroup = plant.plantGroup || plant.overview?.plantGroup || "";
  const localName = plant.localName || "";
  const commonNameBn = plant.commonNameBn || "";
  const summaryBn = plant.summaryBn || "";
  const domain = plant.taxonomicDomain || "";
  return (
    plant.commonName.toLowerCase().includes(q) ||
    plant.scientificName.toLowerCase().includes(q) ||
    localName.toLowerCase().includes(q) ||
    commonNameBn.toLowerCase().includes(q) ||
    family.toLowerCase().includes(q) ||
    familyBn.toLowerCase().includes(q) ||
    summaryBn.toLowerCase().includes(q) ||
    (plant.category || "").toLowerCase().includes(q) ||
    domain.toLowerCase().includes(q) ||
    plantGroup.toLowerCase().includes(q)
  );
}

function bindLiveSpeciesSearch(config) {
  const form = document.getElementById(config.formId);
  const input = document.getElementById(config.inputId);
  const clearBtn = document.getElementById(config.clearId);
  const suggestionsEl = document.getElementById(config.suggestionsId);

  if (!form || !input || !suggestionsEl) return;
  if (form.dataset.searchBound === "true") return;
  form.dataset.searchBound = "true";

  let activeIndex = -1;
  let currentMatches = [];

  function hideSuggestions() {
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
    activeIndex = -1;
  }

  function renderSuggestions(query) {
    const q = query.trim();
    if (clearBtn) clearBtn.hidden = q.length === 0;

    if (!q) {
      currentMatches = [];
      hideSuggestions();
      return;
    }

    const indexList = getSpeciesIndex();
    currentMatches = indexList
      .filter((plant) => plantMatchesQuery(plant, q))
      .slice(0, config.maxResults || 7);

    activeIndex = -1;
    renderSearchSuggestionNodes(
      suggestionsEl,
      currentMatches,
      q,
      config.itemVariant || "home",
    );
  }

  function getOptionItems() {
    return Array.from(suggestionsEl.querySelectorAll('a[role="option"]'));
  }

  function syncActiveSuggestion() {
    const items = getOptionItems();
    items.forEach((el, idx) => {
      el.classList.toggle("is-active", idx === activeIndex);
    });
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function navigateToSpecies(slug) {
    window.location.href = resolveRootPath(`./plant/?species=${encodeURIComponent(slug)}`);
  }

  input.addEventListener("input", () => {
    renderSuggestions(input.value);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      renderSuggestions(input.value);
    }
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
      activeIndex = (activeIndex + 1) % optionItems.length;
      syncActiveSuggestion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex =
        (activeIndex - 1 + optionItems.length) % optionItems.length;
      syncActiveSuggestion();
    } else if (
      e.key === "Enter" &&
      activeIndex >= 0 &&
      optionItems[activeIndex]
    ) {
      e.preventDefault();
      window.location.href = optionItems[activeIndex].href;
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
    if (activeIndex >= 0 && optionItems[activeIndex]) {
      window.location.href = optionItems[activeIndex].href;
      return;
    }
    const q = input.value.trim();
    if (!q && config.emptySubmitToDirectory) {
      window.location.href = resolveRootPath("./species/");
      return;
    }
    const matches = getSpeciesIndex().filter((p) => plantMatchesQuery(p, q));
    if (matches.length === 1) {
      navigateToSpecies(matches[0].slug);
      return;
    }
    if (q) {
      window.location.href = resolveRootPath(`./species/?q=${encodeURIComponent(q)}`);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(config.wrapSelector)) {
      hideSuggestions();
    }
  });
}

export function initNavigationInteractions() {
  bindGlobalImageFallbackHandler();

  bindLiveSpeciesSearch({
    formId: "homeSearchForm",
    inputId: "homeSearchInput",
    clearId: "homeSearchClear",
    suggestionsId: "homeSuggestions",
    wrapSelector: ".home-search-shell",
    itemVariant: "home",
    maxResults: 7,
    emptySubmitToDirectory: true,
  });
}
