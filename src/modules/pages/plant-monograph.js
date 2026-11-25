/**
 * Plant Monograph Detail Page Renderer & Scholarly Tools Controller (/plant/)
 * - Renders active species from on-demand ./data/species/<slug>.json
 * - Digital Herbarium Specimen Plate Frame (Chapter 00) with SPECIMEN ID & corner registration ticks
 * - Herbarium Bookmark Toggle + Export Field Sheet (PDF) print action
 * - Visual Cultivation Telemetry Meters (Chapter 07)
 * - Institutional Citation Generator (APA | MLA | BibTeX)
 * - Interactive Botanical Glossary Auto-Tooltips (./data/catalog/glossary.json)
 */

import {
  buildImageElement,
  createCloseIconSvg,
  createEl,
  createSpeciesCardElement,
  sanitizeUrl,
} from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { applyPlantMonographSeo } from "../utils/seo.js";
import { createBookmarkButton } from "../utils/herbarium.js";
import { renderSpecimenNotFoundCard } from "../../core/compilers/specimen-not-found.js";
import { renderCultivationTelemetry } from "../../core/telemetry/telemetry-meters.js";
import { renderCitationGenerator } from "../../engines/citation/citation-generator.js";
import { applyGlossaryTooltips } from "../../engines/citation/glossary-tooltips.js";
import {
  createTelemetryStatsGrid,
  extractPlantTelemetryStats,
} from "../../core/telemetry/telemetry-stats.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function createSectionMapIconSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const poly = document.createElementNS(SVG_NS, "polygon");
  poly.setAttribute("points", "3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21");
  const l1 = document.createElementNS(SVG_NS, "line");
  l1.setAttribute("x1", "9");
  l1.setAttribute("y1", "3");
  l1.setAttribute("x2", "9");
  l1.setAttribute("y2", "18");
  const l2 = document.createElementNS(SVG_NS, "line");
  l2.setAttribute("x1", "15");
  l2.setAttribute("y1", "6");
  l2.setAttribute("x2", "15");
  l2.setAttribute("y2", "21");

  svg.appendChild(poly);
  svg.appendChild(l1);
  svg.appendChild(l2);
  return svg;
}

function createPrintIconSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const p1 = document.createElementNS(SVG_NS, "polyline");
  p1.setAttribute("points", "6 9 6 2 18 2 18 9");
  const p2 = document.createElementNS(SVG_NS, "path");
  p2.setAttribute("d", "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2");
  const r = document.createElementNS(SVG_NS, "rect");
  r.setAttribute("x", "6");
  r.setAttribute("y", "14");
  r.setAttribute("width", "12");
  r.setAttribute("height", "8");

  svg.appendChild(p1);
  svg.appendChild(p2);
  svg.appendChild(r);
  return svg;
}

function createCompareIconSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const topLine = document.createElementNS(SVG_NS, "path");
  topLine.setAttribute("d", "M4 8h15");
  const topArrow = document.createElementNS(SVG_NS, "polyline");
  topArrow.setAttribute("points", "15 4 19 8 15 12");
  const botLine = document.createElementNS(SVG_NS, "path");
  botLine.setAttribute("d", "M20 16H5");
  const botArrow = document.createElementNS(SVG_NS, "polyline");
  botArrow.setAttribute("points", "9 12 5 16 9 20");

  svg.appendChild(topLine);
  svg.appendChild(topArrow);
  svg.appendChild(botLine);
  svg.appendChild(botArrow);
  return svg;
}

function mountFloatingCompareButton(plant, isEmbed) {
  const existing = document.getElementById("plant-floating-compare");
  if (existing) existing.remove();

  if (!plant || isEmbed) return;

  let compareTarget = "";
  if (plant.isGlobalLive) {
    const queryVal = (plant.query || plant.commonName || "").trim();
    if (!queryVal) return;
    compareTarget = `./compare/?leftGlobal=${encodeURIComponent(queryVal)}`;
  } else {
    const urlSpecies = new URLSearchParams(window.location.search).get("species");
    const currentSpeciesSlug = (urlSpecies || plant.slug || "").trim();
    if (!currentSpeciesSlug) return;
    compareTarget = `./compare/?left=${encodeURIComponent(currentSpeciesSlug)}`;
  }

  const compareLink = document.createElement("a");
  compareLink.id = "plant-floating-compare";
  compareLink.className = "plant-floating-compare-btn";
  compareLink.href = resolveRootPath(compareTarget);
  compareLink.setAttribute(
    "aria-label",
    `Compare ${plant.commonName} side-by-side with another species`,
  );
  compareLink.title = `Compare ${plant.commonName} side-by-side`;

  compareLink.appendChild(createCompareIconSvg());
  compareLink.appendChild(createEl("span", "", "Compare"));

  document.body.appendChild(compareLink);
}

function buildFigureElement(fig, figCode, className) {
  const figure = createEl("figure", className);
  const mediaBox = createEl("div", "figure-media-box");
  mediaBox.appendChild(
    buildImageElement(
      fig.url || fig.imageUrl,
      fig.alt || fig.caption || "",
      fig.caption || fig.alt || "Botanical Illustration Plate",
    ),
  );
  figure.appendChild(mediaBox);

  const caption = document.createElement("figcaption");
  caption.appendChild(createEl("span", "figcaption-fig", figCode));
  caption.appendChild(document.createTextNode(fig.caption || ""));
  figure.appendChild(caption);
  return figure;
}

function renderTextbookChapter(section, plant, monographCfg) {
  const safetyTitle = monographCfg.safetyTitle;
  const article = createEl("article", "chapter-card");
  article.id = `section-${section.number}`;

  const header = createEl("header", "chapter-header");
  const titleGroup = createEl("div", "chapter-title-group");
  titleGroup.appendChild(createEl("span", "chapter-num", section.number));
  titleGroup.appendChild(createEl("h2", "chapter-title", section.title));
  header.appendChild(titleGroup);
  header.appendChild(createEl("span", "chapter-subtitle", section.subtitle || ""));
  article.appendChild(header);

  const body = createEl("div", "chapter-body");
  const images = Array.isArray(section.images) ? section.images : [];
  const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];

  const createSafetyNotice = () => {
    if (!section.safetyNote) return null;
    const notice = createEl("div", "safety-notice-box");
    notice.setAttribute("role", "note");
    notice.appendChild(
      createEl(
        "span",
        "safety-notice-title",
        safetyTitle || "Botanical & Clinical Safety Advisory",
      ),
    );
    notice.appendChild(document.createTextNode(section.safetyNote));
    return notice;
  };

  const createSubblocks = () => {
    if (!Array.isArray(section.subblocks) || section.subblocks.length === 0) {
      return null;
    }
    const wrap = createEl("div", "chapter-subblocks");
    section.subblocks.forEach((sub) => {
      const item = createEl("div", "subblock-item");
      item.appendChild(createEl("h4", "", sub.heading));
      item.appendChild(createEl("p", "", sub.text));
      wrap.appendChild(item);
    });
    return wrap;
  };

  if (images.length === 1) {
    const splitGrid = createEl("div", "chapter-split-grid");
    const proseCol = createEl("div", "chapter-prose-col");
    paragraphs.forEach((p) => {
      const pEl = createEl("p", "", p);
      pEl.dataset.secNum = section.number;
      proseCol.appendChild(pEl);
    });
    const safetyEl = createSafetyNotice();
    if (safetyEl) proseCol.appendChild(safetyEl);

    splitGrid.appendChild(proseCol);
    splitGrid.appendChild(
      buildFigureElement(
        images[0],
        `Fig. ${section.number}.1`,
        "chapter-figure-single",
      ),
    );
    body.appendChild(splitGrid);

    const subblocks = createSubblocks();
    if (subblocks) body.appendChild(subblocks);
  } else if (images.length >= 2) {
    paragraphs.forEach((p) => {
      const pEl = createEl("p", "", p);
      pEl.dataset.secNum = section.number;
      body.appendChild(pEl);
    });

    const gallery = createEl("div", "chapter-gallery-two");
    images.forEach((img, idx) => {
      gallery.appendChild(
        buildFigureElement(img, `Fig. ${section.number}.${idx + 1}`, "gallery-figure"),
      );
    });
    body.appendChild(gallery);

    const subblocks = createSubblocks();
    if (subblocks) body.appendChild(subblocks);
    const safetyEl = createSafetyNotice();
    if (safetyEl) body.appendChild(safetyEl);
  } else {
    paragraphs.forEach((p) => {
      const pEl = createEl("p", "", p);
      pEl.dataset.secNum = section.number;
      body.appendChild(pEl);
    });
    const subblocks = createSubblocks();
    if (subblocks) body.appendChild(subblocks);
    const safetyEl = createSafetyNotice();
    if (safetyEl) body.appendChild(safetyEl);
  }

  // Chapter 07: Visual Cultivation & Ecological Telemetry Meters
  if (section.number === "07") {
    body.appendChild(renderCultivationTelemetry(plant, monographCfg.telemetry));
  }

  article.appendChild(body);
  return article;
}

function mountAndBindSectionMap(sectionMapCfg, plant) {
  const mount = document.querySelector('[data-section="section-map"]');
  if (!mount) return;

  if (!plant) {
    mount.replaceChildren();
    return;
  }

  const descriptions = sectionMapCfg.descriptions || {};

  const dock = createEl("div", "section-map-dock");
  dock.id = "sectionMapDock";

  const trigger = createEl("button", "section-map-pill");
  trigger.type = "button";
  trigger.id = "sectionMapTrigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "sectionMapOverlay");
  trigger.appendChild(createSectionMapIconSvg());
  trigger.appendChild(createEl("span", "", sectionMapCfg.pillLabel || "Section Map"));
  dock.appendChild(trigger);

  const overlay = createEl("div", "section-map-overlay");
  overlay.id = "sectionMapOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "sectionMapHeading");
  overlay.hidden = true;

  const stickyHeader = createEl("div", "section-map-sticky-header");
  const headerInner = createEl("div", "section-map-header-inner");

  const headerText = document.createElement("div");
  const speciesLabel = createEl(
    "span",
    "section-map-kicker",
    `${plant.commonName} (${plant.scientificName})`,
  );
  speciesLabel.id = "sectionMapSpeciesLabel";
  const heading = createEl(
    "h2",
    "section-map-title",
    sectionMapCfg.heading || "JUMP TO SECTION",
  );
  heading.id = "sectionMapHeading";
  headerText.appendChild(speciesLabel);
  headerText.appendChild(heading);

  const closeBtn = createEl("button", "section-map-close");
  closeBtn.type = "button";
  closeBtn.id = "sectionMapClose";
  closeBtn.setAttribute("aria-label", sectionMapCfg.closeLabel || "Close section map");
  closeBtn.appendChild(createCloseIconSvg(20));

  headerInner.appendChild(headerText);
  headerInner.appendChild(closeBtn);
  stickyHeader.appendChild(headerInner);

  const overlayBody = createEl("div", "section-map-body");
  const grid = createEl("div", "section-map-grid");
  grid.id = "sectionMapGrid";

  const mapItems = [
    {
      number: "00",
      title: sectionMapCfg.overviewTitle || "Hero & Botanical Classification",
      desc: descriptions["00"] || "",
      targetId: "section-00",
    },
    ...(plant.sections || []).map((sec) => ({
      number: sec.number,
      title: sec.title,
      desc: sec.summary || descriptions[sec.number] || sec.subtitle || "",
      targetId: `section-${sec.number}`,
    })),
  ];

  mapItems.forEach((item) => {
    const cardBtn = createEl("button", "section-map-card");
    cardBtn.type = "button";
    cardBtn.setAttribute("data-jump-target", item.targetId);

    const cardTop = createEl("div", "section-map-card-top");
    cardTop.appendChild(createEl("span", "section-map-badge", item.number));
    const arrow = createEl("span", "section-map-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    cardTop.appendChild(arrow);

    const textBlock = document.createElement("div");
    textBlock.appendChild(createEl("h3", "section-map-card-title", item.title));
    textBlock.appendChild(createEl("p", "section-map-card-desc", item.desc));

    cardBtn.appendChild(cardTop);
    cardBtn.appendChild(textBlock);
    grid.appendChild(cardBtn);
  });

  overlayBody.appendChild(grid);
  overlay.appendChild(stickyHeader);
  overlay.appendChild(overlayBody);

  const frag = document.createDocumentFragment();
  frag.appendChild(dock);
  frag.appendChild(overlay);
  mount.replaceChildren(frag);

  const openOverlay = () => {
    overlay.hidden = false;
    document.body.classList.add("overlay-locked");
    trigger.setAttribute("aria-expanded", "true");
    closeBtn.focus();
  };

  const closeOverlay = () => {
    overlay.hidden = true;
    document.body.classList.remove("overlay-locked");
    trigger.setAttribute("aria-expanded", "false");
  };

  trigger.addEventListener("click", openOverlay);
  closeBtn.addEventListener("click", () => {
    closeOverlay();
    trigger.focus();
  });

  overlay.addEventListener("click", (e) => {
    const card = e.target.closest("[data-jump-target]");
    if (card) {
      const targetId = card.getAttribute("data-jump-target");
      closeOverlay();
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (e.target === overlay) {
      closeOverlay();
      trigger.focus();
    }
  });

  if (!window.__plantipediaSectionMapEscBound) {
    window.__plantipediaSectionMapEscBound = true;
    document.addEventListener("keydown", (e) => {
      const ov = document.getElementById("sectionMapOverlay");
      const tg = document.getElementById("sectionMapTrigger");
      if (e.key === "Escape" && ov && !ov.hidden) {
        ov.hidden = true;
        document.body.classList.remove("overlay-locked");
        if (tg) {
          tg.setAttribute("aria-expanded", "false");
          tg.focus();
        }
      }
    });
  }
}

function getRelatedSpecies(plant, indexList) {
  if (!plant || !Array.isArray(indexList)) return [];
  const family = plant.overview?.family || plant.family || "";
  return indexList
    .filter((entry) => entry.slug !== plant.slug)
    .map((entry) => {
      let score = 0;
      if (entry.category === plant.category) score += 2;
      if (entry.family && entry.family === family) score += 3;
      if (
        Array.isArray(entry.categories) &&
        entry.categories.includes(plant.category)
      ) {
        score += 1;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.entry);
}

function buildSpecimenPlateFigure(plant, plateCfg = {}) {
  const meta = plant.specimenMetadata || {};
  const ov = plant.overview || {};
  const specimenId = plant.specimenId || meta.specimenId || "PLT-BD-001";
  const rank = meta.taxonRank || "Species";
  const zone = meta.collectionZone || ov.nativeOrigin || "Global Flora";
  const photographer = meta.photographer || "Pexels Botanical Archive Contributor";

  const figure = createEl("figure", "overview-hero-figure herbarium-specimen-plate");

  // Top specimen registration bar
  const plateTop = createEl("div", "specimen-plate-topbar");
  plateTop.appendChild(
    createEl(
      "span",
      "specimen-plate-id",
      `SPECIMEN ID: ${specimenId}`,
    ),
  );
  plateTop.appendChild(
    createEl(
      "span",
      "specimen-plate-rank",
      `${plateCfg.rankLabel || "Rank"}: ${rank}`,
    ),
  );
  figure.appendChild(plateTop);

  // Media box with 4 corner registration ticks
  const heroMedia = createEl("div", "overview-hero-media specimen-plate-media");
  ["tl", "tr", "bl", "br"].forEach((corner) => {
    const tick = createEl("span", `plate-corner-tick is-${corner}`);
    tick.setAttribute("aria-hidden", "true");
    heroMedia.appendChild(tick);
  });

  heroMedia.appendChild(
    buildImageElement(
      plant.heroImage?.url,
      plant.heroImage?.alt || plant.commonName,
      `${plant.commonName} Botanical Plate`,
      { eager: true },
    ),
  );

  // Bottom native biogeographic zone overlay
  const zoneBadge = createEl("div", "specimen-plate-zone");
  zoneBadge.appendChild(
    createEl(
      "span",
      "specimen-zone-label",
      `${plateCfg.originLabel || "Biogeographic Origin"}: ${zone}`,
    ),
  );
  heroMedia.appendChild(zoneBadge);

  figure.appendChild(heroMedia);

  // Attribution & caption bar beneath the plate
  const footer = createEl("figcaption", "specimen-plate-caption");
  footer.appendChild(
    createEl(
      "span",
      "specimen-plate-caption-text",
      `${plant.heroImage?.caption || ""}`,
    ),
  );
  footer.appendChild(
    createEl(
      "span",
      "specimen-plate-attribution",
      `${plateCfg.attributionPrefix || "Photographic Plate"}: ${photographer} · ${meta.archiveCollection || "Plantipedia Digital Herbarium"}`,
    ),
  );
  figure.appendChild(footer);

  return figure;
}

export function renderPlantMonograph(
  mountEl,
  { pageData, speciesIndex, plant, requestedSlug, glossaryData },
) {
  if (!mountEl || !pageData) return;

  const isEmbed =
    new URLSearchParams(window.location.search).get("embed") === "true" ||
    document.body.classList.contains("is-embed");
  const indexList = Array.isArray(speciesIndex) ? speciesIndex : [];
  const monographCfg = pageData.monograph || {};
  const sectionMapCfg = pageData.sectionMap || {};

  if (!plant) {
    mountFloatingCompareButton(null, isEmbed);
    renderSpecimenNotFoundCard(mountEl, {
      speciesIndex: indexList,
      requestedSlug,
      isEmbed,
    });
    mountAndBindSectionMap(sectionMapCfg, null);
    return;
  }

  try {
    applyPlantMonographSeo(plant);
  } catch {
    // Non-blocking: SEO metadata failures must never abort monograph hydration
  }

  const isGlobalLive = Boolean(plant.isGlobalLive);
  const plantIdx = !isGlobalLive && plant.slug
    ? indexList.findIndex((p) => p.slug === plant.slug)
    : -1;
  const hasNeighbors = indexList.length > 1 && plantIdx !== -1;
  const prevPlant = hasNeighbors
    ? indexList[(plantIdx - 1 + indexList.length) % indexList.length]
    : null;
  const nextPlant = hasNeighbors
    ? indexList[(plantIdx + 1) % indexList.length]
    : null;

  const ov = plant.overview || {};
  const labels = monographCfg.tableLabels || {};
  const categoryHref = isGlobalLive
    ? resolveRootPath("./plant/live/")
    : resolveRootPath(`./species/?category=${encodeURIComponent(plant.category || "")}`);

  const detailContainer = createEl("div", "detail-container");

  // 1. Breadcrumb & taxonomy trail
  const breadcrumbRow = createEl("div", "detail-breadcrumb-row");
  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  const ol = createEl("ol", "breadcrumb-list");

  const crumbs = [
    {
      label: monographCfg.homeLabel || "Home",
      href: sanitizeUrl(monographCfg.homeHref, "./"),
    },
    {
      label: monographCfg.directoryLabel || "Available Species",
      href: sanitizeUrl(monographCfg.directoryHref, "./species/"),
    },
    {
      label: isGlobalLive ? "Global Flora Index" : (plant.category || "Flora"),
      href: categoryHref,
    },
    { label: plant.commonName, current: true },
  ];

  crumbs.forEach((c, idx) => {
    const li = createEl("li", "breadcrumb-item");
    if (idx > 0) {
      const sep = createEl("span", "breadcrumb-sep", "/");
      sep.setAttribute("aria-hidden", "true");
      li.appendChild(sep);
    }
    if (c.current) {
      const curr = createEl("span", "breadcrumb-current", c.label);
      curr.setAttribute("aria-current", "page");
      li.appendChild(curr);
    } else {
      const a = createEl("a", "breadcrumb-link", c.label);
      a.href = c.href;
      if (isEmbed) a.target = "_top";
      li.appendChild(a);
    }
    ol.appendChild(li);
  });
  breadcrumbNav.appendChild(ol);

  const trail = createEl("div", "detail-taxonomy-trail");
  trail.appendChild(document.createTextNode(`${ov.family || "Plantae"} · `));
  const sciEm = createEl("em", "", plant.scientificName);
  trail.appendChild(sciEm);

  breadcrumbRow.appendChild(breadcrumbNav);
  breadcrumbRow.appendChild(trail);
  detailContainer.appendChild(breadcrumbRow);

  // 2. Section 00: Hero Overview Card, Scholarly Actions & Digital Herbarium Specimen Plate
  const heroCard = createEl("section", "overview-hero-card");
  heroCard.id = "section-00";

  const headerGrid = createEl("div", "overview-header-grid");
  const titleBlock = createEl("div", "overview-title-block");
  if (isGlobalLive) {
    const badgeRow = createEl("div", "monograph-source-row");
    badgeRow.appendChild(
      createEl(
        "span",
        "section-index-label",
        "SECTION 00 · GLOBAL BOTANICAL SERVER",
      ),
    );
    badgeRow.appendChild(
      createEl("span", "global-flora-badge", plant.sourceBadge || "GLOBAL FLORA INDEX"),
    );
    titleBlock.appendChild(badgeRow);
  } else {
    titleBlock.appendChild(
      createEl(
        "span",
        "section-index-label",
        monographCfg.profileLabel || "SECTION 00 · BOTANICAL PROFILE",
      ),
    );
  }
  titleBlock.appendChild(createEl("h1", "overview-plant-title", plant.commonName));

  const sciLabel = plant.localName
    ? `${plant.scientificName} · ${plant.localName}`
    : plant.commonNameBn
      ? `${plant.scientificName} · ${plant.commonNameBn}`
      : plant.scientificName;
  titleBlock.appendChild(createEl("p", "overview-scientific-name", sciLabel));

  // Header Action Bar: Bookmark + Export Field Sheet (PDF) + Compare
  const actionBar = createEl("div", "monograph-header-actions");
  if (!isGlobalLive && plant.slug) {
    actionBar.appendChild(createBookmarkButton(plant, "monograph"));
  }

  const compareHref = isGlobalLive
    ? resolveRootPath(`./compare/?leftGlobal=${encodeURIComponent(plant.query || plant.commonName || "")}`)
    : resolveRootPath(`./compare/?left=${encodeURIComponent(plant.slug || "")}`);
  const compareBtn = createEl("a", "monograph-action-btn monograph-compare-btn");
  compareBtn.href = compareHref;
  if (isEmbed) compareBtn.target = "_top";
  compareBtn.appendChild(createCompareIconSvg());
  compareBtn.appendChild(createEl("span", "", "Compare This Species"));
  actionBar.appendChild(compareBtn);

  const printBtn = createEl("button", "monograph-action-btn monograph-print-btn");
  printBtn.type = "button";
  printBtn.appendChild(createPrintIconSvg());
  printBtn.appendChild(
    createEl("span", "", monographCfg.printButtonLabel || "Export Field Sheet (PDF)"),
  );
  printBtn.addEventListener("click", () => {
    window.print();
  });
  actionBar.appendChild(printBtn);
  titleBlock.appendChild(actionBar);

  const leadEl = createEl("p", "overview-lead-summary", plant.leadOverview);
  leadEl.dataset.secNum = "00";
  titleBlock.appendChild(leadEl);

  const heroFigure = buildSpecimenPlateFigure(plant, monographCfg.specimenPlate);

  headerGrid.appendChild(titleBlock);
  headerGrid.appendChild(heroFigure);
  heroCard.appendChild(headerGrid);

  const tableWrap = createEl("div", "classification-table-wrap");
  tableWrap.appendChild(
    createEl(
      "div",
      "classification-table-caption",
      monographCfg.tableCaption || "Botanical Classification & Taxonomic Summary",
    ),
  );

  const tableGrid = createEl("div", "classification-table");
  tableGrid.setAttribute("role", "table");
  tableGrid.setAttribute("aria-label", "Botanical Classification Table");

  const overviewRows = [
    { key: labels.scientificName || "Scientific Name", val: plant.scientificName, italic: true },
    { key: labels.plantGroup || "Plant Group", val: ov.plantGroup, italic: false },
    {
      key: labels.family || "Plant Family",
      val: plant.familyBn ? `${ov.family} · ${plant.familyBn}` : ov.family,
      italic: false,
    },
    { key: labels.genus || "Genus", val: ov.genus, italic: true },
    { key: labels.species || "Species", val: ov.species, italic: true },
    { key: labels.growthForm || "Growth Form", val: ov.growthForm, italic: false },
    { key: labels.nativeOrigin || "Native Origin", val: ov.nativeOrigin, italic: false },
    { key: labels.commonUses || "Common Uses", val: ov.commonUses, italic: false },
  ];

  overviewRows.forEach((row) => {
    const rowEl = createEl("div", "classification-row");
    rowEl.appendChild(createEl("span", "classification-key", row.key));
    rowEl.appendChild(
      createEl(
        "span",
        `classification-val${row.italic ? " is-italic" : ""}`,
        row.val || "",
      ),
    );
    tableGrid.appendChild(rowEl);
  });

  tableWrap.appendChild(tableGrid);
  heroCard.appendChild(tableWrap);
  detailContainer.appendChild(heroCard);

  // 2b. Dynamic Species-Specific Botanical Telemetry Grid (GSAP ScrollTrigger)
  const plantStats = extractPlantTelemetryStats(plant);
  if (plantStats.length > 0) {
    const telemetryBand = createEl("section", "monograph-telemetry-band");
    telemetryBand.setAttribute(
      "aria-label",
      `${plant.commonName} key botanical telemetry metrics`,
    );
    telemetryBand.appendChild(
      createTelemetryStatsGrid(plantStats, {
        ariaLabel: `${plant.commonName} botanical telemetry metrics`,
        sectionId: "monographTelemetryGrid",
      }),
    );
    detailContainer.appendChild(telemetryBand);
  }

  // 3. Chapters 01–07
  const chaptersWrap = createEl("div", "encyclopedia-chapters");
  (plant.sections || []).forEach((sec) => {
    chaptersWrap.appendChild(renderTextbookChapter(sec, plant, monographCfg));
  });
  detailContainer.appendChild(chaptersWrap);

  // 4. Institutional Academic Citation Generator (APA, MLA, BibTeX)
  detailContainer.appendChild(
    renderCitationGenerator(plant, monographCfg.citation),
  );

  // 5. Related Species Strip (powered by species-index.json)
  const related = getRelatedSpecies(plant, indexList);
  if (related.length > 0) {
    const relatedSection = createEl("section", "related-species-section");
    relatedSection.setAttribute("aria-label", "Related botanical species");
    relatedSection.appendChild(
      createEl("span", "section-eyebrow", "Taxonomic Neighbors"),
    );
    relatedSection.appendChild(
      createEl("h2", "related-species-heading", "Related Species Monographs"),
    );
    const relatedGrid = createEl("div", "species-grid species-grid--directory");
    related.forEach((item) => {
      const card = createSpeciesCardElement(item, "Explore Monograph");
      if (isEmbed && item.slug) {
        card.href = resolveRootPath(
          `./plant/?species=${encodeURIComponent(item.slug)}&embed=true`,
        );
      }
      relatedGrid.appendChild(card);
    });
    relatedSection.appendChild(relatedGrid);
    detailContainer.appendChild(relatedSection);
  }

  // 6. Previous / Next Pager (powered by species-index.json)
  if (prevPlant && nextPlant) {
    const pagerNav = createEl("nav", "species-pager");
    pagerNav.setAttribute("aria-label", "Adjacent plant species");

    const makePagerLink = (targetPlant, directionClass, directionLabel) => {
      const a = createEl("a", `pager-link ${directionClass}`);
      a.href = resolveRootPath(
        `./plant/?species=${encodeURIComponent(targetPlant.slug)}${isEmbed ? "&embed=true" : ""}`,
      );
      a.appendChild(createEl("span", "pager-direction", directionLabel));
      a.appendChild(
        createEl(
          "span",
          "pager-species-name",
          targetPlant.commonNameBn
            ? `${targetPlant.commonName} (${targetPlant.commonNameBn})`
            : targetPlant.commonName,
        ),
      );
      a.appendChild(
        createEl("span", "pager-species-sci", targetPlant.scientificName),
      );
      return a;
    };

    pagerNav.appendChild(
      makePagerLink(
        prevPlant,
        "prev",
        monographCfg.previousLabel || "← Previous Monograph",
      ),
    );
    pagerNav.appendChild(
      makePagerLink(
        nextPlant,
        "next",
        monographCfg.nextLabel || "Next Monograph →",
      ),
    );
    detailContainer.appendChild(pagerNav);
  }

  mountEl.replaceChildren(detailContainer);
  mountAndBindSectionMap(sectionMapCfg, plant);
  mountFloatingCompareButton(plant, isEmbed);

  // 7. Apply Botanical Glossary Auto-Tooltips across prose
  if (glossaryData) {
    try {
      applyGlossaryTooltips(detailContainer, glossaryData);
    } catch {
      // Non-blocking enhancement
    }
  }
}
