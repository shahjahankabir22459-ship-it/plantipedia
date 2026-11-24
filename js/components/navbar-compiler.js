/**
 * Independent Global Navbar Compiler (./data/config/navbar.json + ./data/catalog/species-index.json)
 * - Targets #global-navbar (or [data-shell="navbar"]) automatically on page load
 * - Respects ?embed=true on /plant/ by adding body.is-embed and skipping chrome
 * - Supports 5 balanced desktop links with grouped Explore Flora dropdown sections
 * - Bilingual (English + বাংলা Unicode) autocomplete search with thumbnail previews
 * - Personal Herbarium trigger badge (🔖 0) synced with localStorage + My Herbarium drawer
 * - Luxury full-screen mobile overlay drawer with quick search, Herbarium shortcut & core routes
 */

import { fetchDatasetsConcurrently } from "../services/api.js";
import { getSpeciesIndex, setSpeciesIndex } from "../core/state.js";
import { normalizePathnameRoute, resolveRootPath } from "../core/router.js";
import {
  createBookmarkSvg,
  getSavedCount,
  initHerbariumSystem,
  openHerbariumDrawer,
} from "../services/herbarium.js";

const SITE_ROOT_URL = new URL("../../", import.meta.url);
const PLACEHOLDER_SVG_PATH = "./assets/images/placeholder-botanical.svg";

function isEmbedMode() {
  try {
    return new URLSearchParams(window.location.search).get("embed") === "true";
  } catch {
    return false;
  }
}

const FALLBACK_NAVBAR_CONFIG = {
  brand: {
    title: "Plantipedia",
    accentPrefix: "Plant",
    restTitle: "ipedia",
    logo: "./assets/images/brand-flower.svg",
    logoAlt: "Plantipedia floral emblem",
    homeHref: "./",
  },
  ariaLabel: "Primary navigation",
  links: [
    {
      id: "nav-home",
      label: "Home",
      href: "./",
      matchPaths: ["/", "/index.html"],
      sublabel: "Botanical Gateway",
    },
    {
      id: "nav-taxonomy",
      label: "Taxonomy",
      href: "./taxonomy/",
      matchPaths: ["/taxonomy/", "/taxonomy"],
      sublabel: "Families & Diagnostic Traits",
    },
    {
      id: "nav-explore",
      label: "Explore Flora",
      href: "./species/",
      matchPaths: ["/species/", "/species", "/plant/", "/plant"],
      sublabel: "Species Atlas & Quick Categories",
      dropdownSections: [
        {
          title: "Archive Views",
          items: [
            {
              id: "nav-archive-species",
              label: "All Species Atlas",
              href: "./species/",
            },
          ],
        },
        {
          title: "Quick Categories",
          items: [
            {
              id: "nav-species-flowers",
              label: "Flowers & Ornamentals",
              href: "./species/?category=Flowers",
            },
            {
              id: "nav-species-fruit",
              label: "Fruit Trees & Palms",
              href: "./species/?category=Fruit%20Trees",
            },
            {
              id: "nav-species-medicinal",
              label: "Medicinal Herbs",
              href: "./species/?category=Medicinal",
            },
            {
              id: "nav-species-shrubs",
              label: "Shrubs & Herbs",
              href: "./species/?category=Shrubs%20%26%20Herbs",
            },
            {
              id: "nav-species-aquatic",
              label: "Aquatic & Wetland Flora",
              href: "./species/?category=Aquatic",
            },
          ],
        },
      ],
    },
    {
      id: "nav-calendar",
      label: "Calendar",
      href: "./seasons/",
      matchPaths: ["/seasons/", "/seasons"],
      sublabel: "6-Season Ecological Phenology",
    },
    {
      id: "nav-compare",
      label: "Compare",
      href: "./compare/",
      matchPaths: ["/compare/", "/compare"],
      sublabel: "Side-by-Side Split View",
    },
  ],
  search: {
    placeholder: "Search species (EN / বাংলা)...",
    ariaLabel: "Quick search plant species in English or Bengali",
    clearLabel: "Clear search",
    minQueryLength: 1,
  },
  herbarium: {
    label: "My Herbarium",
    ariaLabel: "Open My Herbarium saved species drawer",
  },
  mobile: {
    openLabel: "Open navigation menu",
    closeLabel: "Close navigation menu",
    dialogLabel: "Mobile navigation and search",
    quickTryTitle: "Quick Try",
    quickTry: [
      { label: "Mango · আম", href: "./plant/?species=mango" },
      { label: "Water Lily · শাপলা", href: "./plant/?species=water-lily" },
      { label: "Sacred Lotus · পদ্ম", href: "./plant/?species=lotus" },
      { label: "Tulsi · তুলসী", href: "./plant/?species=tulsi" },
    ],
    corePages: [
      {
        id: "m-home",
        label: "Home",
        href: "./",
        matchPaths: ["/", "/index.html"],
        sublabel: "Botanical Gateway",
      },
      {
        id: "m-species",
        label: "All Species Atlas",
        href: "./species/",
        matchPaths: ["/species/", "/species", "/plant/", "/plant"],
        sublabel: "20 Curated Flora Monographs",
      },
      {
        id: "m-taxonomy",
        label: "Taxonomic Lineage",
        href: "./taxonomy/",
        matchPaths: ["/taxonomy/", "/taxonomy"],
        sublabel: "Botanical Families & Diagnostic Traits",
      },
      {
        id: "m-seasons",
        label: "6-Season Calendar",
        href: "./seasons/",
        matchPaths: ["/seasons/", "/seasons"],
        sublabel: "Bangladeshi Shororitu Phenology",
      },
      {
        id: "m-compare",
        label: "Compare Split View",
        href: "./compare/",
        matchPaths: ["/compare/", "/compare"],
        sublabel: "Dual-Pane Monograph Comparison",
      },
    ],
    categoriesTitle: "Explore by Category",
    categories: [
      {
        label: "Flowers",
        category: "Flowers",
        href: "./species/?category=Flowers",
      },
      {
        label: "Fruit Trees",
        category: "Fruit Trees",
        href: "./species/?category=Fruit%20Trees",
      },
      {
        label: "Medicinal",
        category: "Medicinal",
        href: "./species/?category=Medicinal",
      },
      {
        label: "Shrubs & Herbs",
        category: "Shrubs & Herbs",
        href: "./species/?category=Shrubs%20%26%20Herbs",
      },
      {
        label: "Trees & Palms",
        category: "Trees & Palms",
        href: "./species/?category=Trees%20%26%20Palms",
      },
      {
        label: "Aquatic",
        category: "Aquatic",
        href: "./species/?category=Aquatic",
      },
    ],
    signature:
      "Plantipedia Botanical Archive · Authorized by Jalees Habib & Rayaan Tasnim",
  },
};

function sanitizeHref(rawHref, fallback = "./") {
  if (typeof rawHref !== "string") return fallback;
  const trimmed = rawHref.trim();
  if (!trimmed) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export function resolveSitePath(rawPath) {
  const clean = sanitizeHref(rawPath, "./");
  if (/^https?:/i.test(clean) || clean.startsWith("#")) {
    return clean;
  }
  return resolveRootPath(clean, "./");
}

export function bindGlobalImageFallbackHandler() {
  if (window.__plantipediaImageFallbackBound) return;
  window.__plantipediaImageFallbackBound = true;

  const placeholderHref = resolveSitePath(PLACEHOLDER_SVG_PATH);

  document.addEventListener(
    "error",
    (e) => {
      const target = e.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.dataset.fallbackApplied === "true") {
        target.style.opacity = "0";
        return;
      }
      target.dataset.fallbackApplied = "true";
      target.classList.add("is-fallback-image");
      if (!target.getAttribute("alt")) {
        const label = target.getAttribute("data-fallback-label");
        target.setAttribute(
          "alt",
          label || "Plantipedia botanical specimen placeholder",
        );
      }
      target.src = placeholderHref;
    },
    true,
  );
}

function normalizeRoutePath(pathname) {
  if (!pathname) return "";
  const rootPath = SITE_ROOT_URL.pathname.replace(/\/+$/, "");
  let stripped = String(pathname);
  if (rootPath && stripped.startsWith(rootPath)) {
    stripped = stripped.slice(rootPath.length);
  }
  return normalizePathnameRoute(stripped);
}

function routeBaseName(route) {
  const clean = normalizePathnameRoute(route);
  return clean || "index";
}

function isNavItemActive(item) {
  const currentRoute = normalizeRoutePath(window.location.pathname);
  const currentBase = routeBaseName(currentRoute);
  const currentHash = window.location.hash || "";

  if (Array.isArray(item.matchPaths)) {
    const matchedPath = item.matchPaths.some((p) => {
      const cleanMatch = normalizePathnameRoute(p);
      return (
        cleanMatch === currentRoute || routeBaseName(cleanMatch) === currentBase
      );
    });
    if (matchedPath && !item.matchHash) {
      return true;
    }
  }

  if (
    item.matchHash &&
    currentBase === "index" &&
    currentHash === item.matchHash
  ) {
    return true;
  }

  try {
    const targetUrl = new URL(
      sanitizeHref(item.href).replace(/^\.\//, ""),
      SITE_ROOT_URL,
    );
    const targetRoute = normalizeRoutePath(targetUrl.pathname);
    const targetBase = routeBaseName(targetRoute);
    if (targetUrl.hash) {
      return currentBase === targetBase && currentHash === targetUrl.hash;
    }
    return currentRoute === targetRoute || currentBase === targetBase;
  } catch {
    return false;
  }
}

function createBrandLogo(brandConfig, className = "brand-logo", size = 32) {
  const link = document.createElement("a");
  link.href = resolveSitePath(brandConfig.homeHref || "./");
  link.className = className;
  link.setAttribute("aria-label", `${brandConfig.title || "Plantipedia"} Home`);

  if (brandConfig.logo) {
    const img = document.createElement("img");
    img.src = resolveSitePath(brandConfig.logo);
    img.alt = brandConfig.logoAlt || "";
    img.width = size;
    img.height = size;
    img.className = "brand-flower-svg";
    img.decoding = "async";
    img.setAttribute("aria-hidden", "true");
    link.appendChild(img);
  }

  const wordmark = document.createElement("span");
  wordmark.className = "brand-wordmark";
  if (brandConfig.accentPrefix && brandConfig.restTitle) {
    const accent = document.createElement("span");
    accent.className = "brand-accent";
    accent.textContent = brandConfig.accentPrefix;
    wordmark.appendChild(accent);
    wordmark.appendChild(document.createTextNode(brandConfig.restTitle));
  } else {
    wordmark.textContent = brandConfig.title || "Plantipedia";
  }

  link.appendChild(wordmark);
  return link;
}

function createSearchIconSvg(size = 16) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "navbar-search-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", "11");
  circle.setAttribute("cy", "11");
  circle.setAttribute("r", "8");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", "m21 21-4.3-4.3");

  svg.appendChild(circle);
  svg.appendChild(path);
  return svg;
}

function createCloseIconSvg() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const l1 = document.createElementNS(svgNS, "line");
  l1.setAttribute("x1", "18");
  l1.setAttribute("y1", "6");
  l1.setAttribute("x2", "6");
  l1.setAttribute("y2", "18");

  const l2 = document.createElementNS(svgNS, "line");
  l2.setAttribute("x1", "6");
  l2.setAttribute("y1", "6");
  l2.setAttribute("x2", "18");
  l2.setAttribute("y2", "18");

  svg.appendChild(l1);
  svg.appendChild(l2);
  return svg;
}

function createChevronDownSvg() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "nav-dropdown-caret");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", "m4 6 4 4 4-4");
  svg.appendChild(path);
  return svg;
}

function createHerbariumPillButton(herbariumCfg, extraClass = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `navbar-herbarium-pill ${extraClass}`.trim();
  btn.setAttribute(
    "aria-label",
    herbariumCfg?.ariaLabel || "Open My Herbarium saved species drawer",
  );
  btn.title = herbariumCfg?.label || "My Herbarium";

  const icon = createBookmarkSvg(false, 15);
  const countBadge = document.createElement("span");
  countBadge.className = "herbarium-pill-count";
  countBadge.setAttribute("data-herbarium-count", "true");
  countBadge.textContent = String(getSavedCount());

  btn.appendChild(icon);
  btn.appendChild(countBadge);
  btn.addEventListener("click", () => {
    closeMobileOverlayIfOpen();
    openHerbariumDrawer();
  });
  return btn;
}

function buildDropdownMenuNodes(menuEl, item) {
  const currentRoute = normalizeRoutePath(window.location.pathname);

  if (
    Array.isArray(item.dropdownSections) &&
    item.dropdownSections.length > 0
  ) {
    item.dropdownSections.forEach((sec, secIdx) => {
      if (secIdx > 0) {
        const div = document.createElement("div");
        div.className = "nav-dropdown-divider";
        div.setAttribute("role", "separator");
        menuEl.appendChild(div);
      }
      if (sec.title) {
        const heading = document.createElement("div");
        heading.className = "nav-dropdown-section-label";
        heading.textContent = sec.title;
        menuEl.appendChild(heading);
      }
      (sec.items || []).forEach((child) => {
        const childLink = document.createElement("a");
        childLink.href = resolveSitePath(child.href);
        childLink.className = "nav-dropdown-item";
        childLink.setAttribute("role", "menuitem");
        childLink.textContent = child.label;

        const cleanTarget = normalizePathnameRoute(
          String(child.href || "").split("?")[0],
        );
        if (cleanTarget === currentRoute && !window.location.search) {
          childLink.classList.add("is-current-route");
          childLink.setAttribute("aria-current", "page");
        }
        menuEl.appendChild(childLink);
      });
    });
    return;
  }

  (item.children || []).forEach((child) => {
    const childLink = document.createElement("a");
    childLink.href = resolveSitePath(child.href);
    childLink.className = "nav-dropdown-item";
    childLink.setAttribute("role", "menuitem");
    childLink.textContent = child.label;
    menuEl.appendChild(childLink);
  });
}

function buildNavbarDom(host, config) {
  const inner = document.createElement("div");
  inner.className = "navbar-inner";

  const brand = config.brand || FALLBACK_NAVBAR_CONFIG.brand;
  const links = config.links || FALLBACK_NAVBAR_CONFIG.links;
  const searchCfg = config.search || FALLBACK_NAVBAR_CONFIG.search;
  const herbariumCfg = config.herbarium || FALLBACK_NAVBAR_CONFIG.herbarium;
  const mobileCfg = config.mobile || FALLBACK_NAVBAR_CONFIG.mobile;

  inner.appendChild(createBrandLogo(brand, "brand-logo", 32));

  const navEl = document.createElement("nav");
  navEl.className = "navbar-links";
  navEl.setAttribute("aria-label", config.ariaLabel || "Primary navigation");

  links.forEach((item) => {
    const active = isNavItemActive(item);
    const hasDropdown =
      (Array.isArray(item.dropdownSections) &&
        item.dropdownSections.length > 0) ||
      (Array.isArray(item.children) && item.children.length > 0);

    if (!hasDropdown) {
      const a = document.createElement("a");
      a.href = resolveSitePath(item.href);
      a.className = active ? "nav-text-link active" : "nav-text-link";
      a.textContent = item.label;
      if (item.id) a.id = item.id;
      if (active) a.setAttribute("aria-current", "page");
      navEl.appendChild(a);
      return;
    }

    const group = document.createElement("div");
    group.className = "nav-dropdown-group";

    const a = document.createElement("a");
    a.href = resolveSitePath(item.href);
    a.className = active ? "nav-text-link active" : "nav-text-link";
    a.textContent = item.label;
    if (item.id) a.id = item.id;
    if (active) a.setAttribute("aria-current", "page");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-dropdown-trigger";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-label", `${item.label} menu`);
    toggle.appendChild(createChevronDownSvg());

    const menu = document.createElement("div");
    menu.className = "nav-dropdown-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    buildDropdownMenuNodes(menu, item);

    group.appendChild(a);
    group.appendChild(toggle);
    group.appendChild(menu);
    navEl.appendChild(group);
  });

  inner.appendChild(navEl);

  // Right Utility Cluster: Bilingual Instant Search + Herbarium Trigger + Mobile Controls
  const utilityCluster = document.createElement("div");
  utilityCluster.className = "navbar-utility-cluster";

  const searchWrap = document.createElement("div");
  searchWrap.className = "navbar-search-wrap";
  searchWrap.id = "navbarSearchWrap";

  const form = document.createElement("form");
  form.className = "navbar-search-form";
  form.id = "navbarSearchForm";
  form.setAttribute("role", "search");
  form.appendChild(createSearchIconSvg(16));

  const input = document.createElement("input");
  input.type = "search";
  input.id = "navbarSearchInput";
  input.placeholder = searchCfg.placeholder || "Search species (EN / বাংলা)...";
  input.autocomplete = "off";
  input.setAttribute(
    "aria-label",
    searchCfg.ariaLabel || "Quick search plant species in English or Bengali",
  );

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "navbar-search-clear";
  clearBtn.id = "navbarSearchClear";
  clearBtn.setAttribute("aria-label", searchCfg.clearLabel || "Clear search");
  clearBtn.hidden = true;
  clearBtn.textContent = "×";

  form.appendChild(input);
  form.appendChild(clearBtn);

  const suggestions = document.createElement("div");
  suggestions.className = "navbar-suggestions";
  suggestions.id = "navbarSuggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.setAttribute("aria-label", "Matching plant species");
  suggestions.hidden = true;

  searchWrap.appendChild(form);
  searchWrap.appendChild(suggestions);
  utilityCluster.appendChild(searchWrap);

  // Personal Herbarium Pill (Desktop & Mobile)
  utilityCluster.appendChild(
    createHerbariumPillButton(herbariumCfg, "is-desktop-pill"),
  );

  // Mobile Quick-Search Trigger + Herbarium Pill + Hamburger
  const mobileQuickSearch = document.createElement("button");
  mobileQuickSearch.type = "button";
  mobileQuickSearch.className = "mobile-quick-search-btn";
  mobileQuickSearch.id = "mobileQuickSearchBtn";
  mobileQuickSearch.setAttribute("aria-label", "Open mobile search");
  mobileQuickSearch.appendChild(createSearchIconSvg(17));
  utilityCluster.appendChild(mobileQuickSearch);

  utilityCluster.appendChild(
    createHerbariumPillButton(herbariumCfg, "is-mobile-pill"),
  );

  const mobileBtn = document.createElement("button");
  mobileBtn.type = "button";
  mobileBtn.className = "mobile-menu-toggle";
  mobileBtn.id = "mobileMenuToggle";
  mobileBtn.setAttribute(
    "aria-label",
    mobileCfg.openLabel || "Open navigation menu",
  );
  mobileBtn.setAttribute("aria-expanded", "false");
  mobileBtn.setAttribute("aria-controls", "mobileNavOverlay");

  const hamburgerBox = document.createElement("span");
  hamburgerBox.className = "hamburger-box";
  hamburgerBox.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i += 1) {
    const line = document.createElement("span");
    line.className = "hamburger-line";
    hamburgerBox.appendChild(line);
  }
  mobileBtn.appendChild(hamburgerBox);
  utilityCluster.appendChild(mobileBtn);

  inner.appendChild(utilityCluster);

  host.classList.add("global-navbar");
  host.replaceChildren(inner);
}

function buildMobileOverlayDom(navbarHost, config) {
  const existing = document.getElementById("mobileNavOverlay");
  if (existing) existing.remove();

  const brand = config.brand || FALLBACK_NAVBAR_CONFIG.brand;
  const searchCfg = config.search || FALLBACK_NAVBAR_CONFIG.search;
  const mobileCfg = config.mobile || FALLBACK_NAVBAR_CONFIG.mobile;
  const corePages =
    mobileCfg.corePages ||
    config.links ||
    FALLBACK_NAVBAR_CONFIG.mobile.corePages;

  const overlay = document.createElement("div");
  overlay.className = "mobile-nav-overlay";
  overlay.id = "mobileNavOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute(
    "aria-label",
    mobileCfg.dialogLabel || "Mobile navigation and search",
  );
  overlay.hidden = true;

  const overlayHeader = document.createElement("div");
  overlayHeader.className = "mobile-overlay-header";
  overlayHeader.appendChild(
    createBrandLogo(brand, "brand-logo mobile-overlay-brand", 30),
  );

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "mobile-overlay-close";
  closeBtn.id = "mobileMenuClose";
  closeBtn.setAttribute(
    "aria-label",
    mobileCfg.closeLabel || "Close navigation menu",
  );
  closeBtn.appendChild(createCloseIconSvg());
  overlayHeader.appendChild(closeBtn);
  overlay.appendChild(overlayHeader);

  const overlayBody = document.createElement("div");
  overlayBody.className = "mobile-overlay-body";

  const searchSection = document.createElement("div");
  searchSection.className = "mobile-search-section";

  const searchWrap = document.createElement("div");
  searchWrap.className = "mobile-search-wrap";
  searchWrap.id = "mobileSearchWrap";

  const form = document.createElement("form");
  form.className = "mobile-search-form";
  form.id = "mobileSearchForm";
  form.setAttribute("role", "search");
  form.appendChild(createSearchIconSvg(18));

  const input = document.createElement("input");
  input.type = "search";
  input.id = "mobileSearchInput";
  input.placeholder = searchCfg.placeholder || "Search species (EN / বাংলা)...";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Search plant species");

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "navbar-search-clear";
  clearBtn.id = "mobileSearchClear";
  clearBtn.setAttribute("aria-label", "Clear mobile search");
  clearBtn.hidden = true;
  clearBtn.textContent = "×";

  form.appendChild(input);
  form.appendChild(clearBtn);

  const suggestions = document.createElement("div");
  suggestions.className = "mobile-suggestions";
  suggestions.id = "mobileSuggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.setAttribute("aria-label", "Matching plant species");
  suggestions.hidden = true;

  searchWrap.appendChild(form);
  searchWrap.appendChild(suggestions);
  searchSection.appendChild(searchWrap);

  if (Array.isArray(mobileCfg.quickTry) && mobileCfg.quickTry.length > 0) {
    const quickTryWrap = document.createElement("div");
    quickTryWrap.className = "mobile-quick-try";
    quickTryWrap.setAttribute("aria-label", "Quick try species");

    const kicker = document.createElement("span");
    kicker.className = "mobile-section-kicker";
    kicker.textContent = mobileCfg.quickTryTitle || "Quick Try";
    quickTryWrap.appendChild(kicker);

    const chipRow = document.createElement("div");
    chipRow.className = "mobile-chip-row";
    mobileCfg.quickTry.forEach((chip) => {
      const a = document.createElement("a");
      a.href = resolveSitePath(chip.href);
      a.className = "mobile-quick-chip";
      a.textContent = chip.label;
      chipRow.appendChild(a);
    });
    quickTryWrap.appendChild(chipRow);
    searchSection.appendChild(quickTryWrap);
  }

  overlayBody.appendChild(searchSection);

  // My Herbarium direct shortcut card
  const herbariumShortcut = document.createElement("button");
  herbariumShortcut.type = "button";
  herbariumShortcut.className = "mobile-herbarium-shortcut";
  const hsLeft = document.createElement("span");
  hsLeft.className = "mobile-herbarium-shortcut-left";
  hsLeft.appendChild(createBookmarkSvg(true, 17));
  hsLeft.appendChild(document.createTextNode("My Herbarium Collection"));
  const hsBadge = document.createElement("span");
  hsBadge.className = "mobile-nav-badge";
  hsBadge.setAttribute("data-herbarium-count", "true");
  hsBadge.textContent = String(getSavedCount());
  herbariumShortcut.appendChild(hsLeft);
  herbariumShortcut.appendChild(hsBadge);
  herbariumShortcut.addEventListener("click", () => {
    closeMobileOverlayIfOpen();
    openHerbariumDrawer();
  });
  overlayBody.appendChild(herbariumShortcut);

  const mobileNav = document.createElement("nav");
  mobileNav.className = "mobile-overlay-cards";
  mobileNav.setAttribute("aria-label", "Core pages navigation");

  corePages.forEach((item, idx) => {
    const card = document.createElement("a");
    card.href = resolveSitePath(item.href);
    card.className = "mobile-nav-card";
    if (isNavItemActive(item)) {
      card.setAttribute("aria-current", "page");
    }

    const badge = document.createElement("span");
    badge.className = "mobile-nav-badge";
    badge.textContent = String(idx + 1).padStart(2, "0");

    const textWrap = document.createElement("span");
    textWrap.className = "mobile-nav-card-text";

    const title = document.createElement("span");
    title.className = "mobile-nav-card-title";
    title.textContent = item.label;

    const sub = document.createElement("span");
    sub.className = "mobile-nav-card-sub";
    sub.textContent = item.sublabel || "";

    textWrap.appendChild(title);
    textWrap.appendChild(sub);

    const arrow = document.createElement("span");
    arrow.className = "mobile-nav-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    card.appendChild(badge);
    card.appendChild(textWrap);
    card.appendChild(arrow);
    mobileNav.appendChild(card);
  });

  overlayBody.appendChild(mobileNav);

  if (Array.isArray(mobileCfg.categories) && mobileCfg.categories.length > 0) {
    const catWrap = document.createElement("div");
    catWrap.className = "mobile-category-explore";

    const kicker = document.createElement("span");
    kicker.className = "mobile-section-kicker";
    kicker.textContent = mobileCfg.categoriesTitle || "Explore by Category";
    catWrap.appendChild(kicker);

    const pills = document.createElement("div");
    pills.className = "mobile-category-pills";
    mobileCfg.categories.forEach((cat) => {
      const a = document.createElement("a");
      a.href = resolveSitePath(cat.href);
      a.className = "mobile-category-pill";
      if (cat.category) {
        a.setAttribute("data-directory-category", cat.category);
      }
      a.textContent = cat.label;
      pills.appendChild(a);
    });
    catWrap.appendChild(pills);
    overlayBody.appendChild(catWrap);
  }

  if (mobileCfg.signature) {
    const sig = document.createElement("footer");
    sig.className = "mobile-overlay-signature";
    sig.textContent = mobileCfg.signature;
    overlayBody.appendChild(sig);
  }

  overlay.appendChild(overlayBody);
  navbarHost.insertAdjacentElement("afterend", overlay);
}

function bindNavbarShellInteractions(config) {
  const dropdownGroups = Array.from(
    document.querySelectorAll(".nav-dropdown-group"),
  );

  function closeAllDropdowns() {
    dropdownGroups.forEach((group) => {
      const btn = group.querySelector(".nav-dropdown-trigger");
      const menu = group.querySelector(".nav-dropdown-menu");
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (menu) menu.hidden = true;
      group.classList.remove("is-open");
    });
  }

  dropdownGroups.forEach((group) => {
    const btn = group.querySelector(".nav-dropdown-trigger");
    const menu = group.querySelector(".nav-dropdown-menu");
    if (!btn || !menu) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = menu.hidden;
      closeAllDropdowns();
      if (willOpen) {
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        group.classList.add("is-open");
      }
    });

    group.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllDropdowns();
        btn.focus();
      }
    });
  });

  if (!window.__plantipediaDropdownGlobalBound) {
    window.__plantipediaDropdownGlobalBound = true;
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav-dropdown-group")) {
        document.querySelectorAll(".nav-dropdown-group").forEach((g) => {
          const b = g.querySelector(".nav-dropdown-trigger");
          const m = g.querySelector(".nav-dropdown-menu");
          if (b) b.setAttribute("aria-expanded", "false");
          if (m) m.hidden = true;
          g.classList.remove("is-open");
        });
      }
    });
  }

  const toggleBtn = document.getElementById("mobileMenuToggle");
  const quickSearchBtn = document.getElementById("mobileQuickSearchBtn");
  const overlay = document.getElementById("mobileNavOverlay");
  const closeBtn = document.getElementById("mobileMenuClose");
  const searchInput = document.getElementById("mobileSearchInput");

  if (!toggleBtn || !overlay || !closeBtn) return;

  const openOverlay = () => {
    overlay.hidden = false;
    overlay.scrollTop = 0;
    const overlayBody = overlay.querySelector(".mobile-overlay-body");
    if (overlayBody) overlayBody.scrollTop = 0;
    toggleBtn.classList.add("is-open");
    toggleBtn.setAttribute("aria-expanded", "true");
    toggleBtn.setAttribute("aria-label", "Close navigation menu");
    document.documentElement.classList.add("overlay-locked");
    document.body.classList.add("overlay-locked");
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 60);
    }
  };

  const closeOverlay = (restoreFocus) => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    toggleBtn.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", "Open navigation menu");
    document.documentElement.classList.remove("overlay-locked");
    document.body.classList.remove("overlay-locked");
    if (restoreFocus) {
      toggleBtn.focus();
    }
  };

  toggleBtn.addEventListener("click", () => {
    if (overlay.hidden) {
      openOverlay();
    } else {
      closeOverlay(true);
    }
  });

  if (quickSearchBtn) {
    quickSearchBtn.addEventListener("click", () => {
      openOverlay();
    });
  }

  closeBtn.addEventListener("click", () => closeOverlay(true));

  overlay.addEventListener("click", (e) => {
    const link = e.target.closest(
      ".mobile-nav-card, .mobile-overlay-brand, .mobile-quick-chip, .mobile-category-pill",
    );
    if (!link) return;
    const dirCat = link.getAttribute("data-directory-category");
    closeOverlay(false);
    if (
      dirCat &&
      typeof window.__plantipediaSelectDirectoryCategory === "function"
    ) {
      e.preventDefault();
      window.__plantipediaSelectDirectoryCategory(dirCat);
    }
  });

  if (!window.__plantipediaOverlayEscBound) {
    window.__plantipediaOverlayEscBound = true;
    document.addEventListener("keydown", (e) => {
      const ov = document.getElementById("mobileNavOverlay");
      const tg = document.getElementById("mobileMenuToggle");
      if (e.key === "Escape" && ov && !ov.hidden) {
        ov.hidden = true;
        if (tg) {
          tg.classList.remove("is-open");
          tg.setAttribute("aria-expanded", "false");
          tg.focus();
        }
        document.documentElement.classList.remove("overlay-locked");
        document.body.classList.remove("overlay-locked");
      }
    });

    window.addEventListener("resize", () => {
      const ov = document.getElementById("mobileNavOverlay");
      const tg = document.getElementById("mobileMenuToggle");
      if (window.innerWidth > 1080 && ov && !ov.hidden) {
        ov.hidden = true;
        if (tg) {
          tg.classList.remove("is-open");
          tg.setAttribute("aria-expanded", "false");
        }
        document.documentElement.classList.remove("overlay-locked");
        document.body.classList.remove("overlay-locked");
      }
    });
  }

  if (!window.__plantipediaHashNavBound) {
    window.__plantipediaHashNavBound = true;
    window.addEventListener("hashchange", () => {
      (config.links || []).forEach((item) => {
        if (!item.id) return;
        const el = document.getElementById(item.id);
        if (!el) return;
        const active = isNavItemActive(item);
        el.classList.toggle("active", active);
        if (active) {
          el.setAttribute("aria-current", "page");
        } else {
          el.removeAttribute("aria-current");
        }
      });
    });
  }
}

function plantMatchesSearchQuery(plant, query) {
  if (!query) return true;
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

function renderNavSuggestionNodes(container, matches, query) {
  const frag = document.createDocumentFragment();
  if (matches.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "nav-suggestion-empty";
    emptyEl.textContent = `No species matched "${query}"`;
    frag.appendChild(emptyEl);
    container.replaceChildren(frag);
    container.hidden = false;
    return;
  }

  matches.forEach((plant, idx) => {
    const link = document.createElement("a");
    link.href = resolveSitePath(
      `./plant/?species=${encodeURIComponent(plant.slug)}`,
    );
    link.className = "nav-suggestion-item";
    link.setAttribute("role", "option");
    link.setAttribute("data-nav-idx", String(idx));

    const leftWrap = document.createElement("div");
    leftWrap.className = "nav-suggestion-left";

    const thumb = document.createElement("img");
    thumb.className = "nav-suggestion-thumb";
    thumb.src = plant.thumbnailUrl || resolveSitePath(PLACEHOLDER_SVG_PATH);
    thumb.alt = plant.commonName;
    thumb.loading = "lazy";
    thumb.setAttribute("referrerpolicy", "no-referrer");

    const textCol = document.createElement("div");
    const title = document.createElement("span");
    title.className = "nav-suggestion-title";
    title.textContent = plant.commonNameBn
      ? `${plant.commonName} (${plant.commonNameBn})`
      : plant.commonName;
    const sci = document.createElement("span");
    sci.className = "nav-suggestion-sci";
    sci.textContent = plant.scientificName;
    textCol.appendChild(title);
    textCol.appendChild(sci);

    leftWrap.appendChild(thumb);
    leftWrap.appendChild(textCol);

    const fam = document.createElement("span");
    fam.className = "nav-suggestion-family";
    fam.textContent = plant.family || plant.overview?.family || "";

    link.appendChild(leftWrap);
    link.appendChild(fam);
    frag.appendChild(link);
  });

  container.replaceChildren(frag);
  container.hidden = false;
}

function bindNavbarAutocomplete({
  formId,
  inputId,
  clearId,
  suggestionsId,
  wrapSelector,
  minLength = 1,
  onNavigate,
}) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const clearBtn = document.getElementById(clearId);
  const suggestionsEl = document.getElementById(suggestionsId);
  if (!form || !input || !suggestionsEl) return;
  if (form.dataset.searchBound === "true") return;
  form.dataset.searchBound = "true";

  let activeIndex = -1;
  let currentMatches = [];

  const hideSuggestions = () => {
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
    activeIndex = -1;
  };

  const renderSuggestions = (query) => {
    const q = query.trim();
    if (clearBtn) clearBtn.hidden = q.length === 0;
    if (!q || q.length < minLength) {
      currentMatches = [];
      hideSuggestions();
      return;
    }

    currentMatches = getSpeciesIndex()
      .filter((p) => plantMatchesSearchQuery(p, q))
      .slice(0, 8);
    activeIndex = -1;
    renderNavSuggestionNodes(suggestionsEl, currentMatches, q);
  };

  const syncActiveSuggestion = () => {
    const items = suggestionsEl.querySelectorAll(".nav-suggestion-item");
    items.forEach((el, idx) => {
      el.classList.toggle("is-active", idx === activeIndex);
    });
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }
  };

  const navigateToSpecies = (slug) => {
    if (typeof onNavigate === "function") onNavigate();
    window.location.href = resolveSitePath(
      `./plant/?species=${encodeURIComponent(slug)}`,
    );
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
      activeIndex = (activeIndex + 1) % currentMatches.length;
      syncActiveSuggestion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex =
        (activeIndex - 1 + currentMatches.length) % currentMatches.length;
      syncActiveSuggestion();
    } else if (
      e.key === "Enter" &&
      activeIndex >= 0 &&
      currentMatches[activeIndex]
    ) {
      e.preventDefault();
      navigateToSpecies(currentMatches[activeIndex].slug);
    }
  });

  suggestionsEl.addEventListener("click", (e) => {
    if (e.target.closest("a") && typeof onNavigate === "function") {
      onNavigate();
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
    if (activeIndex >= 0 && currentMatches[activeIndex]) {
      navigateToSpecies(currentMatches[activeIndex].slug);
      return;
    }
    const q = input.value.trim();
    const matches = getSpeciesIndex().filter((p) =>
      plantMatchesSearchQuery(p, q),
    );
    if (matches.length === 1) {
      navigateToSpecies(matches[0].slug);
      return;
    }
    if (q) {
      if (typeof onNavigate === "function") onNavigate();
      window.location.href = resolveSitePath(
        `./species/?q=${encodeURIComponent(q)}`,
      );
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(wrapSelector)) {
      hideSuggestions();
    }
  });
}

function closeMobileOverlayIfOpen() {
  const overlay = document.getElementById("mobileNavOverlay");
  const toggleBtn = document.getElementById("mobileMenuToggle");
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  if (toggleBtn) {
    toggleBtn.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
  }
  document.documentElement.classList.remove("overlay-locked");
  document.body.classList.remove("overlay-locked");
}

let compiledNavbarPromise = null;

export function compileNavbar() {
  if (compiledNavbarPromise) return compiledNavbarPromise;

  compiledNavbarPromise = (async () => {
    bindGlobalImageFallbackHandler();

    if (isEmbedMode()) {
      document.body.classList.add("is-embed");
      const host =
        document.getElementById("global-navbar") ||
        document.querySelector('[data-shell="navbar"]') ||
        document.getElementById("app-navbar");
      if (host) {
        host.replaceChildren();
        host.hidden = true;
      }
      return null;
    }

    initHerbariumSystem();

    const host =
      document.getElementById("global-navbar") ||
      document.querySelector('[data-shell="navbar"]') ||
      document.getElementById("app-navbar");

    if (!host) return null;

    const dataMap = await fetchDatasetsConcurrently(["navbar", "speciesIndex"]);
    const navbarOutcome = dataMap.get("navbar");
    const indexOutcome = dataMap.get("speciesIndex");

    if (indexOutcome?.ok && Array.isArray(indexOutcome.data)) {
      setSpeciesIndex(indexOutcome.data);
    }

    const config =
      navbarOutcome?.ok && navbarOutcome.data
        ? navbarOutcome.data
        : FALLBACK_NAVBAR_CONFIG;

    buildNavbarDom(host, config);
    buildMobileOverlayDom(host, config);
    bindNavbarShellInteractions(config);

    const minLength = Number(config.search?.minQueryLength) || 1;
    bindNavbarAutocomplete({
      formId: "navbarSearchForm",
      inputId: "navbarSearchInput",
      clearId: "navbarSearchClear",
      suggestionsId: "navbarSuggestions",
      wrapSelector: "#navbarSearchWrap",
      minLength,
    });
    bindNavbarAutocomplete({
      formId: "mobileSearchForm",
      inputId: "mobileSearchInput",
      clearId: "mobileSearchClear",
      suggestionsId: "mobileSuggestions",
      wrapSelector: "#mobileSearchWrap",
      minLength,
      onNavigate: closeMobileOverlayIfOpen,
    });

    document.dispatchEvent(
      new CustomEvent("plantipedia:navbar-ready", { detail: { config } }),
    );
    return config;
  })();

  return compiledNavbarPromise;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", compileNavbar);
} else {
  compileNavbar();
}
