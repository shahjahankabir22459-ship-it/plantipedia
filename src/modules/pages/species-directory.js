/**
 * Species Directory Renderer & Paginated Filter Controller (/species/)
 * Driven 100% by ./data/pages/species.json and lightweight ./data/catalog/species-index.json.
 * - 2-column botanical specimen card grid (collapsing cleanly to 1-col on <= 768px)
 * - 10 cards per page with sticky top pagination bar (← Prev, 1, 2, Next → + live result counter)
 * - Search, category pills, A–Z index, and sort always operate across all 50 species and reset to Page 1
 */

import {
  createEl,
  createSearchIconSvg,
  createSpeciesCardElement,
  sanitizeUrl,
} from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { animateDynamicSpeciesGrid } from "../../core/telemetry/animations.js";
import { createBookmarkSvg, getSavedSlugs } from "../utils/herbarium.js";
import { applySpeciesDirectorySeo } from "../utils/seo.js";
import {
  buildSpeciesAtlasTelemetryStats,
  createTelemetryStatsGrid,
} from "../../core/telemetry/telemetry-stats.js";

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

function plantMatchesCategory(plant, category) {
  if (!category || category === "All") return true;
  if (Array.isArray(plant.categories)) {
    return plant.categories.includes(category) || plant.category === category;
  }
  return plant.category === category;
}

export function renderDirectoryBanner(mountEl, { pageData, catalog }) {
  const banner = pageData?.banner;
  if (!mountEl || !banner) return;

  const totalCount = Array.isArray(catalog) ? catalog.length : 0;
  const wrapper = createEl("div", "directory-banner");
  const container = createEl("div", "section-container");

  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  const ol = createEl("ol", "breadcrumb-list");
  (banner.breadcrumbs || []).forEach((crumb, idx) => {
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

  const bannerGrid = createEl("div", "directory-banner-grid");
  const left = document.createElement("div");
  left.appendChild(createEl("span", "section-eyebrow", banner.eyebrow));
  left.appendChild(createEl("h1", "directory-headline", banner.headline));
  left.appendChild(createEl("p", "directory-subcopy", banner.subcopy));

  const statsWrap = createEl("div", "directory-live-stats");
  statsWrap.setAttribute("aria-live", "polite");

  const totalStat = createEl("div", "directory-stat-pill");
  const totalNum = createEl("span", "directory-stat-num", String(totalCount));
  totalNum.id = "directoryTotalCount";
  totalStat.appendChild(totalNum);
  totalStat.appendChild(
    createEl(
      "span",
      "directory-stat-label",
      banner.stats?.totalLabel || "Documented Species",
    ),
  );

  const filteredStat = createEl("div", "directory-stat-pill");
  const filteredNum = createEl("span", "directory-stat-num", String(totalCount));
  filteredNum.id = "directoryFilteredNum";
  filteredStat.appendChild(filteredNum);
  filteredStat.appendChild(
    createEl(
      "span",
      "directory-stat-label",
      banner.stats?.filteredLabel || "Matching Filters",
    ),
  );

  statsWrap.appendChild(totalStat);
  statsWrap.appendChild(filteredStat);

  bannerGrid.appendChild(left);
  bannerGrid.appendChild(statsWrap);
  container.appendChild(bannerGrid);

  const telemetryWrap = createEl("div", "directory-telemetry-wrap");
  telemetryWrap.appendChild(
    createTelemetryStatsGrid(buildSpeciesAtlasTelemetryStats(catalog), {
      ariaLabel: "Species Atlas live archive telemetry",
      sectionId: "speciesAtlasTelemetryGrid",
    }),
  );
  container.appendChild(telemetryWrap);

  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

export function renderDirectoryExplorer(mountEl, { pageData, speciesIndex }) {
  const explorer = pageData?.explorer;
  if (!mountEl || !explorer) return;

  const allPlants = Array.isArray(speciesIndex) ? speciesIndex : [];
  try {
    applySpeciesDirectorySeo({ pageData, speciesList: allPlants });
  } catch {
    // Non-blocking SEO update
  }
  const categories =
    Array.isArray(explorer.categories) && explorer.categories.length > 0
      ? explorer.categories
      : [
          "All",
          "Flowers",
          "Fruit Trees",
          "Medicinal",
          "Shrubs & Herbs",
          "Trees & Palms",
          "Aquatic",
        ];
  const pageSize =
    Number(explorer.pageSize || explorer.batchSize) > 0
      ? Number(explorer.pageSize || explorer.batchSize)
      : 10;

  const wrapper = createEl("div", "explorer-section directory-explorer");
  const container = createEl("div", "section-container");

  // 1. Filter Panel (Search + Sort + Category Tabs + A–Z Strip)
  const filterPanel = createEl("div", "directory-filter-panel");

  const searchSortRow = createEl("div", "directory-search-sort-row");
  const searchForm = createEl("form", "directory-search-form");
  searchForm.id = "directorySearchForm";
  searchForm.setAttribute("role", "search");
  searchForm.appendChild(createSearchIconSvg(18, "home-search-icon"));

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.id = "directorySearchInput";
  searchInput.placeholder =
    explorer.searchPlaceholder ||
    "Filter by common name, Latin binomial, local name, or plant family...";
  searchInput.autocomplete = "off";
  searchInput.setAttribute(
    "aria-label",
    explorer.searchAriaLabel || "Filter available plant species",
  );

  const searchClear = createEl(
    "button",
    "home-search-clear",
    explorer.clearLabel || "Clear",
  );
  searchClear.type = "button";
  searchClear.id = "directorySearchClear";
  searchClear.hidden = true;

  searchForm.appendChild(searchInput);
  searchForm.appendChild(searchClear);

  const sortWrap = createEl("div", "directory-sort-wrap");
  const sortLabel = createEl(
    "label",
    "directory-sort-label",
    explorer.sortLabel || "Sort",
  );
  sortLabel.setAttribute("for", "directorySortSelect");
  const sortSelect = createEl("select", "directory-sort-select");
  sortSelect.id = "directorySortSelect";
  sortSelect.setAttribute("aria-label", explorer.sortAriaLabel || "Sort species");

  (
    explorer.sortOptions || [
      { value: "az", label: "Name (A–Z)" },
      { value: "za", label: "Name (Z–A)" },
      { value: "family", label: "Plant Family" },
    ]
  ).forEach((optCfg) => {
    const opt = document.createElement("option");
    opt.value = optCfg.value;
    opt.textContent = optCfg.label;
    sortSelect.appendChild(opt);
  });

  const savedToggleBtn = createEl("button", "directory-saved-toggle");
  savedToggleBtn.type = "button";
  savedToggleBtn.id = "directorySavedOnlyBtn";
  savedToggleBtn.setAttribute("aria-pressed", "false");
  savedToggleBtn.appendChild(createBookmarkSvg(false, 15));
  savedToggleBtn.appendChild(
    createEl("span", "", explorer.savedOnlyLabel || "Saved Only"),
  );
  const savedCountBadge = createEl("span", "directory-saved-count", "0");
  savedCountBadge.setAttribute("data-herbarium-count", "true");
  savedToggleBtn.appendChild(savedCountBadge);

  sortWrap.appendChild(sortLabel);
  sortWrap.appendChild(sortSelect);
  searchSortRow.appendChild(searchForm);
  searchSortRow.appendChild(savedToggleBtn);
  searchSortRow.appendChild(sortWrap);
  filterPanel.appendChild(searchSortRow);

  const globalBanner = createEl("div", "directory-global-banner");
  globalBanner.id = "directoryGlobalServerBanner";
  globalBanner.hidden = true;
  filterPanel.appendChild(globalBanner);

  const categoryTabsEl = createEl("div", "category-tabs");
  categoryTabsEl.id = "directoryCategoryTabs";
  categoryTabsEl.setAttribute("role", "tablist");
  categoryTabsEl.setAttribute(
    "aria-label",
    explorer.categoriesAriaLabel || "Filter species by botanical category",
  );

  categories.forEach((catName) => {
    const tab = createEl("button", "category-tab", catName);
    tab.type = "button";
    tab.setAttribute("data-category", catName);
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "false");
    categoryTabsEl.appendChild(tab);
  });
  filterPanel.appendChild(categoryTabsEl);

  const azWrap = createEl("div", "az-strip-wrap");
  azWrap.setAttribute("aria-label", explorer.azAriaLabel || "Alphabetical quick jump");
  azWrap.appendChild(createEl("span", "az-strip-label", explorer.azLabel || "A–Z Index"));

  const azStripEl = createEl("div", "az-letter-strip");
  azStripEl.id = "directoryAzStrip";
  azStripEl.setAttribute("role", "group");
  azStripEl.setAttribute(
    "aria-label",
    explorer.azGroupAriaLabel || "Filter by starting letter",
  );
  azWrap.appendChild(azStripEl);
  filterPanel.appendChild(azWrap);
  container.appendChild(filterPanel);

  // 2. Sticky Top Pagination Bar (directly above #directorySpeciesGrid)
  const paginationBar = createEl("div", "directory-pagination-bar");
  paginationBar.id = "directoryPaginationBar";

  const statusGroup = createEl("div", "directory-pagination-status");
  const countEl = createEl(
    "p",
    "explorer-count",
    explorer.loadingLabel || "Indexing botanical species...",
  );
  countEl.id = "directoryExplorerCount";
  countEl.setAttribute("aria-live", "polite");

  const resetAllBtn = createEl(
    "button",
    "directory-clear-all",
    explorer.resetButtonLabel || "Reset All Filters",
  );
  resetAllBtn.type = "button";
  resetAllBtn.id = "directoryResetAllBtn";
  resetAllBtn.hidden = true;

  statusGroup.appendChild(countEl);
  statusGroup.appendChild(resetAllBtn);

  const paginationNav = createEl("nav", "directory-pagination-nav");
  paginationNav.id = "directoryPaginationNav";
  paginationNav.setAttribute("aria-label", "Species directory pagination");

  paginationBar.appendChild(statusGroup);
  paginationBar.appendChild(paginationNav);
  container.appendChild(paginationBar);

  // 3. Balanced 2-Column Species Grid
  const gridEl = createEl("div", "species-grid species-grid--directory");
  gridEl.id = "directorySpeciesGrid";
  container.appendChild(gridEl);

  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);

  // Controller state
  const params = new URLSearchParams(window.location.search);
  const paramCat = params.get("category");
  const paramQuery = params.get("q");
  const paramLetter = params.get("letter");
  const paramSaved = params.get("saved") === "true";

  let activeCategory =
    paramCat && categories.includes(paramCat) ? paramCat : "All";
  let activeQuery = paramQuery ? paramQuery.trim() : "";
  let activeLetter =
    paramLetter && /^[A-Z]$/i.test(paramLetter.trim())
      ? paramLetter.trim().toUpperCase()
      : "All";
  let savedOnly = paramSaved;
  let activeSort = "az";
  let currentPage = 1;
  let isUserInteraction = false;

  savedToggleBtn.classList.toggle("is-active", savedOnly);
  savedToggleBtn.setAttribute("aria-pressed", String(savedOnly));
  savedCountBadge.textContent = String(getSavedSlugs().length);

  if (activeQuery) {
    searchInput.value = activeQuery;
    searchClear.hidden = false;
  }

  const availableLetters = new Set(
    allPlants.map((p) => (p.commonName ? p.commonName.charAt(0).toUpperCase() : "")),
  );

  function renderAzStrip() {
    const letters = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
    const frag = document.createDocumentFragment();
    letters.forEach((ltr) => {
      const isAll = ltr === "All";
      const hasEntries = isAll || availableLetters.has(ltr);
      const isActive = activeLetter === ltr;
      const btn = createEl(
        "button",
        `az-letter-btn${isActive ? " active" : ""}`,
        ltr,
      );
      btn.type = "button";
      btn.setAttribute("data-letter", ltr);
      if (!hasEntries) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
      }
      frag.appendChild(btn);
    });
    azStripEl.replaceChildren(frag);
  }

  function syncCategoryTabs() {
    categoryTabsEl.querySelectorAll("[data-category]").forEach((tab) => {
      const isActive = tab.getAttribute("data-category") === activeCategory;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
  }

  function getFilteredAndSorted() {
    const savedSet = savedOnly ? new Set(getSavedSlugs()) : null;
    const filtered = allPlants.filter((plant) => {
      const matchesSaved = !savedSet || savedSet.has(plant.slug);
      const matchesCat = plantMatchesCategory(plant, activeCategory);
      const matchesQ = plantMatchesQuery(plant, activeQuery);
      const matchesLtr =
        activeLetter === "All" ||
        (plant.commonName && plant.commonName.charAt(0).toUpperCase() === activeLetter);
      return matchesSaved && matchesCat && matchesQ && matchesLtr;
    });

    return filtered.slice().sort((a, b) => {
      if (activeSort === "za") {
        return b.commonName.localeCompare(a.commonName);
      }
      if (activeSort === "family") {
        const famA = a.family || a.overview?.family || "";
        const famB = b.family || b.overview?.family || "";
        const famCmp = famA.localeCompare(famB);
        return famCmp !== 0 ? famCmp : a.commonName.localeCompare(b.commonName);
      }
      return a.commonName.localeCompare(b.commonName);
    });
  }

  function scrollToGridTop() {
    const navEl = document.getElementById("global-navbar");
    const navH = navEl ? navEl.getBoundingClientRect().height : 68;
    const barH = paginationBar ? paginationBar.getBoundingClientRect().height : 56;
    const targetTop =
      gridEl.getBoundingClientRect().top + window.scrollY - navH - barH - 24;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }

  function renderPaginationControls(totalMatched, totalPages) {
    if (totalMatched === 0) {
      paginationNav.replaceChildren();
      paginationNav.hidden = true;
      return;
    }

    paginationNav.hidden = false;
    const frag = document.createDocumentFragment();

    const prevBtn = createEl("button", "pagination-btn pagination-btn--step", "← Prev");
    prevBtn.type = "button";
    prevBtn.disabled = currentPage <= 1;
    prevBtn.setAttribute("aria-label", "Previous page");
    prevBtn.addEventListener("click", () => {
      if (currentPage <= 1) return;
      currentPage -= 1;
      isUserInteraction = true;
      renderDirectory();
      scrollToGridTop();
    });
    frag.appendChild(prevBtn);

    const pillsWrap = createEl("div", "pagination-pills");
    for (let page = 1; page <= totalPages; page += 1) {
      const pill = createEl(
        "button",
        `pagination-pill${page === currentPage ? " active" : ""}`,
        String(page),
      );
      pill.type = "button";
      pill.setAttribute("aria-label", `Page ${page}`);
      if (page === currentPage) {
        pill.setAttribute("aria-current", "page");
      }
      pill.addEventListener("click", () => {
        if (page === currentPage) return;
        currentPage = page;
        isUserInteraction = true;
        renderDirectory();
        scrollToGridTop();
      });
      pillsWrap.appendChild(pill);
    }
    frag.appendChild(pillsWrap);

    const nextBtn = createEl("button", "pagination-btn pagination-btn--step", "Next →");
    nextBtn.type = "button";
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.setAttribute("aria-label", "Next page");
    nextBtn.addEventListener("click", () => {
      if (currentPage >= totalPages) return;
      currentPage += 1;
      isUserInteraction = true;
      renderDirectory();
      scrollToGridTop();
    });
    frag.appendChild(nextBtn);

    paginationNav.replaceChildren(frag);
  }

  function resetAllFilters() {
    activeCategory = "All";
    activeQuery = "";
    activeLetter = "All";
    savedOnly = false;
    activeSort = "az";
    currentPage = 1;
    searchInput.value = "";
    searchClear.hidden = true;
    sortSelect.value = "az";
    savedToggleBtn.classList.remove("is-active");
    savedToggleBtn.setAttribute("aria-pressed", "false");
    syncCategoryTabs();
    renderAzStrip();
    renderDirectory();
  }

  function renderDirectory() {
    const sorted = getFilteredAndSorted();
    const totalMatched = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalMatched / pageSize));
    if (currentPage > totalPages) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const sliced = sorted.slice(startIdx, startIdx + pageSize);
    const hasFilters =
      savedOnly ||
      activeCategory !== "All" ||
      activeQuery !== "" ||
      activeLetter !== "All";

    const filteredNumEl = document.getElementById("directoryFilteredNum");
    if (filteredNumEl) {
      filteredNumEl.textContent = String(totalMatched);
    }

    const totalStatEl = document.getElementById("directoryTotalCount");
    if (totalStatEl) {
      totalStatEl.textContent = String(allPlants.length);
    }

    if (totalMatched === 0) {
      countEl.textContent = `Showing 0 of 0 matching species (${allPlants.length} total)`;
    } else {
      const rangeStart = startIdx + 1;
      const rangeEnd = startIdx + sliced.length;
      countEl.textContent = hasFilters
        ? `Showing ${rangeStart}–${rangeEnd} of ${totalMatched} matching species (${allPlants.length} total)`
        : `Showing ${rangeStart}–${rangeEnd} of ${totalMatched} species`;
    }

    resetAllBtn.hidden = !hasFilters;

    const trimmedQuery = activeQuery.trim();
    if (trimmedQuery.length >= 2 && totalMatched < 2) {
      const ctaLink = createEl("a", "directory-global-banner-link");
      ctaLink.href = sanitizeUrl(
        resolveRootPath(`./plant/live/?q=${encodeURIComponent(trimmedQuery)}`),
      );
      const labelEl = createEl(
        "span",
        "directory-global-banner-text",
        `🌐 Query Global Botanical Server for "${trimmedQuery}"`,
      );
      const arrowEl = createEl("span", "directory-global-banner-arrow", "→");
      arrowEl.setAttribute("aria-hidden", "true");
      ctaLink.appendChild(labelEl);
      ctaLink.appendChild(arrowEl);
      globalBanner.replaceChildren(ctaLink);
      globalBanner.hidden = false;
    } else {
      globalBanner.hidden = true;
      globalBanner.replaceChildren();
    }

    renderPaginationControls(totalMatched, totalPages);

    if (totalMatched === 0) {
      const emptyBox = createEl("div", "empty-search-state");
      emptyBox.appendChild(
        createEl(
          "h3",
          "",
          explorer.emptyState?.heading || "No matching botanical species found",
        ),
      );
      emptyBox.appendChild(
        createEl(
          "p",
          "",
          explorer.emptyState?.message ||
            "Try clearing the letter filter, selecting a broader taxonomic category, or searching another plant name.",
        ),
      );
      const resetBtn = createEl(
        "button",
        "empty-reset-btn",
        explorer.emptyState?.resetLabel || "Reset All Filters",
      );
      resetBtn.type = "button";
      resetBtn.id = "dirEmptyResetBtn";
      resetBtn.addEventListener("click", () => {
        isUserInteraction = true;
        resetAllFilters();
      });
      emptyBox.appendChild(resetBtn);
      gridEl.replaceChildren(emptyBox);
      return;
    }

    const frag = document.createDocumentFragment();
    sliced.forEach((plant) => {
      frag.appendChild(
        createSpeciesCardElement(plant, explorer.cardCtaLabel || "Explore Monograph"),
      );
    });
    gridEl.replaceChildren(frag);

    if (isUserInteraction) {
      animateDynamicSpeciesGrid(gridEl);
    }
  }

  categoryTabsEl.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-category]");
    if (!tab) return;
    activeCategory = tab.getAttribute("data-category");
    currentPage = 1;
    isUserInteraction = true;
    syncCategoryTabs();
    renderDirectory();
  });

  azStripEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-letter]");
    if (!btn || btn.disabled) return;
    activeLetter = btn.getAttribute("data-letter");
    currentPage = 1;
    isUserInteraction = true;
    renderAzStrip();
    renderDirectory();
  });

  searchInput.addEventListener("input", () => {
    activeQuery = searchInput.value.trim();
    currentPage = 1;
    isUserInteraction = true;
    searchClear.hidden = activeQuery.length === 0;
    renderDirectory();
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    activeQuery = "";
    currentPage = 1;
    isUserInteraction = true;
    searchClear.hidden = true;
    renderDirectory();
    searchInput.focus();
  });

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    currentPage = 1;
    isUserInteraction = true;
    renderDirectory();
  });

  sortSelect.addEventListener("change", () => {
    activeSort = sortSelect.value;
    currentPage = 1;
    isUserInteraction = true;
    renderDirectory();
  });

  savedToggleBtn.addEventListener("click", () => {
    savedOnly = !savedOnly;
    currentPage = 1;
    isUserInteraction = true;
    savedToggleBtn.classList.toggle("is-active", savedOnly);
    savedToggleBtn.setAttribute("aria-pressed", String(savedOnly));
    renderDirectory();
  });

  document.addEventListener("plantipedia:herbarium-changed", () => {
    savedCountBadge.textContent = String(getSavedSlugs().length);
    if (savedOnly) {
      isUserInteraction = false;
      renderDirectory();
    }
  });

  resetAllBtn.addEventListener("click", () => {
    isUserInteraction = true;
    resetAllFilters();
  });

  window.__plantipediaSelectDirectoryCategory = (category) => {
    if (!categories.includes(category)) return;
    activeCategory = category;
    currentPage = 1;
    isUserInteraction = true;
    syncCategoryTabs();
    renderDirectory();
  };

  syncCategoryTabs();
  renderAzStrip();
  renderDirectory();
}
