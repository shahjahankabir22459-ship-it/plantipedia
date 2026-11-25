/**
 * Dedicated "Digital Botanical Research Suite & Services" Page (/services/)
 * 10 Interactive Sections built 100% natively with XSS-safe DOM builders & custom SVG analytics:
 *  01. Visual Hero & Live Archive Telemetry
 *  02. Interactive Filterable Platform Comparison Table
 *  03. Live Data Visualization & Interactive Charts (Category Distribution + 6-Season Curve)
 *  04. Core Digital Toolkit Showcase (2x2 Grid)
 *  05. Interactive Live Sandbox ("Try Plantipedia Tools Live": Citation Engine + Glossary Tooltips)
 *  06. Audience Pathways & Role Workflows
 *  07. Global Botanical Server Architecture (Zero-Key Engine Breakdown)
 *  08. Interactive Data Synthesis Pipeline (Clickable 4-Step Node Diagram + Inspector)
 *  09. Offline PWA & Academic PDF Field-Sheet Studio (Dark Screen vs. Print Mode Toggle)
 *  10. Open Botanical Standards & Ecosystem Dual-CTA
 */

import {
  buildImageElement,
  createEl,
  sanitizeUrl,
} from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { renderCitationGenerator } from "../../engines/citation/citation-generator.js";
import { applyGlossaryTooltips } from "../../engines/citation/glossary-tooltips.js";
import { applyPageSeo } from "../utils/seo.js";
import {
  buildServicesTelemetryStats,
  createTelemetryStatsGrid,
  ensureGsapWithScrollTrigger,
} from "../../core/telemetry/telemetry-stats.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const CATEGORY_ORDER = [
  "Flowers",
  "Fruit Trees",
  "Medicinal",
  "Shrubs & Herbs",
  "Trees & Palms",
  "Aquatic",
];

const FALLBACK_SEASONS = [
  { id: "grishmo", nameEn: "Summer", nameBn: "গ্রীষ্ম", bengaliMonths: "বৈশাখ – জ্যৈষ্ঠ", climateSummary: "Peak fruit sugar ripeness & warm evapotranspiration." },
  { id: "borsha", nameEn: "Monsoon", nameBn: "বর্ষা", bengaliMonths: "আষাঢ় – শ্রাবণ", climateSummary: "Floodplain recharge, bamboo shoot flush & wetland growth." },
  { id: "shorot", nameEn: "Autumn", nameBn: "শরৎ", bengaliMonths: "ভাদ্র – আশ্বিন", climateSummary: "Peak wetland blooms of Shapla and Sacred Lotus." },
  { id: "hemonto", nameEn: "Late Autumn", nameBn: "হেমন্ত", bengaliMonths: "কার্তিক – অগ্রহায়ণ", climateSummary: "Cooling mists & floral bud induction." },
  { id: "sheet", nameEn: "Winter", nameBn: "শীত", bengaliMonths: "পৌষ – মাঘ", climateSummary: "Cool exhibition blooms for Rose, Marigold, & Orchids." },
  { id: "boshonto", nameEn: "Spring", nameBn: "বসন্ত", bengaliMonths: "ফাল্গুন – চৈত্র", climateSummary: "Orchard panicles, copper leaf flush & first-flush tea." },
];

function computeArchiveMetrics(speciesIndex, seasons) {
  const list = Array.isArray(speciesIndex) ? speciesIndex : [];
  const familySet = new Set();
  list.forEach((sp) => {
    const fam = sp.family || sp.overview?.family;
    if (fam) familySet.add(fam);
  });

  const categoryStats = CATEGORY_ORDER.map((cat) => {
    const members = list.filter(
      (sp) =>
        sp.category === cat ||
        (Array.isArray(sp.categories) && sp.categories.includes(cat)),
    );
    return {
      category: cat,
      count: members.length,
      sharePct: list.length > 0 ? Math.round((members.length / list.length) * 100) : 0,
      sampleNames: members.slice(0, 3).map((m) => m.commonName),
    };
  });

  const seasonList = Array.isArray(seasons) && seasons.length > 0 ? seasons : FALLBACK_SEASONS;
  const seasonStats = seasonList.map((s) => {
    const active = list.filter(
      (sp) => Array.isArray(sp.seasons) && sp.seasons.includes(s.id),
    );
    return {
      ...s,
      count: active.length,
      sampleNames: active.slice(0, 4).map((m) => m.commonName),
    };
  });

  return {
    speciesCount: list.length || 50,
    familiesCount: familySet.size || 34,
    seasonsCount: seasonList.length || 6,
    categoryStats,
    seasonStats,
  };
}

function buildSectionHeader(eyebrow, heading, lead) {
  const header = createEl("div", "services-section-header");
  const left = document.createElement("div");
  if (eyebrow) left.appendChild(createEl("span", "section-eyebrow", eyebrow));
  if (heading) left.appendChild(createEl("h2", "section-heading", heading));
  header.appendChild(left);
  if (lead) header.appendChild(createEl("p", "services-section-lead", lead));
  return header;
}

function renderHeroAndTelemetry(banner, telemetry, metrics) {
  const hero = createEl("section", "services-hero");
  hero.id = "services-hero";
  hero.setAttribute("aria-labelledby", "servicesHeroHeading");

  if (banner.heroImage?.imageUrl) {
    const backdrop = createEl("div", "services-hero-backdrop");
    backdrop.setAttribute("aria-hidden", "true");
    const img = buildImageElement(
      banner.heroImage.imageUrl,
      banner.heroImage.imageAlt || "",
      "Plantipedia Digital Botanical Suite",
      { eager: true },
    );
    img.className = "services-hero-img";
    backdrop.appendChild(img);
    backdrop.appendChild(createEl("div", "services-hero-scrim"));
    hero.appendChild(backdrop);
  }

  const inner = createEl("div", "section-container services-hero-inner");

  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  (banner.breadcrumbs || []).forEach((crumb, idx) => {
    if (idx > 0) {
      const sep = createEl("span", "breadcrumb-sep", "/");
      sep.setAttribute("aria-hidden", "true");
      breadcrumbNav.appendChild(sep);
    }
    if (crumb.current) {
      const curr = createEl("span", "breadcrumb-current", crumb.label);
      curr.setAttribute("aria-current", "page");
      breadcrumbNav.appendChild(curr);
    } else {
      const link = document.createElement("a");
      link.href = sanitizeUrl(crumb.href, "./");
      link.textContent = crumb.label;
      breadcrumbNav.appendChild(link);
    }
  });
  inner.appendChild(breadcrumbNav);

  const grid = createEl("div", "services-hero-grid");
  const copyCol = document.createElement("div");
  copyCol.appendChild(createEl("span", "section-eyebrow", banner.eyebrow || ""));
  const h1 = createEl("h1", "services-hero-title", banner.headline || "");
  h1.id = "servicesHeroHeading";
  copyCol.appendChild(h1);
  copyCol.appendChild(createEl("p", "services-hero-subcopy", banner.subcopy || ""));

  const actions = createEl("div", "services-hero-actions");
  if (banner.primaryCta) {
    const primary = createEl("a", "specimen-nf-btn specimen-nf-btn--primary", banner.primaryCta.label);
    primary.href = sanitizeUrl(banner.primaryCta.href, "./species/");
    actions.appendChild(primary);
  }
  if (banner.secondaryCta) {
    const secondary = createEl(
      "a",
      "specimen-nf-btn specimen-nf-btn--secondary",
      banner.secondaryCta.label,
    );
    secondary.href = banner.secondaryCta.href || "#services-sandbox";
    actions.appendChild(secondary);
  }
  copyCol.appendChild(actions);

  const kpiGrid = createEl("div", "services-telemetry-grid");
  kpiGrid.setAttribute("aria-label", "Live archive telemetry");
  (telemetry || []).forEach((kpi) => {
    const card = createEl("article", "services-kpi-card");
    let displayVal = kpi.value;
    if (kpi.dynamic === "speciesCount") {
      displayVal = String(metrics.speciesCount).padStart(2, "0");
    } else if (kpi.dynamic === "familiesCount") {
      displayVal = String(metrics.familiesCount).padStart(2, "0");
    } else if (kpi.dynamic === "seasonsCount") {
      displayVal = String(metrics.seasonsCount).padStart(2, "0");
    }
    const valEl = createEl("span", "services-kpi-value", displayVal);
    if (kpi.id) valEl.id = kpi.id;
    card.appendChild(valEl);
    card.appendChild(createEl("span", "services-kpi-label", kpi.label));
    card.appendChild(createEl("span", "services-kpi-note", kpi.note));
    kpiGrid.appendChild(card);
  });

  grid.appendChild(copyCol);
  grid.appendChild(kpiGrid);
  inner.appendChild(grid);
  hero.appendChild(inner);
  return hero;
}

function renderComparisonSection(comparisonCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-comparison";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      comparisonCfg.eyebrow,
      comparisonCfg.heading,
      comparisonCfg.lead,
    ),
  );

  const filters = Array.isArray(comparisonCfg.filters) ? comparisonCfg.filters : [];
  const rows = Array.isArray(comparisonCfg.rows) ? comparisonCfg.rows : [];
  let activeFilter = "all";

  const filterBar = createEl("div", "services-filter-bar");
  filterBar.setAttribute("role", "tablist");
  filterBar.setAttribute("aria-label", "Filter capability comparison rows");

  const tableScroll = createEl("div", "services-table-scroll");
  const table = createEl("table", "services-comparison-table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Botanical Capability", "Traditional Plant Blogs", "Plantipedia Digital Ecosystem"].forEach(
    (label, idx) => {
      const th = createEl("th", idx === 2 ? "is-plantipedia-col" : "", label);
      th.scope = "col";
      headRow.appendChild(th);
    },
  );
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);
  tableScroll.appendChild(table);

  const renderRows = () => {
    const visibleRows =
      activeFilter === "all"
        ? rows
        : rows.filter((r) => r.group === activeFilter);
    const frag = document.createDocumentFragment();
    visibleRows.forEach((row) => {
      const tr = document.createElement("tr");

      const tdCap = createEl("td", "services-cell-capability");
      tdCap.appendChild(createEl("span", "services-cap-name", row.capability));
      tdCap.appendChild(createEl("span", "services-cap-tag", row.domainLabel));

      const tdTrad = createEl("td", "services-cell-traditional");
      const tradWrap = createEl("div", "services-cell-status");
      const negIcon = createEl("span", "services-status-icon services-status-icon--neg", "✕");
      negIcon.setAttribute("aria-hidden", "true");
      tradWrap.appendChild(negIcon);
      tradWrap.appendChild(createEl("span", "", row.traditional));
      tdTrad.appendChild(tradWrap);

      const tdPlant = createEl("td", "services-cell-plantipedia");
      const plantWrap = createEl("div", "services-cell-status");
      const posIcon = createEl("span", "services-status-icon services-status-icon--pos", "✓");
      posIcon.setAttribute("aria-hidden", "true");
      plantWrap.appendChild(posIcon);
      plantWrap.appendChild(createEl("span", "", row.plantipedia));
      tdPlant.appendChild(plantWrap);

      tr.appendChild(tdCap);
      tr.appendChild(tdTrad);
      tr.appendChild(tdPlant);
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
  };

  filters.forEach((f) => {
    const btn = createEl(
      "button",
      `services-filter-pill${f.id === activeFilter ? " is-active" : ""}`,
      f.label,
    );
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(f.id === activeFilter));
    btn.addEventListener("click", () => {
      activeFilter = f.id;
      filterBar.querySelectorAll(".services-filter-pill").forEach((b) => {
        const isCurrent = b === btn;
        b.classList.toggle("is-active", isCurrent);
        b.setAttribute("aria-selected", String(isCurrent));
      });
      renderRows();
    });
    filterBar.appendChild(btn);
  });

  renderRows();
  container.appendChild(filterBar);
  container.appendChild(tableScroll);
  section.appendChild(container);
  return section;
}

function buildCategoryDistributionCard(metrics) {
  const card = createEl("article", "services-chart-card");
  const head = createEl("div", "services-chart-head");
  const titleWrap = document.createElement("div");
  titleWrap.appendChild(createEl("h3", "services-chart-title", "Taxonomic Category Distribution"));
  titleWrap.appendChild(
    createEl(
      "p",
      "services-chart-sub",
      `Multi-realm coverage across ${metrics.speciesCount} indexed botanical monographs`,
    ),
  );
  head.appendChild(titleWrap);
  card.appendChild(head);

  const readout = createEl("div", "services-chart-readout");
  const readoutLabel = createEl("span", "", "Select or hover a realm to inspect species coverage");
  const readoutVal = createEl("strong", "", `${metrics.speciesCount} Total`);
  readout.appendChild(readoutLabel);
  readout.appendChild(readoutVal);

  const listWrap = createEl("div", "services-bars-list");
  const maxCount = Math.max(1, ...metrics.categoryStats.map((c) => c.count));

  const updateReadout = (item, activeRow) => {
    listWrap.querySelectorAll(".services-bar-row").forEach((el) => {
      el.classList.toggle("is-active", el === activeRow);
    });
    const sampleSuffix = item.sampleNames.length > 0 ? ` (${item.sampleNames.join(", ")})` : "";
    readoutLabel.textContent = `${item.category}${sampleSuffix}`;
    readoutVal.textContent = `${item.count} species · ${item.sharePct}%`;
  };

  metrics.categoryStats.forEach((item, idx) => {
    const row = createEl("a", `services-bar-row${idx === 0 ? " is-active" : ""}`);
    row.href = sanitizeUrl(
      `./species/?category=${encodeURIComponent(item.category)}`,
      "./species/",
    );
    row.setAttribute(
      "aria-label",
      `${item.category}: ${item.count} species (${item.sharePct}% of archive). Explore category.`,
    );

    const meta = createEl("div", "services-bar-meta");
    meta.appendChild(createEl("span", "services-bar-name", item.category));
    meta.appendChild(
      createEl("span", "services-bar-count", `${item.count} spp · ${item.sharePct}%`),
    );

    const track = createEl("div", "services-bar-track");
    const fill = createEl("div", "services-bar-fill");
    const widthPct = Math.max(10, Math.round((item.count / maxCount) * 100));
    fill.dataset.targetWidth = `${widthPct}%`;
    fill.style.width = `${widthPct}%`;
    track.appendChild(fill);

    row.appendChild(meta);
    row.appendChild(track);

    row.addEventListener("mouseenter", () => updateReadout(item, row));
    row.addEventListener("focus", () => updateReadout(item, row));
    listWrap.appendChild(row);
  });

  if (metrics.categoryStats[0]) {
    const first = metrics.categoryStats[0];
    readoutLabel.textContent = `${first.category} (${first.sampleNames.join(", ")})`;
    readoutVal.textContent = `${first.count} species · ${first.sharePct}%`;
  }

  card.appendChild(listWrap);
  card.appendChild(readout);
  return card;
}

function buildSeasonalCurveCard(metrics) {
  const card = createEl("article", "services-chart-card");
  const head = createEl("div", "services-chart-head");
  const titleWrap = document.createElement("div");
  titleWrap.appendChild(
    createEl("h3", "services-chart-title", "Bengali 6-Season (ষড়ঋতু) Botanical Activity Curve"),
  );
  titleWrap.appendChild(
    createEl(
      "p",
      "services-chart-sub",
      "Click or tap any seasonal node to inspect flowering & fruiting phenology",
    ),
  );
  head.appendChild(titleWrap);
  card.appendChild(head);

  const stats = metrics.seasonStats;
  const maxVal = Math.max(10, ...stats.map((s) => s.count));

  // Responsive SVG Curve (viewBox 540 x 210)
  const svgWrap = createEl("div", "services-svg-wrap");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "services-season-svg");
  svg.setAttribute("viewBox", "0 0 540 215");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Interactive curve showing active species across six Bengali seasons");

  const defs = document.createElementNS(SVG_NS, "defs");
  const grad = document.createElementNS(SVG_NS, "linearGradient");
  grad.setAttribute("id", "servicesSeasonAreaGrad");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "0%");
  grad.setAttribute("y2", "100%");
  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#34d399");
  stop1.setAttribute("stop-opacity", "0.4");
  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#10b981");
  stop2.setAttribute("stop-opacity", "0.02");
  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  svg.appendChild(defs);

  const padX = 46;
  const plotW = 540 - padX * 2;
  const topY = 30;
  const baseY = 166;
  const plotH = baseY - topY;

  // Subtle horizontal guide lines
  [0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const gy = baseY - plotH * ratio;
    const guide = document.createElementNS(SVG_NS, "line");
    guide.setAttribute("x1", String(padX));
    guide.setAttribute("x2", String(540 - padX));
    guide.setAttribute("y1", gy.toFixed(1));
    guide.setAttribute("y2", gy.toFixed(1));
    guide.setAttribute("stroke", "rgba(110, 231, 183, 0.12)");
    guide.setAttribute("stroke-dasharray", "3 4");
    svg.appendChild(guide);
  });

  const points = stats.map((s, idx) => {
    const x =
      stats.length > 1
        ? padX + (idx / (stats.length - 1)) * plotW
        : 270;
    const y = baseY - (s.count / maxVal) * plotH;
    return { x, y, season: s };
  });

  // Smooth cubic bezier path
  let lineD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    lineD += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const areaD = `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${baseY} L ${points[0].x.toFixed(1)} ${baseY} Z`;

  const areaPath = document.createElementNS(SVG_NS, "path");
  areaPath.setAttribute("class", "services-season-area-path");
  areaPath.setAttribute("d", areaD);
  areaPath.setAttribute("fill", "url(#servicesSeasonAreaGrad)");
  svg.appendChild(areaPath);

  const linePath = document.createElementNS(SVG_NS, "path");
  linePath.setAttribute("class", "services-season-line-path");
  linePath.setAttribute("d", lineD);
  linePath.setAttribute("fill", "none");
  linePath.setAttribute("stroke", "#34d399");
  linePath.setAttribute("stroke-width", "3");
  linePath.setAttribute("stroke-linecap", "round");
  svg.appendChild(linePath);

  let activeSeasonId = stats[0]?.id || "grishmo";

  const pillsRow = createEl("div", "services-season-pills");
  const spotlight = createEl("div", "services-season-spotlight");
  const spotTop = createEl("div", "services-spotlight-top");
  const spotTitle = createEl("h4", "services-spotlight-title");
  const spotCount = createEl("span", "services-spotlight-count");
  spotTop.appendChild(spotTitle);
  spotTop.appendChild(spotCount);
  const spotSummary = createEl("p", "services-spotlight-summary");
  const spotLink = createEl("a", "services-spotlight-link", "Inspect Season Flora →");
  spotlight.appendChild(spotTop);
  spotlight.appendChild(spotSummary);
  spotlight.appendChild(spotLink);

  const nodeGroups = [];
  const pillButtons = [];

  const selectSeason = (seasonId) => {
    activeSeasonId = seasonId;
    const item = stats.find((s) => s.id === seasonId) || stats[0];
    if (!item) return;

    nodeGroups.forEach(({ id, g, core }) => {
      const isCurrent = id === seasonId;
      g.classList.toggle("is-active", isCurrent);
      core.setAttribute("fill", isCurrent ? "#fde68a" : "#34d399");
      core.setAttribute("r", isCurrent ? "6.5" : "5");
    });

    pillButtons.forEach(({ id, btn }) => {
      const isCurrent = id === seasonId;
      btn.classList.toggle("is-active", isCurrent);
      btn.setAttribute("aria-pressed", String(isCurrent));
    });

    spotTitle.textContent = `${item.nameEn} (${item.nameBn}) · ${item.bengaliMonths || ""}`;
    spotCount.textContent = `${item.count} Active Species`;
    const sampleStr = item.sampleNames.length > 0 ? ` Notable flora: ${item.sampleNames.join(", ")}.` : "";
    spotSummary.textContent = `${item.climateSummary || item.phenologyHighlight || ""}${sampleStr}`;
    spotLink.href = sanitizeUrl(
      `./seasons/?season=${encodeURIComponent(item.id)}`,
      "./seasons/",
    );
  };

  points.forEach(({ x, y, season }) => {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "services-svg-node");
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute(
      "aria-label",
      `${season.nameEn} (${season.nameBn}): ${season.count} active species`,
    );

    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("class", "node-ring");
    ring.setAttribute("cx", x.toFixed(1));
    ring.setAttribute("cy", y.toFixed(1));
    ring.setAttribute("r", "10");
    ring.setAttribute("fill", "#34d399");
    ring.setAttribute("opacity", "0.18");

    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("cx", x.toFixed(1));
    core.setAttribute("cy", y.toFixed(1));
    core.setAttribute("r", "5");
    core.setAttribute("fill", "#34d399");
    core.setAttribute("stroke", "#04140c");
    core.setAttribute("stroke-width", "2");

    const valLabel = document.createElementNS(SVG_NS, "text");
    valLabel.setAttribute("x", x.toFixed(1));
    valLabel.setAttribute("y", (y - 13).toFixed(1));
    valLabel.setAttribute("text-anchor", "middle");
    valLabel.setAttribute("fill", "#a7f3d0");
    valLabel.setAttribute("font-size", "11");
    valLabel.setAttribute("font-family", "JetBrains Mono, monospace");
    valLabel.textContent = String(season.count);

    const bnLabel = document.createElementNS(SVG_NS, "text");
    bnLabel.setAttribute("x", x.toFixed(1));
    bnLabel.setAttribute("y", "192");
    bnLabel.setAttribute("text-anchor", "middle");
    bnLabel.setAttribute("fill", "#e2e8f0");
    bnLabel.setAttribute("font-size", "12");
    bnLabel.textContent = season.nameBn;

    g.appendChild(ring);
    g.appendChild(core);
    g.appendChild(valLabel);
    g.appendChild(bnLabel);

    g.addEventListener("click", () => selectSeason(season.id));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectSeason(season.id);
      }
    });

    svg.appendChild(g);
    nodeGroups.push({ id: season.id, g, core });

    const pill = createEl(
      "button",
      "services-season-pill",
      `${season.nameBn} (${season.count})`,
    );
    pill.type = "button";
    pill.addEventListener("click", () => selectSeason(season.id));
    pillsRow.appendChild(pill);
    pillButtons.push({ id: season.id, btn: pill });
  });

  svgWrap.appendChild(svg);
  card.appendChild(svgWrap);
  card.appendChild(pillsRow);
  card.appendChild(spotlight);

  selectSeason(activeSeasonId);
  return card;
}

function renderAnalyticsSection(analyticsCfg, metrics) {
  const section = createEl("section", "services-section");
  section.id = "services-analytics";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      analyticsCfg.eyebrow,
      analyticsCfg.heading,
      analyticsCfg.lead,
    ),
  );

  const grid = createEl("div", "services-charts-grid");
  grid.appendChild(buildCategoryDistributionCard(metrics));
  grid.appendChild(buildSeasonalCurveCard(metrics));

  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function renderToolkitSection(toolkitCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-toolkit";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(toolkitCfg.eyebrow, toolkitCfg.heading, toolkitCfg.lead),
  );

  const grid = createEl("div", "services-toolkit-grid");
  (toolkitCfg.items || []).forEach((item) => {
    const card = createEl("article", "services-toolkit-card");
    if (item.imageUrl) {
      const media = createEl("div", "services-toolkit-media");
      media.appendChild(
        buildImageElement(item.imageUrl, item.imageAlt || item.title, item.title),
      );
      card.appendChild(media);
    }

    const body = createEl("div", "services-toolkit-body");
    body.appendChild(createEl("span", "services-toolkit-meta", item.meta));
    body.appendChild(createEl("h3", "services-toolkit-title", item.title));
    body.appendChild(createEl("p", "services-toolkit-desc", item.description));

    const cta = createEl("a", "services-toolkit-cta", item.ctaLabel || "Open Workspace →");
    cta.href = sanitizeUrl(item.href, "./species/");
    body.appendChild(cta);

    card.appendChild(body);
    grid.appendChild(card);
  });

  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function renderSandboxSection(sandboxCfg, speciesIndex, glossaryData) {
  const section = createEl("section", "services-section");
  section.id = "services-sandbox";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(sandboxCfg.eyebrow, sandboxCfg.heading, sandboxCfg.lead),
  );

  const grid = createEl("div", "services-sandbox-grid");

  // Left Panel: Live Academic Citation Generator
  const leftPanel = createEl("div", "services-sandbox-panel");
  leftPanel.appendChild(createEl("h3", "services-chart-title", sandboxCfg.citationTitle));
  leftPanel.appendChild(createEl("p", "services-glossary-hint", sandboxCfg.citationHint));

  const selectWrap = document.createElement("div");
  const selectLabel = createEl("label", "services-sandbox-label", "Choose Documented Species");
  selectLabel.setAttribute("for", "servicesCitationSpeciesSelect");
  const select = createEl("select", "services-sandbox-select");
  select.id = "servicesCitationSpeciesSelect";

  const list = Array.isArray(speciesIndex) && speciesIndex.length > 0
    ? speciesIndex
    : [{ slug: "mango", commonName: "Mango", commonNameBn: "আম", scientificName: "Mangifera indica" }];

  list.forEach((sp) => {
    const opt = document.createElement("option");
    opt.value = sp.slug;
    opt.textContent = sp.commonNameBn
      ? `${sp.commonName} (${sp.commonNameBn}) — ${sp.scientificName}`
      : `${sp.commonName} — ${sp.scientificName}`;
    select.appendChild(opt);
  });

  selectWrap.appendChild(selectLabel);
  selectWrap.appendChild(select);
  leftPanel.appendChild(selectWrap);

  const citationMount = createEl("div", "services-sandbox-citation-mount");
  const updateCitationWidget = (slug) => {
    const active = list.find((s) => s.slug === slug) || list[0];
    citationMount.replaceChildren(
      renderCitationGenerator(active, {
        eyebrow: "Live Sandbox Output",
        heading: `${active.commonName} Citation`,
        copyLabel: "Copy Citation",
        copiedLabel: "Copied ✓",
      }),
    );
  };
  select.addEventListener("change", () => updateCitationWidget(select.value));
  updateCitationWidget(list[0].slug);
  leftPanel.appendChild(citationMount);

  // Right Panel: Interactive Botanical Glossary Engine
  const rightPanel = createEl("div", "services-sandbox-panel");
  rightPanel.appendChild(createEl("h3", "services-chart-title", sandboxCfg.glossaryTitle));
  rightPanel.appendChild(createEl("p", "services-glossary-hint", sandboxCfg.glossaryHint));

  const sampleBox = createEl("div", "services-glossary-sample");
  const sampleP = document.createElement("p");
  sampleP.textContent = sandboxCfg.sampleParagraph || "";
  sampleBox.appendChild(sampleP);
  rightPanel.appendChild(sampleBox);

  if (glossaryData) {
    applyGlossaryTooltips(sampleBox, glossaryData);
  }

  const featuredTermIds = ["allelopathy", "mycorrhiza", "l-theanine", "epiphytic"];
  const allTerms = Array.isArray(glossaryData?.terms) ? glossaryData.terms : [];
  const featuredTerms = featuredTermIds
    .map((id) => allTerms.find((t) => t.id === id))
    .filter(Boolean);

  if (featuredTerms.length > 0) {
    const previewCard = createEl("div", "services-glossary-preview");
    const previewHead = createEl("div", "services-glossary-preview-head");
    const pTerm = createEl("span", "services-glossary-preview-term");
    const pCat = createEl("span", "services-glossary-preview-cat");
    previewHead.appendChild(pTerm);
    previewHead.appendChild(pCat);
    const pEn = createEl("p", "services-glossary-preview-en");
    const pBn = createEl("p", "services-glossary-preview-bn");
    previewCard.appendChild(previewHead);
    previewCard.appendChild(pEn);
    previewCard.appendChild(pBn);

    const legend = createEl("div", "services-glossary-legend");
    const selectTermPreview = (entry, activeBtn) => {
      legend.querySelectorAll(".services-glossary-chip-btn").forEach((b) => {
        b.classList.toggle("is-active", b === activeBtn);
      });
      pTerm.textContent = entry.term;
      pCat.textContent = entry.category || "Botanical Term";
      pEn.textContent = entry.en || "";
      pBn.textContent = entry.bn || "";
    };

    featuredTerms.forEach((entry, idx) => {
      const btn = createEl(
        "button",
        `services-glossary-chip-btn${idx === 0 ? " is-active" : ""}`,
        entry.term,
      );
      btn.type = "button";
      btn.addEventListener("click", () => selectTermPreview(entry, btn));
      legend.appendChild(btn);
    });

    selectTermPreview(featuredTerms[0], legend.firstElementChild);

    sampleBox.addEventListener("click", (e) => {
      const trigger = e.target.closest(".glossary-term");
      if (!trigger) return;
      const id = trigger.getAttribute("data-glossary-id");
      const matched = featuredTerms.find((t) => t.id === id);
      if (matched) {
        const idx = featuredTerms.indexOf(matched);
        selectTermPreview(matched, legend.children[idx]);
      }
    });

    rightPanel.appendChild(legend);
    rightPanel.appendChild(previewCard);
  }

  grid.appendChild(leftPanel);
  grid.appendChild(rightPanel);
  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function renderPathwaysSection(pathwaysCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-pathways";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(pathwaysCfg.eyebrow, pathwaysCfg.heading, pathwaysCfg.lead),
  );

  const grid = createEl("div", "services-pathways-grid");
  (pathwaysCfg.items || []).forEach((item) => {
    const card = createEl("article", "services-pathway-card");
    card.appendChild(createEl("span", "services-pathway-index", item.index));
    card.appendChild(createEl("h3", "services-pathway-title", item.title));
    card.appendChild(createEl("p", "services-pathway-desc", item.description));

    const cta = createEl("a", "services-pathway-cta", item.ctaLabel || "Get Started →");
    cta.href = sanitizeUrl(item.href, "./species/");
    card.appendChild(cta);

    grid.appendChild(card);
  });

  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

const DEFAULT_SERVICES_MATRIX = [
  {
    num: "01",
    targetId: "services-hero",
    title: "01. Hero & Live Telemetry",
    desc: "Live archive counts across monographs, families, chapters, and Bengali seasons.",
    theme: "emerald",
  },
  {
    num: "02",
    targetId: "services-comparison",
    title: "02. Platform Comparison Matrix",
    desc: "Filterable benchmark contrasting Plantipedia against traditional plant blogs.",
    theme: "cyan",
  },
  {
    num: "03",
    targetId: "services-analytics",
    title: "03. Live Data Analytics",
    desc: "Dynamic realm distribution bars and interactive 6-season phenology curve.",
    theme: "violet",
  },
  {
    num: "04",
    targetId: "services-toolkit",
    title: "04. Core Digital Toolkit",
    desc: "Direct gateways to Split Comparator, 6-Season Atlas, Monographs, and Taxonomy.",
    theme: "amber",
  },
  {
    num: "05",
    targetId: "services-sandbox",
    title: "05. Interactive Live Sandbox",
    desc: "Test APA/MLA/BibTeX citation generation and bilingual glossary tooltips live.",
    theme: "magenta",
  },
  {
    num: "06",
    targetId: "services-pathways",
    title: "06. Audience Pathways",
    desc: "Tailored research workflows for scholars, home growers, and botanical educators.",
    theme: "sapphire",
  },
  {
    num: "07",
    targetId: "services-global-architecture",
    title: "07. Global Botanical Server Architecture",
    desc: "Zero-key worldwide flora resolution, EN/বাংলা sync, and 5-second retry guard.",
    theme: "cyan",
  },
  {
    num: "08",
    targetId: "services-synthesis-pipeline",
    title: "08. Interactive Synthesis Pipeline",
    desc: "Inspect how live queries normalize into structured 8-chapter monographs.",
    theme: "lime",
  },
  {
    num: "09",
    targetId: "services-field-studio",
    title: "09. Offline PWA & Field-Sheet Studio",
    desc: "Compare Dark Conservatory mode with monochrome @media print A4 handouts.",
    theme: "crimson",
  },
  {
    num: "10",
    targetId: "services-open-standards",
    title: "10. Open Standards & CTA",
    desc: "Schema.org JSON-LD, WCAG AA+ contrast, zero-tracking privacy, and launch CTAs.",
    theme: "emerald",
  },
];

let activeMatrixCleanup = null;

function createMatrixGridSvgIcon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "services-map-matrix-icon");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");

  [
    [4.5, 4.5],
    [11.5, 4.5],
    [4.5, 11.5],
    [11.5, 11.5],
  ].forEach(([cx, cy]) => {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", "2.1");
    svg.appendChild(dot);
  });

  return svg;
}

function buildMatrixItems(indexItems) {
  if (!Array.isArray(indexItems) || indexItems.length === 0) {
    return DEFAULT_SERVICES_MATRIX;
  }
  return DEFAULT_SERVICES_MATRIX.map((def, idx) => {
    const custom = indexItems[idx];
    if (!custom) return def;
    const customTargetId = custom.href
      ? String(custom.href).replace(/^#/, "")
      : def.targetId;
    return {
      ...def,
      num: custom.num || def.num,
      targetId: customTargetId || def.targetId,
    };
  });
}

function renderServicesMapMatrix(portal, indexItems) {
  if (!portal) return;

  if (typeof activeMatrixCleanup === "function") {
    activeMatrixCleanup();
    activeMatrixCleanup = null;
  }

  document.getElementById("services-map-matrix-btn")?.remove();
  document.getElementById("services-matrix-overlay")?.remove();
  document.body.style.overflow = "";

  const items = buildMatrixItems(indexItems);
  const totalStr = String(items.length).padStart(2, "0");
  const abortController = new AbortController();
  const { signal } = abortController;

  // 1. Floating Top-Left "Map Matrix" Pill Button
  const triggerBtn = createEl("button", "services-map-matrix-btn");
  triggerBtn.id = "services-map-matrix-btn";
  triggerBtn.type = "button";
  triggerBtn.setAttribute("aria-haspopup", "dialog");
  triggerBtn.setAttribute("aria-expanded", "false");
  triggerBtn.setAttribute("aria-controls", "services-matrix-overlay");
  triggerBtn.setAttribute(
    "aria-label",
    `Open Services Architecture Map Matrix (${items.length} sections)`,
  );

  triggerBtn.appendChild(createMatrixGridSvgIcon());
  triggerBtn.appendChild(createEl("span", "services-map-matrix-label", "Map Matrix"));
  const sepDot = createEl("span", "services-map-matrix-sep", "·");
  sepDot.setAttribute("aria-hidden", "true");
  triggerBtn.appendChild(sepDot);
  const badgeEl = createEl("span", "services-map-matrix-badge", `01/${totalStr}`);
  triggerBtn.appendChild(badgeEl);

  // 2. Full-Screen Glassmorphism Overlay Modal
  const overlay = createEl("div", "services-matrix-overlay");
  overlay.id = "services-matrix-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "servicesMatrixTitle");
  overlay.hidden = true;

  const dialogShell = createEl("div", "services-matrix-dialog");

  const header = createEl("header", "services-matrix-header");
  const titleWrap = createEl("div", "services-matrix-title-wrap");
  const titleEl = createEl(
    "h2",
    "services-matrix-title",
    "Services Architecture · Map Matrix (10 Sections)",
  );
  titleEl.id = "servicesMatrixTitle";
  const subtitleEl = createEl(
    "p",
    "services-matrix-subtitle",
    "Select any capability module to jump directly",
  );
  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(subtitleEl);

  const closeBtn = createEl("button", "services-matrix-close-btn", "✕ Close");
  closeBtn.id = "services-matrix-close-btn";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close Map Matrix overlay");

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const grid = createEl("div", "services-matrix-grid");
  const cardEntries = [];

  const setActiveSection = (sectionId) => {
    const foundIdx = items.findIndex((it) => it.targetId === sectionId);
    if (foundIdx < 0) return;
    const activeNum = String(foundIdx + 1).padStart(2, "0");
    badgeEl.textContent = `${activeNum}/${totalStr}`;
    cardEntries.forEach(({ item, card, statusPill }) => {
      const isCurrent = item.targetId === sectionId;
      card.classList.toggle("is-active", isCurrent);
      card.setAttribute("aria-current", isCurrent ? "location" : "false");
      statusPill.textContent = isCurrent ? "● In View" : "Jump →";
    });
  };

  const openMatrix = () => {
    overlay.hidden = false;
    triggerBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus({ preventScroll: true });
  };

  const closeMatrix = ({ restoreFocus = true } = {}) => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    triggerBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restoreFocus) {
      triggerBtn.focus({ preventScroll: true });
    }
  };

  items.forEach((item, idx) => {
    const card = createEl(
      "button",
      `services-matrix-card botanical-theme--${item.theme}${idx === 0 ? " is-active" : ""}`,
    );
    card.type = "button";
    card.setAttribute("data-section-target", item.targetId);
    card.setAttribute("aria-current", idx === 0 ? "location" : "false");

    const topRow = createEl("div", "services-matrix-card-top");
    topRow.appendChild(createEl("span", "services-matrix-num-badge", item.num));
    const statusPill = createEl(
      "span",
      "services-matrix-status-pill",
      idx === 0 ? "● In View" : "Jump →",
    );
    topRow.appendChild(statusPill);

    const cardTitle = createEl("h3", "services-matrix-card-title", item.title);
    const cardDesc = createEl("p", "services-matrix-card-desc", item.desc);

    card.appendChild(topRow);
    card.appendChild(cardTitle);
    card.appendChild(cardDesc);

    card.addEventListener(
      "click",
      () => {
        setActiveSection(item.targetId);
        closeMatrix({ restoreFocus: false });
        const target = document.getElementById(item.targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
      { signal },
    );

    grid.appendChild(card);
    cardEntries.push({ item, card, statusPill });
  });

  dialogShell.appendChild(header);
  dialogShell.appendChild(grid);
  overlay.appendChild(dialogShell);

  triggerBtn.addEventListener("click", openMatrix, { signal });
  closeBtn.addEventListener("click", () => closeMatrix({ restoreFocus: true }), { signal });

  overlay.addEventListener(
    "click",
    (e) => {
      if (e.target === overlay || e.target === dialogShell) {
        closeMatrix({ restoreFocus: true });
      }
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && !overlay.hidden) {
        e.preventDefault();
        closeMatrix({ restoreFocus: true });
      }
    },
    { signal },
  );

  let observer = null;
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-22% 0px -52% 0px", threshold: [0.08, 0.25, 0.5] },
    );

    items.forEach(({ targetId }) => {
      const sec = portal.querySelector(`#${targetId}`);
      if (sec) observer.observe(sec);
    });
  }

  document.body.appendChild(triggerBtn);
  document.body.appendChild(overlay);

  activeMatrixCleanup = () => {
    abortController.abort();
    if (observer) observer.disconnect();
    document.body.style.overflow = "";
    triggerBtn.remove();
    overlay.remove();
  };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

async function initServicesAnimations(portal) {
  if (!portal || prefersReducedMotion() || document.body.classList.contains("is-embed")) {
    return;
  }

  const ready = await ensureGsapWithScrollTrigger();
  if (!ready || !window.gsap || !window.ScrollTrigger || !document.body.contains(portal)) {
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  // 1. Above-the-Fold Hero Reveal
  const heroTargets = portal.querySelectorAll(
    ".services-hero .section-eyebrow, .services-hero-title, .services-hero-subcopy, .services-hero-actions, .services-kpi-card",
  );
  if (heroTargets.length) {
    gsap.fromTo(
      heroTargets,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.1,
        ease: "power3.out",
        clearProps: "transform,opacity",
      },
    );
  }

  // Hero Telemetry KPI Numerical Counters (0 -> target)
  portal.querySelectorAll(".services-kpi-value").forEach((valEl) => {
    const raw = (valEl.textContent || "").trim();
    const targetNum = parseInt(raw, 10);
    if (!Number.isFinite(targetNum) || targetNum <= 0) return;
    const minDigits = raw.length;
    const proxy = { val: 0 };
    valEl.textContent = "0".padStart(minDigits, "0");
    gsap.to(proxy, {
      val: targetNum,
      duration: 1.15,
      ease: "power3.out",
      onUpdate: () => {
        valEl.textContent = String(Math.round(proxy.val)).padStart(minDigits, "0");
      },
      onComplete: () => {
        valEl.textContent = raw;
      },
    });
  });

  const animateScrollGroup = (triggerEl, nodes, stagger = 0.08) => {
    const targets = Array.from(nodes || []).filter(Boolean);
    if (!triggerEl || !targets.length) return;
    gsap.fromTo(
      targets,
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.68,
        stagger,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: triggerEl,
          start: "top 86%",
          once: true,
        },
      },
    );
  };

  // 2. Section Headers across Sections 02-10
  portal.querySelectorAll(".services-section .services-section-header").forEach((hdr) => {
    animateScrollGroup(hdr, [hdr], 0);
  });

  // Section 02: Comparison Filter Pills & Rows
  const compSec = portal.querySelector("#services-comparison");
  if (compSec) {
    animateScrollGroup(
      compSec.querySelector(".services-filter-bar"),
      compSec.querySelectorAll(".services-filter-pill"),
      0.06,
    );
    animateScrollGroup(
      compSec.querySelector(".services-table-scroll"),
      compSec.querySelectorAll(".services-comparison-table tbody tr"),
      0.08,
    );
  }

  // Section 03: Analytics Cards + Bar Fills + 6-Season Curve Nodes
  const analyticsSec = portal.querySelector("#services-analytics");
  if (analyticsSec) {
    const chartsGrid = analyticsSec.querySelector(".services-charts-grid");
    animateScrollGroup(chartsGrid, analyticsSec.querySelectorAll(".services-chart-card"), 0.08);

    const barFills = Array.from(analyticsSec.querySelectorAll(".services-bar-fill"));
    if (barFills.length) {
      gsap.fromTo(
        barFills,
        { width: "0%" },
        {
          width: (_idx, el) => el.dataset.targetWidth || "50%",
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "transition",
          scrollTrigger: {
            trigger: analyticsSec.querySelector(".services-bars-list") || chartsGrid,
            start: "top 86%",
            once: true,
          },
        },
      );
    }

    const svgNodes = analyticsSec.querySelectorAll(".services-svg-node");
    if (svgNodes.length) {
      gsap.fromTo(
        svgNodes,
        { opacity: 0, scale: 0.55, transformOrigin: "center center" },
        {
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: "back.out(1.6)",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: analyticsSec.querySelector(".services-svg-wrap") || chartsGrid,
            start: "top 86%",
            once: true,
          },
        },
      );
    }
  }

  // Section 04: Toolkit Cards
  const toolkitGrid = portal.querySelector(".services-toolkit-grid");
  if (toolkitGrid) {
    animateScrollGroup(toolkitGrid, toolkitGrid.querySelectorAll(".services-toolkit-card"), 0.08);
  }

  // Section 05: Live Sandbox Panels
  const sandboxGrid = portal.querySelector(".services-sandbox-grid");
  if (sandboxGrid) {
    animateScrollGroup(sandboxGrid, sandboxGrid.querySelectorAll(".services-sandbox-panel"), 0.08);
  }

  // Section 06: Audience Pathways Cards
  const pathwaysGrid = portal.querySelector(".services-pathways-grid");
  if (pathwaysGrid) {
    animateScrollGroup(pathwaysGrid, pathwaysGrid.querySelectorAll(".services-pathway-card"), 0.08);
  }

  // Section 07: Global Server Pillars
  const archGrid = portal.querySelector(".services-arch-grid");
  if (archGrid) {
    animateScrollGroup(archGrid, archGrid.querySelectorAll(".services-arch-card"), 0.08);
  }

  // Section 08: Interactive Synthesis Pipeline Nodes & Inspector
  const pipelineShell = portal.querySelector(".services-pipeline-shell");
  if (pipelineShell) {
    animateScrollGroup(
      pipelineShell,
      pipelineShell.querySelectorAll(".services-pipeline-node, .services-pipeline-inspector"),
      0.08,
    );
  }

  // Section 09: Offline PWA & Field-Sheet Studio
  const studioGrid = portal.querySelector(".services-studio-grid");
  if (studioGrid) {
    animateScrollGroup(
      studioGrid,
      studioGrid.querySelectorAll(".services-studio-preview-shell, .services-studio-feature-card"),
      0.08,
    );
  }

  // Section 10: Open Standards Cards & Final CTA Banner
  const standardsSec = portal.querySelector("#services-open-standards");
  if (standardsSec) {
    animateScrollGroup(
      standardsSec.querySelector(".services-standards-grid"),
      standardsSec.querySelectorAll(".services-standard-card"),
      0.08,
    );
    const finalBanner = standardsSec.querySelector(".services-final-cta-banner");
    if (finalBanner) {
      animateScrollGroup(finalBanner, [finalBanner], 0);
    }
  }

  ScrollTrigger.refresh();
}

function renderGlobalArchitectureSection(archCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-global-architecture";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      archCfg.eyebrow || "07. Global Botanical Server Architecture",
      archCfg.heading || "Zero-Key Worldwide Flora Uplink & Botanical Validation",
      archCfg.lead || "",
    ),
  );

  const grid = createEl("div", "services-arch-grid");
  (archCfg.pillars || []).forEach((pillar, idx) => {
    const card = createEl("article", "services-arch-card");

    const top = createEl("div", "services-arch-top");
    top.appendChild(createEl("span", "services-arch-badge", pillar.badge || ""));
    const status = createEl("span", "services-arch-status");
    status.appendChild(createEl("span", "services-arch-pulse"));
    status.appendChild(createEl("span", "", pillar.statusLabel || "LIVE"));
    top.appendChild(status);
    card.appendChild(top);

    card.appendChild(
      createEl(
        "span",
        "services-arch-index",
        `PILLAR ${String(idx + 1).padStart(2, "0")}`,
      ),
    );
    card.appendChild(createEl("h3", "services-arch-title", pillar.title || ""));
    card.appendChild(createEl("p", "services-arch-desc", pillar.description || ""));

    if (pillar.sampleQuery) {
      const testLink = createEl(
        "a",
        "services-arch-cta",
        pillar.sampleCta || `Query "${pillar.sampleQuery}" →`,
      );
      testLink.href = resolveRootPath(
        `./plant/live/?q=${encodeURIComponent(pillar.sampleQuery)}&source=gateway`,
      );
      card.appendChild(testLink);
    }

    grid.appendChild(card);
  });

  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function renderSynthesisPipelineSection(pipelineCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-synthesis-pipeline";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      pipelineCfg.eyebrow || "08. Interactive Data Synthesis Pipeline",
      pipelineCfg.heading || "How Live Queries Become Structured 8-Chapter Monographs",
      pipelineCfg.lead || "",
    ),
  );

  const steps = Array.isArray(pipelineCfg.steps) ? pipelineCfg.steps : [];
  const shell = createEl("div", "services-pipeline-shell");
  const diagram = createEl("div", "services-pipeline-nodes");
  diagram.setAttribute("role", "tablist");
  diagram.setAttribute("aria-label", "Data synthesis pipeline stages");

  const inspector = createEl("div", "services-pipeline-inspector");
  inspector.setAttribute("role", "tabpanel");
  inspector.setAttribute("aria-live", "polite");

  const inspHead = createEl("div", "services-pipeline-insp-head");
  const inspTitleWrap = document.createElement("div");
  const inspStepBadge = createEl("span", "services-pipeline-insp-badge");
  const inspTitle = createEl("h3", "services-pipeline-insp-title");
  inspTitleWrap.appendChild(inspStepBadge);
  inspTitleWrap.appendChild(inspTitle);

  const inspLatency = createEl("span", "services-pipeline-insp-latency");
  inspHead.appendChild(inspTitleWrap);
  inspHead.appendChild(inspLatency);

  const inspDesc = createEl("p", "services-pipeline-insp-desc");

  const inspSpecs = createEl("div", "services-pipeline-specs");
  const makeSpecBox = (label) => {
    const box = createEl("div", "services-pipeline-spec-box");
    const lbl = createEl("span", "services-pipeline-spec-label", label);
    const val = createEl("p", "services-pipeline-spec-val");
    box.appendChild(lbl);
    box.appendChild(val);
    return { box, val };
  };
  const protoSpec = makeSpecBox("Protocol / Engine");
  const guardSpec = makeSpecBox("Fallback Safeguard");
  const outSpec = makeSpecBox("Stage Output");
  inspSpecs.appendChild(protoSpec.box);
  inspSpecs.appendChild(guardSpec.box);
  inspSpecs.appendChild(outSpec.box);

  inspector.appendChild(inspHead);
  inspector.appendChild(inspDesc);
  inspector.appendChild(inspSpecs);

  const nodeButtons = [];
  const activateStep = (stepIdx) => {
    const step = steps[stepIdx];
    if (!step) return;
    nodeButtons.forEach((btn, idx) => {
      const isCurrent = idx === stepIdx;
      btn.classList.toggle("is-active", isCurrent);
      btn.setAttribute("aria-selected", String(isCurrent));
    });
    inspStepBadge.textContent = `STAGE ${step.stepNumber} OF ${String(steps.length).padStart(2, "0")}`;
    inspTitle.textContent = step.title;
    inspLatency.textContent = step.latency || "";
    inspDesc.textContent = step.description || "";
    protoSpec.val.textContent = step.protocol || "";
    guardSpec.val.textContent = step.safeguard || "";
    outSpec.val.textContent = step.output || "";
  };

  steps.forEach((step, idx) => {
    const nodeBtn = createEl(
      "button",
      `services-pipeline-node${idx === 0 ? " is-active" : ""}`,
    );
    nodeBtn.type = "button";
    nodeBtn.setAttribute("role", "tab");
    nodeBtn.setAttribute("aria-selected", String(idx === 0));
    nodeBtn.appendChild(createEl("span", "services-pipeline-node-num", step.stepNumber));
    nodeBtn.appendChild(createEl("span", "services-pipeline-node-title", step.shortLabel || step.title));
    nodeBtn.appendChild(createEl("span", "services-pipeline-node-meta", step.latency || ""));

    nodeBtn.addEventListener("click", () => activateStep(idx));
    nodeBtn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = (idx + 1) % steps.length;
        activateStep(next);
        nodeButtons[next]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (idx - 1 + steps.length) % steps.length;
        activateStep(prev);
        nodeButtons[prev]?.focus();
      }
    });

    diagram.appendChild(nodeBtn);
    nodeButtons.push(nodeBtn);
  });

  if (steps.length > 0) {
    activateStep(0);
  }

  shell.appendChild(diagram);
  shell.appendChild(inspector);
  container.appendChild(shell);
  section.appendChild(container);
  return section;
}

function renderFieldStudioSection(studioCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-field-studio";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      studioCfg.eyebrow || "09. Offline PWA & Academic PDF Field-Sheet Studio",
      studioCfg.heading || "Built for Dark Conservatories and Crisp Paper Field Binders",
      studioCfg.lead || "",
    ),
  );

  const layout = createEl("div", "services-studio-grid");

  // Left: Interactive Screen vs Print Preview Mockup
  const previewWrap = createEl("div", "services-studio-preview-shell");
  const modeBar = createEl("div", "services-studio-mode-bar");
  modeBar.setAttribute("role", "tablist");
  modeBar.setAttribute("aria-label", "Preview display mode");

  const sheet = createEl("article", "services-studio-sheet is-mode-screen");
  const sheetHead = createEl("div", "services-studio-sheet-head");
  const sheetTitleWrap = document.createElement("div");
  sheetTitleWrap.appendChild(
    createEl("span", "services-studio-sheet-kicker", "SPECIMEN FIELD DOSSIER · #MANGO-01"),
  );
  sheetTitleWrap.appendChild(
    createEl("h3", "services-studio-sheet-title", "Mango (আম) — Mangifera indica"),
  );
  sheetHead.appendChild(sheetTitleWrap);

  const sheetModeBadge = createEl("span", "services-studio-mode-badge", "SCREEN MODE");
  sheetHead.appendChild(sheetModeBadge);
  sheet.appendChild(sheetHead);

  const sheetSpecs = createEl("div", "services-studio-sheet-specs");
  [
    { label: "Family", value: "Anacardiaceae" },
    { label: "Soil pH", value: "5.5 – 7.5 (Alluvial Loam)" },
    { label: "Phenology", value: "বসন্ত Bloom · গ্রীষ্ম Harvest" },
  ].forEach((spec) => {
    const cell = createEl("div", "services-studio-spec-cell");
    cell.appendChild(createEl("span", "services-studio-spec-lbl", spec.label));
    cell.appendChild(createEl("strong", "services-studio-spec-val", spec.value));
    sheetSpecs.appendChild(cell);
  });
  sheet.appendChild(sheetSpecs);

  sheet.appendChild(
    createEl(
      "p",
      "services-studio-sheet-prose",
      "8-chapter monograph formatted with deterministic telemetry bars, Linnaean classification matrix, and bilingual glossary annotations ready for lab binders or field export.",
    ),
  );

  const sheetFooter = createEl("div", "services-studio-sheet-foot");
  sheetFooter.appendChild(createEl("span", "", "LocalStorage Herbarium: Saved ✓"));
  sheetFooter.appendChild(createEl("span", "", "A4 Monochrome @media print Ready"));
  sheet.appendChild(sheetFooter);

  const modes =
    Array.isArray(studioCfg.modes) && studioCfg.modes.length > 0
      ? studioCfg.modes
      : [
          { id: "screen", label: "Dark Conservatory Screen Mode" },
          { id: "print", label: "High-Contrast Print / PDF Field Sheet (@media print)" },
        ];

  let activeMode = modes[0].id;
  const modeButtons = [];

  const applyMode = (modeId) => {
    activeMode = modeId;
    const isPrint = modeId === "print";
    sheet.classList.toggle("is-mode-print", isPrint);
    sheet.classList.toggle("is-mode-screen", !isPrint);
    sheetModeBadge.textContent = isPrint ? "@MEDIA PRINT A4" : "DARK CONSERVATORY";
    modeButtons.forEach(({ id, btn }) => {
      const current = id === modeId;
      btn.classList.toggle("is-active", current);
      btn.setAttribute("aria-selected", String(current));
    });
  };

  modes.forEach((m) => {
    const btn = createEl(
      "button",
      `services-studio-mode-btn${m.id === activeMode ? " is-active" : ""}`,
      m.label,
    );
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(m.id === activeMode));
    btn.addEventListener("click", () => applyMode(m.id));
    modeBar.appendChild(btn);
    modeButtons.push({ id: m.id, btn });
  });

  previewWrap.appendChild(modeBar);
  previewWrap.appendChild(sheet);

  // Right: 3 Studio Feature Cards
  const featCol = createEl("div", "services-studio-features");
  (studioCfg.features || []).forEach((feat) => {
    const fCard = createEl("article", "services-studio-feature-card");
    fCard.appendChild(createEl("span", "services-studio-feature-badge", feat.badge || ""));
    fCard.appendChild(createEl("h3", "services-studio-feature-title", feat.title || ""));
    fCard.appendChild(createEl("p", "services-studio-feature-desc", feat.description || ""));
    featCol.appendChild(fCard);
  });

  layout.appendChild(previewWrap);
  layout.appendChild(featCol);
  container.appendChild(layout);
  section.appendChild(container);
  return section;
}

function renderStandardsAndCtaSection(standardsCfg) {
  const section = createEl("section", "services-section services-section--final");
  section.id = "services-open-standards";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      standardsCfg.eyebrow || "10. Open Botanical Standards & Ecosystem",
      standardsCfg.heading || "Engineered for Academic Interoperability, Accessibility & Privacy",
      standardsCfg.lead || "",
    ),
  );

  const cardsGrid = createEl("div", "services-standards-grid");
  (standardsCfg.cards || []).forEach((item) => {
    const card = createEl("article", "services-standard-card");
    card.appendChild(createEl("span", "services-standard-badge", item.badge || ""));
    card.appendChild(createEl("h3", "services-standard-title", item.title || ""));
    card.appendChild(createEl("p", "services-standard-desc", item.description || ""));
    cardsGrid.appendChild(card);
  });
  container.appendChild(cardsGrid);

  const cta = standardsCfg.ctaBanner || {};
  const banner = createEl("div", "services-final-cta-banner");
  const copyCol = createEl("div", "services-final-cta-copy");
  copyCol.appendChild(
    createEl(
      "span",
      "services-final-cta-eyebrow",
      cta.eyebrow || "Begin Your Botanical Exploration",
    ),
  );
  copyCol.appendChild(
    createEl(
      "h3",
      "services-final-cta-heading",
      cta.heading || "Explore 50 Curated Monographs or Query Any Plant Worldwide",
    ),
  );
  copyCol.appendChild(
    createEl(
      "p",
      "services-final-cta-text",
      cta.copy ||
        "Move seamlessly between Plantipedia's hand-edited flagship flora archive and the live Worldwide Botanical Server Gateway.",
    ),
  );

  const btnGroup = createEl("div", "services-final-cta-actions");
  const primary = createEl(
    "a",
    "specimen-nf-btn specimen-nf-btn--primary",
    cta.primaryCta?.label || "Explore 50 Curated Species →",
  );
  primary.href = sanitizeUrl(cta.primaryCta?.href, "./species/");

  const secondary = createEl(
    "a",
    "specimen-nf-btn specimen-nf-btn--gateway",
    cta.secondaryCta?.label || "Launch Global Server Gateway →",
  );
  secondary.href = resolveRootPath(
    cta.secondaryCta?.href || "./#worldwide-gateway",
  );

  btnGroup.appendChild(primary);
  btnGroup.appendChild(secondary);
  banner.appendChild(copyCol);
  banner.appendChild(btnGroup);

  container.appendChild(banner);
  section.appendChild(container);
  return section;
}

export function renderServicesPortal(
  mountEl,
  { pageData, speciesIndex = [], seasonsData = null, glossaryData = null } = {},
) {
  if (!mountEl || !pageData) return;

  if (pageData.seo) {
    applyPageSeo(pageData.seo);
  }

  const seasons = Array.isArray(seasonsData?.seasons)
    ? seasonsData.seasons
    : FALLBACK_SEASONS;
  const metrics = computeArchiveMetrics(speciesIndex, seasons);

  const portal = createEl("div", "services-portal");
  portal.appendChild(
    renderHeroAndTelemetry(pageData.banner || {}, pageData.telemetry || [], metrics),
  );

  const telemetryBand = createEl("section", "services-telemetry-band");
  telemetryBand.setAttribute("aria-label", "Research suite key metrics");
  const telemetryContainer = createEl("div", "section-container");
  telemetryContainer.appendChild(
    createTelemetryStatsGrid(buildServicesTelemetryStats(), {
      ariaLabel: "Plantipedia research suite telemetry metrics",
      sectionId: "servicesTelemetryStatsGrid",
    }),
  );
  telemetryBand.appendChild(telemetryContainer);
  portal.appendChild(telemetryBand);

  portal.appendChild(renderComparisonSection(pageData.comparison || {}));
  portal.appendChild(renderAnalyticsSection(pageData.analytics || {}, metrics));
  portal.appendChild(renderToolkitSection(pageData.toolkit || {}));
  portal.appendChild(
    renderSandboxSection(pageData.sandbox || {}, speciesIndex, glossaryData),
  );
  portal.appendChild(renderPathwaysSection(pageData.pathways || {}));
  portal.appendChild(renderGlobalArchitectureSection(pageData.globalArchitecture || {}));
  portal.appendChild(renderSynthesisPipelineSection(pageData.pipeline || {}));
  portal.appendChild(renderFieldStudioSection(pageData.fieldStudio || {}));
  portal.appendChild(renderStandardsAndCtaSection(pageData.standardsCta || {}));

  mountEl.replaceChildren(portal);
  renderServicesMapMatrix(portal, pageData.sectionIndex);
  initServicesAnimations(portal);
}
