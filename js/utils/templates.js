/**
 * Programmatic XSS-safe DOM Templating Engine.
 * Builds all sections, cards, skeletons, and error panels using DocumentFragment & textContent.
 * Zero inline HTML templates or innerHTML interpolation.
 */

import { createBookmarkButton } from "../services/herbarium.js";
import { resolveRootPath } from "../core/router.js";

const SAFE_PROTOCOL_RE = /^(https?:|\.{0,2}\/|#)/i;
const SVG_NS = "http://www.w3.org/2000/svg";

export function sanitizeUrl(rawUrl, fallback = "./") {
  const safeFallback =
    fallback && !/^https?:/i.test(fallback) && !fallback.startsWith("#")
      ? resolveRootPath(fallback, "./")
      : fallback;

  if (typeof rawUrl !== "string") return safeFallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return safeFallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
    return safeFallback;
  }
  if (/^https?:/i.test(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }
  if (
    SAFE_PROTOCOL_RE.test(trimmed) ||
    /^[a-z0-9_/-]+(?:\.html)?(?:\?[^#]*)?(?:#.*)?$/i.test(trimmed)
  ) {
    return resolveRootPath(trimmed, safeFallback);
  }
  return safeFallback;
}

export function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) {
    el.textContent = String(text);
  }
  return el;
}

export function createSearchIconSvg(size = 20, className = "home-search-icon") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", "11");
  circle.setAttribute("cy", "11");
  circle.setAttribute("r", "8");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "m21 21-4.3-4.3");

  svg.appendChild(circle);
  svg.appendChild(path);
  return svg;
}

export function createCloseIconSvg(size = 20) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const l1 = document.createElementNS(SVG_NS, "line");
  l1.setAttribute("x1", "18");
  l1.setAttribute("y1", "6");
  l1.setAttribute("x2", "6");
  l1.setAttribute("y2", "18");

  const l2 = document.createElementNS(SVG_NS, "line");
  l2.setAttribute("x1", "6");
  l2.setAttribute("y1", "6");
  l2.setAttribute("x2", "18");
  l2.setAttribute("y2", "18");

  svg.appendChild(l1);
  svg.appendChild(l2);
  return svg;
}

export function buildImageElement(
  rawUrl,
  altText,
  fallbackLabel,
  { eager = false } = {},
) {
  const safeSrc = sanitizeUrl(
    rawUrl,
    "./assets/images/placeholder-botanical.svg",
  );
  const img = document.createElement("img");
  img.src = safeSrc;
  img.alt = altText ?? "";
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (eager) {
    img.setAttribute("fetchpriority", "high");
  }
  img.setAttribute("referrerpolicy", "no-referrer");
  if (fallbackLabel) {
    img.setAttribute("data-fallback-label", fallbackLabel);
  }
  return img;
}

export function createSpeciesCardElement(
  plant,
  ctaLabel = "Explore Monograph",
) {
  const slug = plant.slug || plant.id || "";
  const fallbackHref = `./plant/?species=${encodeURIComponent(slug)}`;
  const safeHref = sanitizeUrl(plant.href || fallbackHref, fallbackHref);

  const card = createEl("a", "species-card");
  card.href = safeHref;
  card.setAttribute("aria-label", `Read monograph for ${plant.commonName}`);
  card.setAttribute("data-species-id", plant.id || slug);

  const mediaBox = createEl("div", "species-card-media");
  const imgConfig = plant.image || plant.heroImage || {};
  const rawImgUrl = plant.thumbnailUrl || imgConfig.imageUrl || imgConfig.url;
  const imgAlt =
    plant.imageAlt ||
    imgConfig.imageAlt ||
    imgConfig.alt ||
    `${plant.commonName} — ${plant.scientificName}`;
  if (imgConfig.aspectRatio) {
    mediaBox.style.aspectRatio = imgConfig.aspectRatio;
  }

  const img = buildImageElement(
    rawImgUrl,
    imgAlt,
    imgConfig.fallbackLabel || `${plant.commonName} — ${plant.scientificName}`,
  );
  if (imgConfig.photographer) {
    img.setAttribute("data-photographer", imgConfig.photographer);
  }
  mediaBox.appendChild(img);
  mediaBox.appendChild(createBookmarkButton({ ...plant, slug }, "card"));

  const body = createEl("div", "species-card-body");

  const meta = createEl("div", "species-card-meta");
  meta.appendChild(createEl("span", "", plant.category || ""));
  const sep = createEl("span", "meta-sep", "·");
  sep.setAttribute("aria-hidden", "true");
  meta.appendChild(sep);
  meta.appendChild(
    createEl("span", "", plant.family || plant.overview?.family || ""),
  );

  const title = createEl("h3", "species-card-title", plant.commonName);
  const bnSuffix = plant.localName ? plant.localName : plant.commonNameBn || "";
  const sciText = bnSuffix
    ? `${plant.scientificName} · ${bnSuffix}`
    : plant.scientificName;
  const sci = createEl("p", "species-card-sci", sciText);
  const excerpt = createEl(
    "p",
    "species-card-excerpt",
    plant.shortSummary || "",
  );

  const cta = createEl("div", "species-card-cta");
  cta.appendChild(createEl("span", "", plant.ctaLabel || ctaLabel));
  const arrow = createEl("span", "species-card-cta-arrow", "→");
  arrow.setAttribute("aria-hidden", "true");
  cta.appendChild(arrow);

  body.appendChild(meta);
  body.appendChild(title);
  body.appendChild(sci);
  body.appendChild(excerpt);
  body.appendChild(cta);

  card.appendChild(mediaBox);
  card.appendChild(body);
  return card;
}

/**
 * Lightweight mount-level skeleton loaders rendered immediately during async JSON hydration.
 */
export function renderMountSkeleton(mountEl, sectionKey) {
  if (!mountEl) return;
  const fragment = document.createDocumentFragment();

  if (sectionKey === "hero") {
    const heroShell = createEl("div", "skeleton-hero-shell");
    heroShell.setAttribute("aria-hidden", "true");
    [
      "skeleton-line--xs",
      "skeleton-line--lg",
      "skeleton-line--md",
      "skeleton-line--sm",
    ].forEach((cls) =>
      heroShell.appendChild(
        createEl("div", `skeleton-line ${cls} skeleton-shimmer`),
      ),
    );
    heroShell.appendChild(
      createEl("div", "skeleton-hero-bar skeleton-shimmer"),
    );
    fragment.appendChild(heroShell);
    mountEl.replaceChildren(fragment);
    return;
  }

  if (sectionKey === "directory-banner" || sectionKey === "page-banner") {
    const band = createEl("div", "skeleton-section-band");
    band.setAttribute("aria-hidden", "true");
    const stack = createEl("div", "skeleton-header-stack");
    ["skeleton-line--xs", "skeleton-line--lg", "skeleton-line--md"].forEach(
      (cls) =>
        stack.appendChild(
          createEl("div", `skeleton-line ${cls} skeleton-shimmer`),
        ),
    );
    band.appendChild(stack);
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  const band = createEl("div", "skeleton-section-band");
  band.setAttribute("aria-hidden", "true");

  const headerStack = createEl("div", "skeleton-header-stack");
  headerStack.appendChild(
    createEl("div", "skeleton-line skeleton-line--xs skeleton-shimmer"),
  );
  headerStack.appendChild(
    createEl("div", "skeleton-line skeleton-line--sm skeleton-shimmer"),
  );
  band.appendChild(headerStack);

  if (sectionKey === "plant-monograph") {
    const media = createEl("div", "skeleton-media skeleton-shimmer");
    media.style.borderRadius = "20px";
    media.style.marginBottom = "24px";
    band.appendChild(media);
    [
      "skeleton-line--lg",
      "skeleton-line--md",
      "skeleton-line--md",
      "skeleton-line--sm",
    ].forEach((cls) => {
      const line = createEl("div", `skeleton-line ${cls} skeleton-shimmer`);
      line.style.marginBottom = "12px";
      band.appendChild(line);
    });
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  if (sectionKey === "trivia") {
    const stack = createEl("div", "skeleton-stack");
    for (let i = 0; i < 4; i += 1) {
      const card = createEl("div", "skeleton-card skeleton-card--strip");
      card.appendChild(createEl("div", "skeleton-pill skeleton-shimmer"));
      const body = createEl("div", "skeleton-body");
      ["skeleton-line--lg", "skeleton-line--md", "skeleton-line--md"].forEach(
        (cls) =>
          body.appendChild(
            createEl("div", `skeleton-line ${cls} skeleton-shimmer`),
          ),
      );
      card.appendChild(body);
      card.appendChild(createEl("div", "skeleton-thumb skeleton-shimmer"));
      stack.appendChild(card);
    }
    band.appendChild(stack);
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  const useTwoCol =
    sectionKey === "taxonomy" ||
    sectionKey === "about" ||
    sectionKey === "directory-explorer" ||
    sectionKey === "taxonomy-explorer" ||
    sectionKey === "compare-workspace";
  const count =
    sectionKey === "featured-species" ||
    sectionKey === "highlights" ||
    sectionKey === "seasons-calendar"
      ? 3
      : sectionKey === "compare-workspace"
        ? 2
        : 4;
  const grid = createEl(
    "div",
    useTwoCol ? "skeleton-grid-2" : "skeleton-grid-3",
  );

  for (let i = 0; i < count; i += 1) {
    if (
      sectionKey === "featured-species" ||
      sectionKey === "directory-explorer"
    ) {
      const card = createEl("div", "skeleton-card skeleton-card--species");
      card.appendChild(createEl("div", "skeleton-media skeleton-shimmer"));
      const body = createEl("div", "skeleton-body");
      [
        "skeleton-line--xs",
        "skeleton-line--lg",
        "skeleton-line--sm",
        "skeleton-line--md",
      ].forEach((cls) =>
        body.appendChild(
          createEl("div", `skeleton-line ${cls} skeleton-shimmer`),
        ),
      );
      card.appendChild(body);
      grid.appendChild(card);
    } else {
      const card = createEl("div", "skeleton-card skeleton-card--panel");
      card.appendChild(
        createEl(
          "div",
          "skeleton-media skeleton-media--panel skeleton-shimmer",
        ),
      );
      card.appendChild(createEl("div", "skeleton-pill skeleton-shimmer"));
      card.appendChild(
        createEl("div", "skeleton-line skeleton-line--lg skeleton-shimmer"),
      );
      card.appendChild(
        createEl("div", "skeleton-line skeleton-line--md skeleton-shimmer"),
      );
      card.appendChild(
        createEl("div", "skeleton-line skeleton-line--sm skeleton-shimmer"),
      );
      grid.appendChild(card);
    }
  }

  band.appendChild(grid);
  fragment.appendChild(band);
  mountEl.replaceChildren(fragment);
}

/**
 * Renders section error fallback UI with retry action trigger.
 */
export function renderMountError(mountEl, sectionKey, errorMessage) {
  if (!mountEl) return;
  const band = createEl("div", "skeleton-section-band");
  const card = createEl("div", "section-error-card");
  card.setAttribute("role", "alert");

  card.appendChild(createEl("span", "section-error-badge", "Archive Notice"));
  card.appendChild(
    createEl("h3", "section-error-title", "Unable to Load Section Data"),
  );
  card.appendChild(
    createEl(
      "p",
      "section-error-message",
      errorMessage ||
        "An unexpected error occurred while loading this botanical dataset.",
    ),
  );

  const retryBtn = createEl("button", "section-retry-btn", "Retry Loading");
  retryBtn.type = "button";
  retryBtn.setAttribute("data-action", "retry-section");
  retryBtn.setAttribute("data-section-key", sectionKey);
  card.appendChild(retryBtn);

  band.appendChild(card);
  mountEl.replaceChildren(band);
}

/**
 * 1. Home Hero Banner Section (./data/pages/home.json)
 */
export function renderHeroSection(mountEl, { pageData }) {
  const hero = pageData?.hero;
  if (!mountEl || !hero) return;

  const wrapper = createEl("div", "home-hero");
  wrapper.id = hero.anchorId || "hero-search";

  if (hero.backdropImage?.imageUrl) {
    const backdrop = createEl("div", "hero-backdrop-media");
    backdrop.setAttribute("aria-hidden", "true");
    const bgImg = buildImageElement(
      hero.backdropImage.imageUrl,
      hero.backdropImage.imageAlt || "",
      "Plantipedia Botanical Canopy Backdrop",
      { eager: true },
    );
    bgImg.className = "hero-backdrop-img";
    backdrop.appendChild(bgImg);
    backdrop.appendChild(createEl("div", "hero-backdrop-scrim"));
    wrapper.appendChild(backdrop);
  }

  const inner = createEl("div", "home-hero-inner");
  inner.appendChild(createEl("span", "hero-kicker", hero.kicker));
  inner.appendChild(createEl("h1", "hero-headline", hero.headline));
  inner.appendChild(createEl("p", "hero-subcopy", hero.subcopy));

  const searchCfg = hero.search || {};
  const searchShell = createEl("div", "home-search-shell");
  const form = createEl("form", "home-search-form");
  form.id = "homeSearchForm";
  form.setAttribute("role", "search");
  form.appendChild(createSearchIconSvg(20, "home-search-icon"));

  const input = document.createElement("input");
  input.type = "search";
  input.id = "homeSearchInput";
  input.placeholder =
    searchCfg.placeholder ||
    "Search species by common name, scientific name, or family...";
  input.autocomplete = "off";
  input.setAttribute(
    "aria-label",
    searchCfg.ariaLabel || "Search botanical species",
  );

  const clearBtn = createEl(
    "button",
    "home-search-clear",
    searchCfg.clearLabel || "Clear",
  );
  clearBtn.type = "button";
  clearBtn.id = "homeSearchClear";
  clearBtn.hidden = true;

  const submitBtn = createEl(
    "button",
    "home-search-submit",
    searchCfg.submitLabel || "Search",
  );
  submitBtn.type = "submit";

  form.appendChild(input);
  form.appendChild(clearBtn);
  form.appendChild(submitBtn);

  const suggestions = createEl("div", "home-suggestions");
  suggestions.id = "homeSuggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.setAttribute(
    "aria-label",
    searchCfg.suggestionsLabel || "Matching plant species",
  );
  suggestions.hidden = true;

  searchShell.appendChild(form);
  searchShell.appendChild(suggestions);
  inner.appendChild(searchShell);

  if (Array.isArray(hero.summaryBadges) && hero.summaryBadges.length > 0) {
    const strip = createEl("div", "hero-summary-strip");
    hero.summaryBadges.forEach((badge, idx) => {
      if (idx > 0) {
        const sep = createEl("span", "hero-summary-sep", "•");
        sep.setAttribute("aria-hidden", "true");
        strip.appendChild(sep);
      }
      strip.appendChild(createEl("span", "", badge));
    });
    inner.appendChild(strip);
  }

  wrapper.appendChild(inner);
  mountEl.replaceChildren(wrapper);
}

/**
 * 2. Home About / Botanical Mission Section (./data/pages/home.json + ./data/catalog/species-index.json)
 */
export function renderAboutSection(mountEl, { pageData, catalog }) {
  const about = pageData?.about;
  if (!mountEl || !about) return;

  const wrapper = createEl("div", "overview-section");
  wrapper.id = about.anchorId || "about-plantipedia";

  const container = createEl("div", "section-container");
  const grid = createEl("div", "mission-grid");

  const copyCol = createEl("div", "mission-copy-col");
  copyCol.appendChild(createEl("span", "section-eyebrow", about.eyebrow));
  copyCol.appendChild(createEl("h2", "section-heading", about.heading));
  (about.paragraphs || []).forEach((text) => {
    copyCol.appendChild(createEl("p", "justified-prose", text));
  });

  const statsCol = createEl("div", "mission-stats-col");
  const catalogCount = Array.isArray(catalog) ? catalog.length : 0;

  (about.stats || []).forEach((stat) => {
    const card = createEl("article", "mission-stat-card");
    const displayVal =
      stat.dynamicCatalogCount && catalogCount > 0
        ? String(catalogCount)
        : stat.value;
    const numEl = createEl("span", "mission-stat-number", displayVal);
    if (stat.id) numEl.id = stat.id;

    const textWrap = document.createElement("div");
    textWrap.appendChild(createEl("h3", "mission-stat-title", stat.title));
    textWrap.appendChild(createEl("p", "mission-stat-desc", stat.description));

    card.appendChild(numEl);
    card.appendChild(textWrap);
    statsCol.appendChild(card);
  });

  grid.appendChild(copyCol);
  grid.appendChild(statsCol);
  container.appendChild(grid);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 3. Top 3 Curated Featured Species Section (./data/catalog/featured-species.json)
 */
export function renderFeaturedSpeciesSection(
  mountEl,
  { sectionData, catalog },
) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};
  const totalCatalogCount = Array.isArray(catalog) ? catalog.length : 0;
  const indexedTotal =
    totalCatalogCount > 0
      ? totalCatalogCount
      : meta.totalIndexedSpecies || items.length;

  const wrapper = createEl("div", "explorer-section");
  wrapper.id = meta.id || "featured-species";

  const container = createEl("div", "section-container");
  const header = createEl("div", "showcase-header");
  const headerText = document.createElement("div");
  headerText.appendChild(
    createEl(
      "span",
      "section-eyebrow",
      meta.eyebrow || "02. Flagship Archive Selection",
    ),
  );
  headerText.appendChild(
    createEl(
      "h2",
      "section-heading",
      meta.heading || "Top 3 Curated Featured Species",
    ),
  );

  const countEl = createEl(
    "p",
    "explorer-count",
    `Showing ${items.length} flagship monographs of ${indexedTotal} indexed species`,
  );
  countEl.id = "featuredCount";

  header.appendChild(headerText);
  header.appendChild(countEl);
  container.appendChild(header);

  const grid = createEl("div", "species-grid");
  grid.id = "featuredSpeciesGrid";
  grid.setAttribute("aria-live", "polite");
  items.forEach((plant) => {
    grid.appendChild(createSpeciesCardElement(plant, "Explore Monograph"));
  });
  container.appendChild(grid);

  if (meta.archiveCta) {
    const ctaWrap = createEl("div", "featured-cta-wrap");
    const ctaLink = createEl("a", "cta-glow-button");
    ctaLink.href = sanitizeUrl(meta.archiveCta.href, "./species/");
    ctaLink.appendChild(
      createEl(
        "span",
        "",
        meta.archiveCta.label || "Explore All Available Species",
      ),
    );
    const arrow = createEl("span", "cta-glow-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    ctaLink.appendChild(arrow);
    ctaWrap.appendChild(ctaLink);
    container.appendChild(ctaWrap);
  }

  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 4. Botanical Taxonomic Domains Section (./data/catalog/taxonomy.json)
 */
export function renderTaxonomySection(mountEl, { sectionData }) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};

  const wrapper = createEl("div", "domains-section");
  wrapper.id = "botanical-domains";

  const container = createEl("div", "section-container");
  const header = createEl("div", "domains-header");
  header.appendChild(
    createEl(
      "span",
      "section-eyebrow",
      meta.eyebrow || "03. Taxonomic Flora Realms",
    ),
  );
  header.appendChild(
    createEl(
      "h2",
      "section-heading",
      meta.heading || "Botanical Taxonomic Domains",
    ),
  );
  if (meta.description) {
    header.appendChild(
      createEl("p", "justified-prose domains-intro", meta.description),
    );
  }
  container.appendChild(header);

  const grid = createEl("div", "domains-grid");
  grid.id = "botanicalDomainsGrid";
  grid.setAttribute("aria-live", "polite");

  items.forEach((domain, idx) => {
    const fallbackHref = domain.category
      ? `./species/?category=${encodeURIComponent(domain.category)}`
      : "./species/";
    const cardLink = createEl("a", "domain-card");
    cardLink.href = sanitizeUrl(domain.href, fallbackHref);
    cardLink.setAttribute("data-domain-id", domain.id || "");

    if (domain.image?.imageUrl || domain.image?.url) {
      const mediaBox = createEl("div", "domain-card-media");
      mediaBox.style.aspectRatio = domain.image.aspectRatio || "16 / 9";
      const img = buildImageElement(
        domain.image.imageUrl || domain.image.url,
        domain.image.imageAlt || domain.image.alt || domain.title,
        domain.image.fallbackLabel || domain.title,
      );
      if (domain.image.photographer) {
        img.setAttribute("data-photographer", domain.image.photographer);
      }
      mediaBox.appendChild(img);
      cardLink.appendChild(mediaBox);
    }

    const content = createEl("div", "domain-card-content");
    content.appendChild(
      createEl("span", "highlight-index", String(idx + 1).padStart(2, "0")),
    );
    content.appendChild(createEl("h3", "domain-card-title", domain.title));
    content.appendChild(createEl("p", "domain-card-desc", domain.description));

    const cta = createEl("span", "domain-card-cta");
    cta.appendChild(createEl("span", "", domain.ctaLabel || "Browse Domain"));
    const arrow = createEl("span", "", "→");
    arrow.setAttribute("aria-hidden", "true");
    cta.appendChild(arrow);
    content.appendChild(cta);

    cardLink.appendChild(content);
    grid.appendChild(cardLink);
  });

  container.appendChild(grid);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 5. Botanical Curiosities — Did You Know? Section (./data/catalog/trivia.json)
 */
export function renderTriviaSection(mountEl, { sectionData }) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};

  const wrapper = createEl("div", "curiosities-section");
  wrapper.id = "did-you-know";

  const container = createEl("div", "section-container");
  const header = createEl("div", "curiosities-header");
  header.appendChild(
    createEl(
      "span",
      "section-eyebrow",
      meta.eyebrow || "04. Botanical Curiosities",
    ),
  );
  header.appendChild(
    createEl("h2", "section-heading", meta.heading || "Did You Know?"),
  );
  if (meta.description) {
    header.appendChild(
      createEl("p", "justified-prose curiosities-intro", meta.description),
    );
  }
  container.appendChild(header);

  const list = createEl("div", "curiosities-list");
  list.id = "curiositiesList";
  list.setAttribute("aria-live", "polite");

  items.forEach((item, idx) => {
    const strip = createEl("article", "curiosity-strip");
    strip.setAttribute("data-trivia-id", item.id || "");

    const num = createEl(
      "span",
      "curiosity-num",
      String(idx + 1).padStart(2, "0"),
    );
    num.setAttribute("aria-hidden", "true");
    strip.appendChild(num);

    const body = createEl("div", "curiosity-body");
    const titleRow = createEl("div", "curiosity-title-row");
    titleRow.appendChild(createEl("h3", "curiosity-title", item.title));

    const fallbackHref = item.speciesSlug
      ? `./plant/?species=${encodeURIComponent(item.speciesSlug)}`
      : "./species/";
    const taxonLink = createEl("a", "curiosity-taxon");
    taxonLink.href = sanitizeUrl(item.href, fallbackHref);
    taxonLink.appendChild(createEl("span", "", item.taxonLabel));
    const arrow = createEl("span", "", " →");
    arrow.setAttribute("aria-hidden", "true");
    taxonLink.appendChild(arrow);

    titleRow.appendChild(taxonLink);
    body.appendChild(titleRow);
    body.appendChild(createEl("p", "curiosity-desc", item.description));
    strip.appendChild(body);

    if (item.image?.imageUrl || item.image?.url) {
      const mediaBox = createEl("div", "curiosity-media");
      mediaBox.style.aspectRatio = item.image.aspectRatio || "4 / 3";
      const img = buildImageElement(
        item.image.imageUrl || item.image.url,
        item.image.imageAlt || item.image.alt || item.taxonLabel || item.title,
        item.image.fallbackLabel || item.taxonLabel || item.title,
      );
      if (item.image.photographer) {
        img.setAttribute("data-photographer", item.image.photographer);
      }
      mediaBox.appendChild(img);
      strip.appendChild(mediaBox);
    }

    list.appendChild(strip);
  });

  container.appendChild(list);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 6. Botanical Highlights & Stewardship Principles Section (./data/catalog/highlights.json)
 */
export function renderHighlightsSection(mountEl, { sectionData }) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};

  const wrapper = createEl("div", "highlights-section");
  wrapper.id = "botanical-highlights";

  const container = createEl("div", "section-container");
  const header = createEl("div", "highlights-header");
  header.appendChild(
    createEl(
      "span",
      "section-eyebrow",
      meta.eyebrow || "05. Field Notes & Ecology",
    ),
  );
  header.appendChild(
    createEl(
      "h2",
      "section-heading",
      meta.heading || "Botanical Highlights & Stewardship Principles",
    ),
  );
  container.appendChild(header);

  const grid = createEl("div", "highlights-grid");
  grid.id = "botanicalHighlightsGrid";
  grid.setAttribute("aria-live", "polite");

  items.forEach((item, idx) => {
    const card = createEl("article", "highlight-card");
    card.setAttribute("data-highlight-id", item.id || "");

    if (item.image?.imageUrl || item.image?.url) {
      const mediaBox = createEl("div", "highlight-card-media");
      mediaBox.style.aspectRatio = item.image.aspectRatio || "16 / 10";
      const img = buildImageElement(
        item.image.imageUrl || item.image.url,
        item.image.imageAlt || item.image.alt || item.title,
        item.image.fallbackLabel || item.title,
      );
      if (item.image.photographer) {
        img.setAttribute("data-photographer", item.image.photographer);
      }
      mediaBox.appendChild(img);
      card.appendChild(mediaBox);
    }

    const content = createEl("div", "highlight-card-content");
    content.appendChild(
      createEl("span", "highlight-index", String(idx + 1).padStart(2, "0")),
    );
    content.appendChild(createEl("h3", "highlight-title", item.title));
    content.appendChild(createEl("p", "justified-prose", item.description));

    card.appendChild(content);
    grid.appendChild(card);
  });

  container.appendChild(grid);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * Safely populates live search suggestion dropdowns using DocumentFragment & textContent.
 */
export function renderSearchSuggestionNodes(
  container,
  matches,
  emptyQuery,
  itemVariant,
) {
  if (!container) return;
  const fragment = document.createDocumentFragment();

  if (matches.length === 0) {
    const emptyEl = createEl(
      "div",
      itemVariant === "home" ? "suggestion-row" : "nav-suggestion-empty",
    );
    if (itemVariant === "home") {
      emptyEl.appendChild(
        createEl("span", "", `No matching species found for "${emptyQuery}"`),
      );
    } else {
      emptyEl.textContent = `No species matched "${emptyQuery}"`;
    }
    fragment.appendChild(emptyEl);
    container.replaceChildren(fragment);
    container.hidden = false;
    return;
  }

  matches.forEach((plant, idx) => {
    const link = document.createElement("a");
    link.href = resolveRootPath(
      `./plant/?species=${encodeURIComponent(plant.slug)}`,
    );
    link.setAttribute("role", "option");

    const commonLabel = plant.commonNameBn
      ? `${plant.commonName} (${plant.commonNameBn})`
      : plant.commonName;

    if (itemVariant === "home") {
      link.className = "suggestion-row";
      const leftWrap = createEl("div", "suggestion-left-wrap");
      const thumb = buildImageElement(
        plant.thumbnailUrl || plant.image?.imageUrl,
        plant.commonName,
        plant.commonName,
      );
      thumb.className = "suggestion-thumb";
      const left = document.createElement("div");
      left.appendChild(createEl("span", "suggestion-main", commonLabel));
      left.appendChild(
        createEl("span", "suggestion-sci", plant.scientificName),
      );
      leftWrap.appendChild(thumb);
      leftWrap.appendChild(left);
      link.appendChild(leftWrap);
      link.appendChild(
        createEl(
          "span",
          "suggestion-family",
          plant.overview?.family || plant.family || "",
        ),
      );
    } else {
      link.className = "nav-suggestion-item";
      link.setAttribute("data-nav-idx", String(idx));
      const leftWrap = createEl("div", "nav-suggestion-left");
      const thumb = buildImageElement(
        plant.thumbnailUrl || plant.image?.imageUrl,
        plant.commonName,
        plant.commonName,
      );
      thumb.className = "nav-suggestion-thumb";
      const left = document.createElement("div");
      left.appendChild(createEl("span", "nav-suggestion-title", commonLabel));
      left.appendChild(
        createEl("span", "nav-suggestion-sci", plant.scientificName),
      );
      leftWrap.appendChild(thumb);
      leftWrap.appendChild(left);
      link.appendChild(leftWrap);
      link.appendChild(
        createEl(
          "span",
          "nav-suggestion-family",
          plant.overview?.family || plant.family || "",
        ),
      );
    }

    fragment.appendChild(link);
  });

  container.replaceChildren(fragment);
  container.hidden = false;
}
