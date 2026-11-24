/**
 * Universal Single-Source-of-Truth Layout Shell Hydrator
 * - Fetches ./data/config/site-shell.json using subpath-safe relative resolution
 * - Hydrates #global-navbar, sibling #mobileNavOverlay, and #global-footer
 * - Auto-detects active route (handling / and /index.html cleanly)
 * - Binds interactive dropdowns, mobile overlay drawer, keyboard Escape/focus, and SVG image fallback
 */

import { normalizePathnameRoute, resolveRootPath } from "../core/router.js";

const SITE_ROOT_URL = new URL("../../", import.meta.url);
const SHELL_DATA_URL = new URL("./data/config/site-shell.json", SITE_ROOT_URL)
  .href;
const PLACEHOLDER_SVG_PATH = "./assets/images/placeholder-botanical.svg";

const FALLBACK_SHELL_CONFIG = {
  brand: {
    title: "Plantipedia",
    accentPrefix: "Plant",
    restTitle: "ipedia",
    tagline:
      "Exploring the fascinating world of plants, one species at a time.",
    logo: "./assets/images/brand-flower.svg",
    logoAlt: "Plantipedia floral emblem",
    homeHref: "./",
  },
  navbar: {
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
        id: "nav-about",
        label: "About",
        href: "./#about-plantipedia",
        sublabel: "Mission & Archive",
      },
      {
        id: "nav-species",
        label: "Available Species",
        href: "./species/",
        matchPaths: ["/species/", "/species", "/plant/", "/plant"],
        sublabel: "Full 20-Species Flora Directory",
      },
      {
        id: "nav-ecology",
        label: "Ecology",
        href: "./#botanical-highlights",
        sublabel: "Field Notes & Habitats",
      },
    ],
    search: {
      placeholder: "Search 20 species...",
      ariaLabel: "Quick search plant species",
      clearLabel: "Clear search",
    },
    mobile: {
      openLabel: "Open navigation menu",
      closeLabel: "Close navigation menu",
      dialogLabel: "Mobile navigation and search",
      quickTryTitle: "Quick Try",
      quickTry: [
        { label: "Mango", href: "./plant/?species=mango" },
        { label: "Rose", href: "./plant/?species=rose" },
        { label: "Sacred Lotus", href: "./plant/?species=lotus" },
        { label: "Tulsi", href: "./plant/?species=tulsi" },
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
  },
  footer: {
    summary:
      "Exploring the fascinating world of plants, one species at a time. Plantipedia is an educational botanical archive dedicated to documenting global flora with scientific accuracy.",
    compactTagline:
      "Exploring the fascinating world of plants, one species at a time.",
    credits: [
      { role: "Chief Patron & Authorization", name: "JALEES HABIB" },
      { role: "Lead Design & UX Collaboration", name: "RAYAAN TASNIM" },
    ],
    partners: [
      { prefix: "Thanks to", name: "IDAI Universe" },
      { prefix: "Powered by", name: "Olympiad Edge" },
    ],
    copyrightTemplate: "© {year} Plantipedia. All rights reserved.",
    legalNote: "",
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

/**
 * Resolves a site-root-relative path (e.g. "./species/" or "./assets/...")
 * into a relative URL valid from the current page depth & GitHub Pages subpath.
 */
export function resolveSitePath(rawPath) {
  const clean = sanitizeHref(rawPath, "./");
  if (/^https?:/i.test(clean) || clean.startsWith("#")) {
    return clean;
  }
  return resolveRootPath(clean, "./");
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

function isNavItemActive(item) {
  const currentRoute = normalizeRoutePath(window.location.pathname);
  const currentHash = window.location.hash || "";

  if (Array.isArray(item.matchPaths)) {
    const matchedPath = item.matchPaths.some((p) => {
      const cleanMatch = normalizePathnameRoute(p);
      return cleanMatch === currentRoute;
    });
    if (matchedPath && !item.matchHash) {
      if (
        item.id === "nav-home" &&
        currentHash &&
        currentHash !== "#hero-search"
      ) {
        // Keep Home active unless user explicitly jumped to a hash nav link
        const hasHashLinkMatch =
          currentHash === "#about-plantipedia" ||
          currentHash === "#botanical-highlights";
        return !hasHashLinkMatch;
      }
      return true;
    }
  }

  if (item.matchHash && currentRoute === "" && currentHash === item.matchHash) {
    return true;
  }

  try {
    const targetUrl = new URL(
      sanitizeHref(item.href).replace(/^\.\//, ""),
      SITE_ROOT_URL,
    );
    const targetRoute = normalizeRoutePath(targetUrl.pathname);
    if (targetUrl.hash) {
      return currentRoute === targetRoute && currentHash === targetUrl.hash;
    }
    return currentRoute === targetRoute;
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
  wordmark.className =
    className === "footer-brand" ? "footer-brand-name" : "brand-wordmark";
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

function buildNavbarDom(host, config) {
  const inner = document.createElement("div");
  inner.className = "navbar-inner";

  const brand = config.brand || FALLBACK_SHELL_CONFIG.brand;
  const nav = config.navbar || FALLBACK_SHELL_CONFIG.navbar;

  inner.appendChild(createBrandLogo(brand, "brand-logo", 32));

  const navEl = document.createElement("nav");
  navEl.className = "navbar-links";
  navEl.setAttribute("aria-label", nav.ariaLabel || "Primary navigation");

  (nav.links || []).forEach((item) => {
    const active = isNavItemActive(item);
    const hasChildren =
      Array.isArray(item.children) && item.children.length > 0;

    if (!hasChildren) {
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
    toggle.setAttribute("aria-label", `${item.label} categories`);
    toggle.appendChild(createChevronDownSvg());

    const menu = document.createElement("div");
    menu.className = "nav-dropdown-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    item.children.forEach((child) => {
      const childLink = document.createElement("a");
      childLink.href = resolveSitePath(child.href);
      childLink.className = "nav-dropdown-item";
      childLink.setAttribute("role", "menuitem");
      childLink.textContent = child.label;
      menu.appendChild(childLink);
    });

    group.appendChild(a);
    group.appendChild(toggle);
    group.appendChild(menu);
    navEl.appendChild(group);
  });

  inner.appendChild(navEl);

  // Desktop inline live search
  const searchCfg = nav.search || {};
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
  input.placeholder = searchCfg.placeholder || "Search 20 species...";
  input.autocomplete = "off";
  input.setAttribute(
    "aria-label",
    searchCfg.ariaLabel || "Quick search plant species",
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
  inner.appendChild(searchWrap);

  // Mobile toggle button
  const mobileCfg = nav.mobile || {};
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
  inner.appendChild(mobileBtn);

  host.classList.add("global-navbar");
  host.replaceChildren(inner);
}

function buildMobileOverlayDom(navbarHost, config) {
  const existing = document.getElementById("mobileNavOverlay");
  if (existing) existing.remove();

  const brand = config.brand || FALLBACK_SHELL_CONFIG.brand;
  const nav = config.navbar || FALLBACK_SHELL_CONFIG.navbar;
  const mobileCfg = nav.mobile || {};
  const searchCfg = nav.search || {};

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

  // Fixed/Pinned Header inside non-scrolling overlay container
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

  // Scrollable body
  const overlayBody = document.createElement("div");
  overlayBody.className = "mobile-overlay-body";

  // Mobile search
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
  input.placeholder = searchCfg.placeholder || "Search 20 species...";
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

  // Quick Try chips
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

  // Mobile nav cards
  const mobileNav = document.createElement("nav");
  mobileNav.className = "mobile-overlay-cards";
  mobileNav.setAttribute("aria-label", "Mobile navigation");

  (nav.links || []).forEach((item, idx) => {
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

  // Mobile Categories
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

  // Mobile overlay signature
  if (mobileCfg.signature) {
    const sig = document.createElement("footer");
    sig.className = "mobile-overlay-signature";
    sig.textContent = mobileCfg.signature;
    overlayBody.appendChild(sig);
  }

  overlay.appendChild(overlayBody);
  // Insert directly after #global-navbar (outside fixed navbar's backdrop-filter block)
  navbarHost.insertAdjacentElement("afterend", overlay);
}

function buildFooterDom(host, config) {
  const brand = config.brand || FALLBACK_SHELL_CONFIG.brand;
  const footer = config.footer || FALLBACK_SHELL_CONFIG.footer;
  const isCompact = host.getAttribute("data-footer-variant") === "compact";

  host.classList.add("site-footer");
  if (isCompact) {
    host.classList.add("site-footer--compact");
  }

  const container = document.createElement("div");
  container.className = "footer-container";

  // Part 1: Brand Overview / Tagline
  const overview = document.createElement("div");
  overview.className = "footer-overview-block";
  overview.appendChild(createBrandLogo(brand, "footer-brand", 30));

  const copy = document.createElement("p");
  copy.className = isCompact
    ? "footer-tagline-compact"
    : "footer-overview-copy";
  copy.textContent = isCompact
    ? footer.compactTagline || brand.tagline
    : footer.summary || brand.tagline;
  overview.appendChild(copy);
  container.appendChild(overview);

  const divider = document.createElement("div");
  divider.className = "footer-divider";
  divider.setAttribute("aria-hidden", "true");
  container.appendChild(divider);

  // Part 2: Credits, Partners, Legal & Dynamic Copyright Year
  const creditsBar = document.createElement("div");
  creditsBar.className = "footer-credits-bar";

  if (Array.isArray(footer.credits) && footer.credits.length > 0) {
    const creditRow = document.createElement("div");
    creditRow.className = "footer-credit-row";

    footer.credits.forEach((credit) => {
      const line = document.createElement("p");
      line.className = "footer-credit-line";

      const roleSpan = document.createElement("span");
      roleSpan.className = "credit-label";
      roleSpan.textContent = credit.role;

      const sepSpan = document.createElement("span");
      sepSpan.className = "credit-sep";
      sepSpan.setAttribute("aria-hidden", "true");
      sepSpan.textContent = "·";

      const nameSpan = document.createElement("span");
      nameSpan.className = "credit-name";
      nameSpan.textContent = credit.name;

      line.appendChild(roleSpan);
      line.appendChild(sepSpan);
      line.appendChild(nameSpan);
      creditRow.appendChild(line);
    });

    creditsBar.appendChild(creditRow);
  }

  if (
    !isCompact &&
    Array.isArray(footer.partners) &&
    footer.partners.length > 0
  ) {
    const partnerPill = document.createElement("div");
    partnerPill.className = "footer-partner-pill";

    footer.partners.forEach((partner, idx) => {
      if (idx > 0) {
        const pipe = document.createElement("span");
        pipe.className = "partner-pipe";
        pipe.setAttribute("aria-hidden", "true");
        pipe.textContent = "|";
        partnerPill.appendChild(pipe);
      }
      const muted = document.createElement("span");
      muted.className = "partner-muted";
      muted.textContent = `${partner.prefix} `;

      const strong = document.createElement("strong");
      strong.className = "partner-highlight";
      strong.textContent = partner.name;

      partnerPill.appendChild(muted);
      partnerPill.appendChild(strong);
    });

    creditsBar.appendChild(partnerPill);
  }

  if (footer.legalNote) {
    const legal = document.createElement("p");
    legal.className = "footer-legal-note";
    legal.textContent = footer.legalNote;
    creditsBar.appendChild(legal);
  }

  const currentYear = String(new Date().getFullYear());
  const rawCopyright =
    footer.copyrightTemplate || "© {year} Plantipedia. All rights reserved.";
  const copyrightEl = document.createElement("p");
  copyrightEl.className = "footer-copyright";
  copyrightEl.textContent = rawCopyright.replace(/\{year\}/g, currentYear);
  creditsBar.appendChild(copyrightEl);

  container.appendChild(creditsBar);
  host.replaceChildren(container);
}

function bindShellInteractions() {
  // Desktop dropdown menus
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

  // Mobile overlay drawer toggle
  const toggleBtn = document.getElementById("mobileMenuToggle");
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
      if (window.innerWidth > 768 && ov && !ov.hidden) {
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
}

/**
 * Global capture-phase broken-image handler:
 * Swaps failed external CDN URLs to local SVG placeholder (./assets/images/placeholder-botanical.svg).
 */
export function bindGlobalImageFallbackHandler() {
  if (window.__plantipediaImgErrorBound) return;
  window.__plantipediaImgErrorBound = true;

  const placeholderHref = resolveSitePath(PLACEHOLDER_SVG_PATH);

  document.addEventListener(
    "error",
    (e) => {
      const target = e.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.dataset.fallbackApplied === "true") {
        // Double failure safeguard: remove broken <img> silently or replace with accessible box
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

let cachedShellPromise = null;
let interactionsBound = false;

export function hydrateShellFromConfig(rawConfig) {
  bindGlobalImageFallbackHandler();

  const shellConfig =
    rawConfig &&
    typeof rawConfig === "object" &&
    rawConfig.navbar &&
    rawConfig.footer
      ? rawConfig
      : FALLBACK_SHELL_CONFIG;

  const navbarHost =
    document.querySelector('[data-shell="navbar"]') ||
    document.getElementById("app-navbar") ||
    document.getElementById("global-navbar");
  const footerHost =
    document.querySelector('[data-shell="footer"]') ||
    document.getElementById("app-footer") ||
    document.getElementById("global-footer");

  if (!navbarHost && !footerHost) {
    return null;
  }

  if (navbarHost) {
    buildNavbarDom(navbarHost, shellConfig);
    buildMobileOverlayDom(navbarHost, shellConfig);
    bindShellInteractions();
  }

  if (footerHost) {
    buildFooterDom(footerHost, shellConfig);
  }

  if (!interactionsBound) {
    interactionsBound = true;
    window.addEventListener("hashchange", () => {
      const host =
        document.querySelector('[data-shell="navbar"]') ||
        document.getElementById("app-navbar") ||
        document.getElementById("global-navbar");
      if (!host) return;
      const links = shellConfig.navbar?.links || [];
      links.forEach((item) => {
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

  cachedShellPromise = Promise.resolve(shellConfig);
  window.__plantipediaShellPromise = cachedShellPromise;
  document.dispatchEvent(
    new CustomEvent("plantipedia:shell-ready", {
      detail: { config: shellConfig },
    }),
  );
  return shellConfig;
}

export function renderNavbarShell(host, rawConfig) {
  bindGlobalImageFallbackHandler();
  const shellConfig =
    rawConfig && typeof rawConfig === "object" && rawConfig.navbar
      ? rawConfig
      : FALLBACK_SHELL_CONFIG;

  buildNavbarDom(host, shellConfig);
  buildMobileOverlayDom(host, shellConfig);
  bindShellInteractions();

  if (!interactionsBound) {
    interactionsBound = true;
    window.addEventListener("hashchange", () => {
      const links = shellConfig.navbar?.links || [];
      links.forEach((item) => {
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

  cachedShellPromise = Promise.resolve(shellConfig);
  window.__plantipediaShellPromise = cachedShellPromise;
  document.dispatchEvent(
    new CustomEvent("plantipedia:shell-ready", {
      detail: { config: shellConfig },
    }),
  );
  return shellConfig;
}

export function renderFooterShell(host, rawConfig) {
  const shellConfig =
    rawConfig && typeof rawConfig === "object" && rawConfig.footer
      ? rawConfig
      : FALLBACK_SHELL_CONFIG;
  buildFooterDom(host, shellConfig);
  return shellConfig;
}

export function initSiteShell(preloadedConfig = null) {
  if (preloadedConfig) {
    return Promise.resolve(hydrateShellFromConfig(preloadedConfig));
  }
  if (cachedShellPromise) return cachedShellPromise;

  cachedShellPromise = (async () => {
    let shellConfig = FALLBACK_SHELL_CONFIG;
    try {
      const res = await fetch(SHELL_DATA_URL, { cache: "no-cache" });
      if (res.ok) {
        const parsed = await res.json();
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.navbar &&
          parsed.footer
        ) {
          shellConfig = parsed;
        }
      }
    } catch {
      // Static fallback configuration guarantees shell continuity offline or on JSON error
    }

    return hydrateShellFromConfig(shellConfig);
  })();

  window.__plantipediaShellPromise = cachedShellPromise;
  return cachedShellPromise;
}
