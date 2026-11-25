/**
 * Distraction-Free Split Specimen Comparison Result View (/compare/result/)
 * - Renders ONLY the compact utility header + full side-by-side comparison matrix
 * - Supports curated local monographs and Global Botanical Server species
 * - Redirects gracefully to ../ when visited without valid non-duplicate left & right params
 */

import { createEl, sanitizeUrl } from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { fetchSpeciesMonograph, normalizeSpeciesSlug } from "../../engines/global-server/api.js";
import { applyCompareSeo } from "../utils/seo.js";
import {
  ensureGsapWithScrollTrigger,
  extractPlantTelemetryStats,
} from "../../core/telemetry/telemetry-stats.js";
import {
  fetchFromGlobalBotanicalServer,
  getCachedGlobalMonograph,
  normalizeGlobalQuery,
  runGlobalServerTelemetry,
} from "../../engines/global-server/global-botanical-server.js";

const PLACEHOLDER_PLATE = "./assets/images/placeholder-botanical.svg";

const DEFAULT_SEASONS_META = [
  { id: "grishmo", nameEn: "Summer", nameBn: "গ্রীষ্ম", transliteration: "Grishmo", gregorianRange: "Mid-Apr – Mid-Jun" },
  { id: "borsha", nameEn: "Monsoon", nameBn: "বর্ষা", transliteration: "Borsha", gregorianRange: "Mid-Jun – Mid-Aug" },
  { id: "shorot", nameEn: "Autumn", nameBn: "শরৎ", transliteration: "Shorot", gregorianRange: "Mid-Aug – Mid-Oct" },
  { id: "hemonto", nameEn: "Late Autumn", nameBn: "হেমন্ত", transliteration: "Hemonto", gregorianRange: "Mid-Oct – Mid-Dec" },
  { id: "sheet", nameEn: "Winter", nameBn: "শীত", transliteration: "Sheet", gregorianRange: "Mid-Dec – Mid-Feb" },
  { id: "boshonto", nameEn: "Spring", nameBn: "বসন্ত", transliteration: "Boshonto", gregorianRange: "Mid-Feb – Mid-Apr" },
];

function createIconSvg(paths, size = 16) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  paths.forEach((d) => {
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  });
  return svg;
}

function redirectBackToSelector() {
  window.location.replace(resolveRootPath("./compare/"));
}

function redirectToCompare404(reason, query) {
  const params = new URLSearchParams({
    reason: reason || "invalid",
    q: query || "",
    from: "compare",
  });
  window.location.replace(resolveRootPath(`./404.html?${params.toString()}`));
}

function parseSpecimenParams() {
  const params = new URLSearchParams(window.location.search);

  const leftGlobalRaw = params.get("leftGlobal");
  const rightGlobalRaw = params.get("rightGlobal");

  const rawLeft = leftGlobalRaw || params.get("left") || params.get("a") || "";
  const rawRight = rightGlobalRaw || params.get("right") || params.get("b") || "";

  const leftType =
    leftGlobalRaw || params.get("leftType") === "global" ? "global" : "local";
  const rightType =
    rightGlobalRaw || params.get("rightType") === "global" ? "global" : "local";

  return {
    left: leftType === "global" ? normalizeGlobalQuery(rawLeft) : normalizeSpeciesSlug(rawLeft),
    right: rightType === "global" ? normalizeGlobalQuery(rawRight) : normalizeSpeciesSlug(rawRight),
    leftType,
    rightType,
  };
}

function formatTelemetryValue(stat) {
  if (!stat) return "N/A";
  const decimals = Number.isFinite(stat.decimals)
    ? stat.decimals
    : Number.isInteger(stat.value)
      ? 0
      : 1;
  const numStr = decimals > 0 ? Number(stat.value).toFixed(decimals) : String(Math.round(stat.value));
  return `${stat.prefix || ""}${numStr}${stat.suffix || ""}`;
}

function normalizeHeightToCm(stat) {
  if (!stat) return 0;
  const val = Number(stat.value) || 0;
  const suffix = String(stat.suffix || "").toLowerCase();
  if (suffix === "cm") return val;
  if (suffix === "mm") return val / 10;
  return val * 100;
}

function normalizeLifespanToDays(stat) {
  if (!stat) return 0;
  const val = Number(stat.value) || 0;
  const suffix = String(stat.suffix || "").toLowerCase();
  if (suffix === "d" || suffix === "days") return val;
  if (suffix === "wks" || suffix === "weeks") return val * 7;
  return val * 365;
}

function findPlantSection(plant, keywordRe, fallbackNumber) {
  const sections = Array.isArray(plant?.sections) ? plant.sections : [];
  const byTitle = sections.find((sec) => keywordRe.test(String(sec.title || "")));
  if (byTitle) return byTitle;
  return sections.find((sec) => sec.number === fallbackNumber) || sections[0] || null;
}

function getSpecimenImageUrl(plant) {
  const candidate =
    plant?.heroImage?.url ||
    plant?.thumbnailUrl ||
    plant?.heroImage?.fallbackUrl ||
    PLACEHOLDER_PLATE;
  return sanitizeUrl(candidate, PLACEHOLDER_PLATE);
}

function getSpecimenMonographHref(spec) {
  if (spec.type === "global" || spec.plant.isGlobalLive) {
    const q = spec.query || spec.plant.query || spec.plant.commonName;
    return resolveRootPath(`./plant/live/?q=${encodeURIComponent(q)}&cached=1`);
  }
  return resolveRootPath(`./plant/?species=${encodeURIComponent(spec.plant.slug)}`);
}

function buildReturnHref(parsed) {
  const params = new URLSearchParams();
  if (parsed.leftType === "global") {
    params.set("left", parsed.left);
    params.set("leftType", "global");
  } else {
    params.set("left", parsed.left);
  }
  if (parsed.rightType === "global") {
    params.set("right", parsed.right);
    params.set("rightType", "global");
  } else {
    params.set("right", parsed.right);
  }
  return resolveRootPath(`./compare/?${params.toString()}`);
}

function buildTopHeader(parsed, leftPlant, rightPlant) {
  const header = createEl("header", "compare-result-header");
  const inner = createEl("div", "compare-result-header-inner");

  const backLink = createEl("a", "compare-result-back-btn");
  backLink.href = buildReturnHref(parsed);
  backLink.appendChild(createIconSvg(["m15 18-6-6 6-6"], 16));
  backLink.appendChild(createEl("span", "", "Change Specimens"));

  const titleGroup = createEl("div", "compare-result-title-group");
  titleGroup.appendChild(createEl("h1", "compare-result-title", "Split Specimen Comparison"));
  titleGroup.appendChild(
    createEl(
      "p",
      "compare-result-subtitle",
      `${leftPlant.commonName} (${leftPlant.scientificName}) vs. ${rightPlant.commonName} (${rightPlant.scientificName})`,
    ),
  );

  const actions = createEl("div", "compare-result-header-actions");
  const exportBtn = createEl("button", "compare-result-export-btn");
  exportBtn.type = "button";
  exportBtn.appendChild(
    createIconSvg(
      [
        "M6 9V2h12v7",
        "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
        "M6 14h12v8H6z",
      ],
      16,
    ),
  );
  exportBtn.appendChild(createEl("span", "", "Export Comparison (PDF)"));
  exportBtn.addEventListener("click", () => {
    window.print();
  });
  actions.appendChild(exportBtn);

  inner.appendChild(backLink);
  inner.appendChild(titleGroup);
  inner.appendChild(actions);
  header.appendChild(inner);
  return header;
}

function buildHeroCard(spec, sideLabel) {
  const { plant } = spec;
  const card = createEl("article", `compare-hero-card compare-hero-card--${spec.side}`);

  const mediaWrap = createEl("div", "compare-hero-media");
  const img = document.createElement("img");
  img.className = "compare-hero-img";
  img.src = getSpecimenImageUrl(plant);
  img.alt = plant.heroImage?.alt || `${plant.commonName} botanical specimen`;
  img.loading = "eager";
  img.decoding = "async";
  img.addEventListener("error", () => {
    const fallbackHref = resolveRootPath(PLACEHOLDER_PLATE);
    if (img.src !== fallbackHref) {
      img.src = fallbackHref;
    }
  });
  mediaWrap.appendChild(img);

  const sourceLabel = plant.isGlobalLive ? "GLOBAL FLORA INDEX" : "CURATED ARCHIVE";
  const badgeOverlay = createEl("div", "compare-hero-badges");
  badgeOverlay.appendChild(
    createEl(
      "span",
      `compare-source-badge${plant.isGlobalLive ? " is-global" : ""}`,
      sourceLabel,
    ),
  );
  badgeOverlay.appendChild(createEl("span", "compare-side-tag", sideLabel));
  mediaWrap.appendChild(badgeOverlay);
  card.appendChild(mediaWrap);

  const body = createEl("div", "compare-hero-body");

  const metaRow = createEl("div", "compare-hero-meta");
  metaRow.appendChild(createEl("span", "compare-category-pill", plant.category || "Botanical Taxon"));
  if (plant.specimenId) {
    metaRow.appendChild(createEl("span", "compare-id-mono", plant.specimenId));
  }
  body.appendChild(metaRow);

  const nameRow = createEl("div", "compare-hero-names");
  nameRow.appendChild(createEl("h2", "compare-hero-common", plant.commonName));
  const bnLabel = plant.localName || plant.commonNameBn || "";
  if (bnLabel) {
    nameRow.appendChild(createEl("span", "compare-hero-bn", bnLabel));
  }
  body.appendChild(nameRow);

  body.appendChild(createEl("p", "compare-hero-sci", plant.scientificName || ""));
  if (plant.overview?.family) {
    body.appendChild(
      createEl(
        "p",
        "compare-hero-family",
        plant.familyBn
          ? `Family: ${plant.overview.family} (${plant.familyBn})`
          : `Family: ${plant.overview.family}`,
      ),
    );
  }

  body.appendChild(
    createEl("p", "compare-hero-summary", plant.leadOverview || plant.shortSummary || ""),
  );

  const footer = createEl("div", "compare-hero-footer");
  const openLink = createEl("a", "compare-hero-link", "Open Full Monograph →");
  openLink.href = getSpecimenMonographHref(spec);
  footer.appendChild(openLink);
  body.appendChild(footer);

  card.appendChild(body);
  return card;
}

function buildSectionShell(number, title, subtitle) {
  const sec = createEl("section", "compare-matrix-section");
  const head = createEl("div", "compare-matrix-section-head");
  head.appendChild(createEl("span", "compare-matrix-num", number));
  const headText = createEl("div", "compare-matrix-head-text");
  headText.appendChild(createEl("h2", "compare-matrix-title", title));
  if (subtitle) {
    headText.appendChild(createEl("p", "compare-matrix-sub", subtitle));
  }
  head.appendChild(headText);
  sec.appendChild(head);
  return sec;
}

function buildTaxonomySection(leftPlant, rightPlant) {
  const sec = buildSectionShell(
    "01",
    "Scientific Taxonomy",
    "Linnaean hierarchy, growth habit, and biogeographic classification",
  );

  const tableWrap = createEl("div", "compare-taxonomy-table-wrap");
  const table = createEl("table", "compare-taxonomy-table");

  const thead = document.createElement("thead");
  const hRow = document.createElement("tr");
  hRow.appendChild(createEl("th", "", "Taxonomic Field"));
  hRow.appendChild(createEl("th", "is-left", leftPlant.commonName));
  hRow.appendChild(createEl("th", "is-right", rightPlant.commonName));
  thead.appendChild(hRow);
  table.appendChild(thead);

  const rows = [
    ["Plant Group", leftPlant.overview?.plantGroup || "—", rightPlant.overview?.plantGroup || "—"],
    ["Taxonomic Domain", leftPlant.taxonomicDomain || leftPlant.category || "—", rightPlant.taxonomicDomain || rightPlant.category || "—"],
    [
      "Botanical Family",
      leftPlant.familyBn
        ? `${leftPlant.overview?.family || "—"} (${leftPlant.familyBn})`
        : leftPlant.overview?.family || "—",
      rightPlant.familyBn
        ? `${rightPlant.overview?.family || "—"} (${rightPlant.familyBn})`
        : rightPlant.overview?.family || "—",
    ],
    ["Genus", leftPlant.overview?.genus || "—", rightPlant.overview?.genus || "—"],
    ["Species Epithet", leftPlant.overview?.species || leftPlant.scientificName || "—", rightPlant.overview?.species || rightPlant.scientificName || "—"],
    ["Growth Habit", leftPlant.overview?.growthForm || "—", rightPlant.overview?.growthForm || "—"],
    ["Native Origin", leftPlant.overview?.nativeOrigin || "—", rightPlant.overview?.nativeOrigin || "—"],
    ["Common Uses", leftPlant.overview?.commonUses || "—", rightPlant.overview?.commonUses || "—"],
  ];

  const tbody = document.createElement("tbody");
  rows.forEach(([field, valL, valR]) => {
    const tr = document.createElement("tr");
    tr.appendChild(createEl("th", "compare-tax-field", field));
    const tdL = createEl("td", "compare-tax-val is-left", valL);
    tdL.dataset.specimenLabel = leftPlant.commonName;
    const tdR = createEl("td", "compare-tax-val is-right", valR);
    tdR.dataset.specimenLabel = rightPlant.commonName;
    tr.appendChild(tdL);
    tr.appendChild(tdR);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  sec.appendChild(tableWrap);
  return sec;
}

function buildTelemetrySection(leftPlant, rightPlant) {
  const sec = buildSectionShell(
    "02",
    "Numerical Telemetry Comparison Bars",
    "Proportional comparison across mature stature, substrate pH, climate envelope, and longevity",
  );

  const leftStats = extractPlantTelemetryStats(leftPlant);
  const rightStats = extractPlantTelemetryStats(rightPlant);

  const heightCmL = normalizeHeightToCm(leftStats[0]);
  const heightCmR = normalizeHeightToCm(rightStats[0]);
  const maxHeightCm = Math.max(heightCmL, heightCmR, 100);

  const phL = Number(leftStats[1]?.value) || 6.5;
  const phR = Number(rightStats[1]?.value) || 6.5;

  const lifeDaysL = normalizeLifespanToDays(leftStats[2]);
  const lifeDaysR = normalizeLifespanToDays(rightStats[2]);
  const maxLifeDays = Math.max(lifeDaysL, lifeDaysR, 365);

  const climL = Number(leftStats[3]?.value) || 30;
  const climR = Number(rightStats[3]?.value) || 30;
  const climMax =
    String(leftStats[3]?.suffix || "").toLowerCase() === "hrs" &&
    String(rightStats[3]?.suffix || "").toLowerCase() === "hrs"
      ? 12
      : Math.max(climL, climR, 45);

  const metricSpecs = [
    {
      title: "Mature Stature / Canopy Scale",
      leftStat: leftStats[0],
      rightStat: rightStats[0],
      pctL: Math.max(8, Math.min(100, Math.round((heightCmL / maxHeightCm) * 100))),
      pctR: Math.max(8, Math.min(100, Math.round((heightCmR / maxHeightCm) * 100))),
    },
    {
      title: "Optimal Substrate / Soil pH",
      leftStat: leftStats[1],
      rightStat: rightStats[1],
      pctL: Math.max(12, Math.min(100, Math.round((phL / 9.5) * 100))),
      pctR: Math.max(12, Math.min(100, Math.round((phR / 9.5) * 100))),
    },
    {
      title: "Longevity / Phenological Cycle",
      leftStat: leftStats[2],
      rightStat: rightStats[2],
      pctL: Math.max(8, Math.min(100, Math.round((lifeDaysL / maxLifeDays) * 100))),
      pctR: Math.max(8, Math.min(100, Math.round((lifeDaysR / maxLifeDays) * 100))),
    },
    {
      title: "Thermal / Solar Operating Window",
      leftStat: leftStats[3],
      rightStat: rightStats[3],
      pctL: Math.max(12, Math.min(100, Math.round((climL / climMax) * 100))),
      pctR: Math.max(12, Math.min(100, Math.round((climR / climMax) * 100))),
    },
  ];

  const grid = createEl("div", "compare-telemetry-grid");
  metricSpecs.forEach((m) => {
    const card = createEl("article", "compare-telemetry-card");
    card.appendChild(createEl("h3", "compare-telemetry-card-title", m.title));

    const bars = createEl("div", "compare-telemetry-bars");

    const buildRow = (plantName, stat, pct, sideCls) => {
      const row = createEl("div", "compare-bar-row");
      const rowHead = createEl("div", "compare-bar-head");
      const labelSide = createEl("div", "compare-bar-label-group");
      labelSide.appendChild(createEl("span", `compare-bar-species is-${sideCls}`, plantName));
      labelSide.appendChild(createEl("span", "compare-bar-metric-name", stat?.label || ""));
      rowHead.appendChild(labelSide);

      const finalText = formatTelemetryValue(stat);
      const valEl = createEl("span", "compare-bar-value", finalText);
      const targetNum = Number(stat?.value) || 0;
      const decimals = Number.isFinite(stat?.decimals)
        ? stat.decimals
        : Number.isInteger(targetNum)
          ? 0
          : 1;
      valEl.dataset.targetValue = String(targetNum);
      valEl.dataset.decimals = String(decimals);
      valEl.dataset.prefix = stat?.prefix || "";
      valEl.dataset.suffix = stat?.suffix || "";
      valEl.dataset.finalText = finalText;
      valEl.setAttribute("aria-label", `${plantName} ${stat?.label || ""}: ${finalText}`);
      rowHead.appendChild(valEl);

      const track = createEl("div", "compare-bar-track");
      const fill = createEl("div", `compare-bar-fill compare-bar-fill--${sideCls}`);
      fill.style.width = `${pct}%`;
      fill.dataset.targetPct = String(pct);
      track.appendChild(fill);

      row.appendChild(rowHead);
      row.appendChild(track);
      if (stat?.subtext) {
        row.appendChild(createEl("p", "compare-bar-subtext", stat.subtext));
      }
      return row;
    };

    bars.appendChild(buildRow(leftPlant.commonName, m.leftStat, m.pctL, "left"));
    bars.appendChild(buildRow(rightPlant.commonName, m.rightStat, m.pctR, "right"));
    card.appendChild(bars);
    grid.appendChild(card);
  });

  sec.appendChild(grid);
  return sec;
}

function buildMorphologySection(leftPlant, rightPlant) {
  const sec = buildSectionShell(
    "03",
    "Morphology & Structural Architecture",
    "Comparative vegetative habit, bark/stems, foliar venation, floral structures, and root systems",
  );

  const dualGrid = createEl("div", "compare-dual-cards");

  [
    { plant: leftPlant, side: "left" },
    { plant: rightPlant, side: "right" },
  ].forEach(({ plant, side }) => {
    const card = createEl("article", `compare-detail-card compare-detail-card--${side}`);
    const cardHead = createEl("div", "compare-detail-head");
    cardHead.appendChild(createEl("span", `compare-detail-tag is-${side}`, plant.commonName));
    const morphSec = findPlantSection(plant, /morpholog|description|anatomy/i, "01");
    cardHead.appendChild(
      createEl("h3", "compare-detail-heading", morphSec?.subtitle || morphSec?.title || "Morphological Profile"),
    );
    card.appendChild(cardHead);

    const paragraphs = Array.isArray(morphSec?.paragraphs) ? morphSec.paragraphs : [];
    if (paragraphs.length > 0) {
      paragraphs.slice(0, 2).forEach((p) => {
        card.appendChild(createEl("p", "compare-detail-prose", p));
      });
    } else {
      card.appendChild(
        createEl(
          "p",
          "compare-detail-prose",
          plant.overview?.growthForm || plant.leadOverview || "Morphological record available in full monograph.",
        ),
      );
    }

    const subblocks = Array.isArray(morphSec?.subblocks) ? morphSec.subblocks : [];
    if (subblocks.length > 0) {
      const subGrid = createEl("div", "compare-subblocks-grid");
      subblocks.forEach((sb) => {
        const box = createEl("div", "compare-subblock");
        box.appendChild(createEl("h4", "compare-subblock-title", sb.heading));
        box.appendChild(createEl("p", "compare-subblock-text", sb.text));
        subGrid.appendChild(box);
      });
      card.appendChild(subGrid);
    }

    dualGrid.appendChild(card);
  });

  sec.appendChild(dualGrid);
  return sec;
}

function buildHabitatSection(leftPlant, rightPlant) {
  const sec = buildSectionShell(
    "04",
    "Habitat & Cultivation Envelope",
    "Natural biogeographic distribution, edaphic soil chemistry, solar irradiance, and irrigation profile",
  );

  const dualGrid = createEl("div", "compare-dual-cards");

  [
    { plant: leftPlant, side: "left" },
    { plant: rightPlant, side: "right" },
  ].forEach(({ plant, side }) => {
    const card = createEl("article", `compare-detail-card compare-detail-card--${side}`);
    const cardHead = createEl("div", "compare-detail-head");
    cardHead.appendChild(createEl("span", `compare-detail-tag is-${side}`, plant.commonName));
    const habSec = findPlantSection(plant, /habitat|distribution|ecology|range/i, "03");
    cardHead.appendChild(
      createEl("h3", "compare-detail-heading", habSec?.subtitle || habSec?.title || "Habitat & Ecological Range"),
    );
    card.appendChild(cardHead);

    const paragraphs = Array.isArray(habSec?.paragraphs) ? habSec.paragraphs : [];
    if (paragraphs.length > 0) {
      paragraphs.slice(0, 2).forEach((p) => {
        card.appendChild(createEl("p", "compare-detail-prose", p));
      });
    } else if (plant.overview?.nativeOrigin) {
      card.appendChild(createEl("p", "compare-detail-prose", plant.overview.nativeOrigin));
    }

    const stats = extractPlantTelemetryStats(plant);
    const tel = plant.cultivationTelemetry || {};
    const specsGrid = createEl("div", "compare-care-pills");
    const carePairs = [
      ["Native Distribution", plant.overview?.nativeOrigin || "Broad Tropical / Global Range"],
      ["Soil pH Envelope", tel.phOptimalLabel || plant.overview?.phRange || `pH ${stats[1]?.value ?? 6.5}`],
      ["Solar Exposure", tel.sunlightLabel || plant.overview?.sunlight || `${stats[3]?.value ?? 30}${stats[3]?.suffix || "°C"}`],
      ["Moisture & Substrate", [tel.irrigationLabel, tel.soilDrainageLabel].filter(Boolean).join(" · ") || "Well-drained organic loam"],
    ];

    carePairs.forEach(([k, v]) => {
      const item = createEl("div", "compare-care-item");
      item.appendChild(createEl("span", "compare-care-key", k));
      item.appendChild(createEl("span", "compare-care-val", v));
      specsGrid.appendChild(item);
    });
    card.appendChild(specsGrid);

    dualGrid.appendChild(card);
  });

  sec.appendChild(dualGrid);
  return sec;
}

function buildPhenologySection(leftPlant, rightPlant, seasonsData) {
  const sec = buildSectionShell(
    "05",
    "Seasonal Phenology",
    "Flowering, fruiting, vegetative flush, and dormancy cadence across Bengal's six ecological seasons (ষড়ঋতু)",
  );

  const seasonsList =
    Array.isArray(seasonsData?.seasons) && seasonsData.seasons.length > 0
      ? seasonsData.seasons
      : DEFAULT_SEASONS_META;

  const dualGrid = createEl("div", "compare-dual-cards");

  [
    { plant: leftPlant, side: "left" },
    { plant: rightPlant, side: "right" },
  ].forEach(({ plant, side }) => {
    const card = createEl("article", `compare-detail-card compare-detail-card--${side}`);
    const cardHead = createEl("div", "compare-detail-head");
    cardHead.appendChild(createEl("span", `compare-detail-tag is-${side}`, plant.commonName));
    cardHead.appendChild(
      createEl(
        "h3",
        "compare-detail-heading",
        plant.isGlobalLive ? "Global Lifecycle & Climate Cadence" : "Shororitu Phenological Cycle",
      ),
    );
    card.appendChild(cardHead);

    const activeSeasons = Array.isArray(plant.seasons) ? plant.seasons : [];
    const phenoMap = plant.seasonalPhenology && typeof plant.seasonalPhenology === "object"
      ? plant.seasonalPhenology
      : null;

    if (phenoMap || activeSeasons.length > 0) {
      const list = createEl("div", "compare-phenology-list");
      seasonsList.forEach((s) => {
        const isActive = activeSeasons.includes(s.id);
        const note = phenoMap?.[s.id] || (isActive ? "Active growth / reproductive phase documented." : "Maintenance / vegetative rest period.");
        const row = createEl(
          "div",
          `compare-phenology-row${isActive ? " is-active-season" : ""}`,
        );
        const sHead = createEl("div", "compare-phenology-season");
        sHead.appendChild(createEl("span", "compare-phenology-en", `${s.nameEn} (${s.nameBn})`));
        sHead.appendChild(
          createEl(
            "span",
            `compare-phenology-status${isActive ? " is-active" : ""}`,
            isActive ? "Active Peak" : "Vegetative / Rest",
          ),
        );
        row.appendChild(sHead);
        row.appendChild(createEl("p", "compare-phenology-note", note));
        list.appendChild(row);
      });
      card.appendChild(list);
    } else {
      const lifeSec = findPlantSection(plant, /propagation|husbandry|cultivation|telemetry/i, "06");
      const lifespanText = plant.overview?.lifespan || "Perennial";
      card.appendChild(
        createEl(
          "p",
          "compare-detail-prose",
          `${plant.commonName} follows a ${lifespanText.toLowerCase()} biological cycle indexed via the Global Flora Index. Growth activity peaks during warm, photoperiod-favorable seasons aligned with ${plant.overview?.sunlight || "ambient solar exposure"} and ${plant.overview?.temperatureRange || "18–32 °C"}.`,
        ),
      );
      if (lifeSec?.paragraphs?.[0]) {
        card.appendChild(createEl("p", "compare-detail-prose", lifeSec.paragraphs[0]));
      }
      const badgeStrip = createEl("div", "compare-care-pills");
      [
        ["Lifecycle Class", lifespanText],
        ["Taxon Category", plant.category || "Global Flora"],
        ["Thermal Envelope", plant.overview?.temperatureRange || "18–32 °C"],
      ].forEach(([k, v]) => {
        const item = createEl("div", "compare-care-item");
        item.appendChild(createEl("span", "compare-care-key", k));
        item.appendChild(createEl("span", "compare-care-val", v));
        badgeStrip.appendChild(item);
      });
      card.appendChild(badgeStrip);
    }

    dualGrid.appendChild(card);
  });

  sec.appendChild(dualGrid);
  return sec;
}

export async function renderCompareResultWorkspace(
  mountEl,
  { pageData, speciesIndex, seasonsData },
) {
  if (!mountEl) return;

  const parsed = parseSpecimenParams();
  if (!parsed.left || !parsed.right) {
    redirectBackToSelector();
    return;
  }

  if (
    parsed.left.toLowerCase() === parsed.right.toLowerCase() &&
    parsed.leftType === parsed.rightType
  ) {
    redirectBackToSelector();
    return;
  }

  const indexList = Array.isArray(speciesIndex) ? speciesIndex : [];
  const speciesBySlug = new Map(indexList.map((sp) => [sp.slug.toLowerCase(), sp]));

  if (parsed.leftType === "local" && !speciesBySlug.has(parsed.left)) {
    redirectBackToSelector();
    return;
  }
  if (parsed.rightType === "local" && !speciesBySlug.has(parsed.right)) {
    redirectBackToSelector();
    return;
  }

  async function resolveLocalSpecimen(slug) {
    const indexEntry = speciesBySlug.get(slug) || {};
    const monograph = await fetchSpeciesMonograph(slug);
    return {
      ...indexEntry,
      ...monograph,
      commonNameBn: monograph.localName || indexEntry.commonNameBn || "",
      familyBn: indexEntry.familyBn || "",
      taxonomicDomain: monograph.taxonomicDomain || indexEntry.taxonomicDomain || "",
      seasons: indexEntry.seasons || [],
      seasonalPhenology: indexEntry.seasonalPhenology || null,
      thumbnailUrl: indexEntry.thumbnailUrl || monograph.heroImage?.url || PLACEHOLDER_PLATE,
    };
  }

  let leftPlant = null;
  let rightPlant = null;

  try {
    const uncachedGlobals = [];
    if (parsed.leftType === "global") {
      leftPlant = getCachedGlobalMonograph(parsed.left);
      if (!leftPlant) uncachedGlobals.push({ side: "left", query: parsed.left });
    }
    if (parsed.rightType === "global") {
      rightPlant = getCachedGlobalMonograph(parsed.right);
      if (!rightPlant) uncachedGlobals.push({ side: "right", query: parsed.right });
    }

    if (uncachedGlobals.length > 0) {
      const label = uncachedGlobals.map((item) => item.query).join(" & ");
      const telemetryOutcome = await runGlobalServerTelemetry({
        container: mountEl,
        queryLabel: label,
        work: async ({ signal, onRetry }) => {
          const resolvedMap = {};
          for (const item of uncachedGlobals) {
            const res = await fetchFromGlobalBotanicalServer(item.query, { signal, onRetry });
            if (!res?.ok || !res.monograph) {
              return { ok: false, reason: res?.reason || "invalid", failedQuery: item.query };
            }
            resolvedMap[item.side] = res.monograph;
          }
          return { ok: true, resolvedMap };
        },
        onAbort: () => {
          window.location.href = buildReturnHref(parsed);
        },
      });

      if (telemetryOutcome.aborted) return;

      const res = telemetryOutcome.result;
      if (!res?.ok) {
        redirectToCompare404(res?.reason || "invalid", res?.failedQuery || label);
        return;
      }

      if (res.resolvedMap?.left) leftPlant = res.resolvedMap.left;
      if (res.resolvedMap?.right) rightPlant = res.resolvedMap.right;
    }

    const [resolvedL, resolvedR] = await Promise.all([
      leftPlant ? Promise.resolve(leftPlant) : resolveLocalSpecimen(parsed.left),
      rightPlant ? Promise.resolve(rightPlant) : resolveLocalSpecimen(parsed.right),
    ]);

    leftPlant = resolvedL;
    rightPlant = resolvedR;
  } catch (err) {
    console.error("Split comparison hydration failed:", err);
    redirectBackToSelector();
    return;
  }

  try {
    applyCompareSeo({ pageData, leftPlant, rightPlant });
  } catch {
    // Non-blocking SEO metadata update
  }

  const leftSpec = { side: "left", type: parsed.leftType, query: parsed.left, plant: leftPlant };
  const rightSpec = { side: "right", type: parsed.rightType, query: parsed.right, plant: rightPlant };

  const workspace = createEl("div", "compare-result-shell");
  workspace.appendChild(buildTopHeader(parsed, leftPlant, rightPlant));

  const matrix = createEl("div", "compare-matrix-shell");

  const heroGrid = createEl("section", "compare-hero-grid");
  heroGrid.setAttribute("aria-label", "Specimen Hero Comparison");
  heroGrid.appendChild(buildHeroCard(leftSpec, "LEFT SPECIMEN"));
  heroGrid.appendChild(buildHeroCard(rightSpec, "RIGHT SPECIMEN"));
  matrix.appendChild(heroGrid);

  matrix.appendChild(buildTaxonomySection(leftPlant, rightPlant));
  matrix.appendChild(buildTelemetrySection(leftPlant, rightPlant));
  matrix.appendChild(buildMorphologySection(leftPlant, rightPlant));
  matrix.appendChild(buildHabitatSection(leftPlant, rightPlant));
  matrix.appendChild(buildPhenologySection(leftPlant, rightPlant, seasonsData));

  workspace.appendChild(matrix);
  mountEl.replaceChildren(workspace);

  animateCompareResultWorkspace(workspace);
}

function prefersReducedMotionResult() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function formatCounterStep(val, el) {
  const decimals = Number(el.dataset.decimals || 0);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const numStr = decimals > 0 ? Number(val).toFixed(decimals) : String(Math.round(val));
  return `${prefix}${numStr}${suffix}`;
}

function restoreFinalTelemetryState(workspace) {
  if (!workspace) return;
  workspace.querySelectorAll(".compare-bar-value[data-final-text]").forEach((el) => {
    el.textContent = el.dataset.finalText;
  });
  workspace.querySelectorAll(".compare-bar-fill").forEach((fill) => {
    fill.style.transform = "";
    fill.classList.add("is-bar-revealed");
  });
  workspace.querySelectorAll(".compare-reveal-target").forEach((el) => {
    el.classList.add("is-revealed");
    el.style.opacity = "";
    el.style.transform = "";
  });
}

function runFallbackTelemetryCounters(gridEl) {
  if (!gridEl || gridEl.dataset.barsAnimated === "true") return;
  gridEl.dataset.barsAnimated = "true";

  const valueEls = Array.from(gridEl.querySelectorAll(".compare-bar-value[data-target-value]"));
  const fillEls = Array.from(gridEl.querySelectorAll(".compare-bar-fill"));

  fillEls.forEach((fill, idx) => {
    fill.style.transitionDelay = `${idx * 65}ms`;
    fill.style.transform = "";
    fill.classList.add("is-bar-revealed");
  });

  const start = performance.now();
  const duration = 1150;

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    valueEls.forEach((el) => {
      const target = Number(el.dataset.targetValue) || 0;
      el.textContent = formatCounterStep(target * eased, el);
    });
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      valueEls.forEach((el) => {
        el.textContent = el.dataset.finalText || formatCounterStep(Number(el.dataset.targetValue) || 0, el);
      });
    }
  };

  requestAnimationFrame(tick);
}

function runCssFallbackChoreography(workspace) {
  workspace.classList.add("compare-anim-fallback");

  const targets = Array.from(
    workspace.querySelectorAll(
      ".compare-result-header-inner > *, .compare-hero-card, .compare-matrix-section, .compare-taxonomy-table tbody tr, .compare-telemetry-card, .compare-detail-card, .compare-subblock, .compare-care-item, .compare-phenology-row",
    ),
  );
  const telemetryGrid = workspace.querySelector(".compare-telemetry-grid");

  targets.forEach((el, idx) => {
    el.classList.add("compare-reveal-target");
    el.style.setProperty("--compare-reveal-delay", `${(idx % 4) * 55}ms`);
  });

  if (typeof IntersectionObserver === "undefined") {
    restoreFinalTelemetryState(workspace);
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
  );

  targets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.94) {
      requestAnimationFrame(() => el.classList.add("is-revealed"));
    } else {
      revealObserver.observe(el);
    }
  });

  if (telemetryGrid) {
    const triggerBars = () => runFallbackTelemetryCounters(telemetryGrid);
    const rect = telemetryGrid.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      triggerBars();
    } else {
      const barObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            barObserver.disconnect();
            triggerBars();
          }
        },
        { threshold: 0.14 },
      );
      barObserver.observe(telemetryGrid);
    }
  }
}

async function animateCompareResultWorkspace(workspace) {
  if (!workspace || prefersReducedMotionResult()) {
    return;
  }

  const valueEls = Array.from(workspace.querySelectorAll(".compare-bar-value[data-target-value]"));
  const fillEls = Array.from(workspace.querySelectorAll(".compare-bar-fill"));
  const telemetryGrid = workspace.querySelector(".compare-telemetry-grid");

  // Stage telemetry bars and numeric readouts at 0 immediately so they count/expand smoothly on reveal
  valueEls.forEach((el) => {
    el.textContent = formatCounterStep(0, el);
  });
  fillEls.forEach((fill) => {
    fill.classList.add("is-bar-staged");
  });

  const handleBeforePrint = () => {
    if (window.gsap) {
      window.gsap.globalTimeline.progress(1);
    }
    restoreFinalTelemetryState(workspace);
  };
  window.addEventListener("beforeprint", handleBeforePrint, { once: true });

  const gsapReady =
    window.gsap && window.ScrollTrigger
      ? (() => {
          window.gsap.registerPlugin(window.ScrollTrigger);
          return true;
        })()
      : await ensureGsapWithScrollTrigger();

  if (!document.body.contains(workspace)) return;

  if (!gsapReady || !window.gsap || !window.ScrollTrigger) {
    fillEls.forEach((fill) => fill.classList.remove("is-bar-staged"));
    runCssFallbackChoreography(workspace);
    return;
  }

  const { gsap, ScrollTrigger } = window;

  // 1. Utility Header & Hero Split Entrance
  const headerChildren = Array.from(
    workspace.querySelectorAll(".compare-result-header-inner > *"),
  );
  if (headerChildren.length) {
    gsap.from(headerChildren, {
      y: 16,
      opacity: 0,
      duration: 0.56,
      ease: "power3.out",
      stagger: 0.08,
      clearProps: "transform,opacity",
    });
  }

  const heroCards = Array.from(workspace.querySelectorAll(".compare-hero-card"));
  if (heroCards.length) {
    gsap.from(heroCards, {
      y: 26,
      opacity: 0,
      duration: 0.68,
      delay: 0.08,
      ease: "power3.out",
      stagger: 0.12,
      clearProps: "transform,opacity",
    });
  }

  // 2. Scroll-choreographed Comparison Sections (01 - 05)
  const matrixSections = Array.from(workspace.querySelectorAll(".compare-matrix-section"));
  matrixSections.forEach((sec) => {
    gsap.from(sec, {
      y: 26,
      opacity: 0,
      duration: 0.65,
      ease: "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: sec,
        start: "top 88%",
        once: true,
      },
    });

    const taxRows = sec.querySelectorAll(".compare-taxonomy-table tbody tr");
    if (taxRows.length) {
      gsap.from(taxRows, {
        y: 14,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.045,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: sec.querySelector(".compare-taxonomy-table") || sec,
          start: "top 86%",
          once: true,
        },
      });
    }

    const telemetryCards = sec.querySelectorAll(".compare-telemetry-card");
    if (telemetryCards.length) {
      gsap.from(telemetryCards, {
        y: 20,
        opacity: 0,
        duration: 0.58,
        ease: "power3.out",
        stagger: 0.09,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: telemetryGrid || sec,
          start: "top 86%",
          once: true,
        },
      });
    }

    const detailCards = sec.querySelectorAll(".compare-detail-card");
    if (detailCards.length) {
      gsap.from(detailCards, {
        y: 22,
        opacity: 0,
        duration: 0.62,
        ease: "power3.out",
        stagger: 0.1,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: sec.querySelector(".compare-dual-cards") || sec,
          start: "top 86%",
          once: true,
        },
      });
    }

    const innerItems = sec.querySelectorAll(
      ".compare-subblock, .compare-care-item, .compare-phenology-row",
    );
    if (innerItems.length) {
      gsap.from(innerItems, {
        y: 14,
        opacity: 0,
        duration: 0.48,
        ease: "power2.out",
        stagger: 0.04,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: sec,
          start: "top 82%",
          once: true,
        },
      });
    }
  });

  // 3. Numerical Telemetry Bars & Counter Choreography from 0
  if (telemetryGrid && (fillEls.length > 0 || valueEls.length > 0)) {
    gsap.set(fillEls, { scaleX: 0, transformOrigin: "left center" });
    fillEls.forEach((fill) => fill.classList.remove("is-bar-staged"));

    const animateTelemetryBarsAndCounters = () => {
      if (telemetryGrid.dataset.barsAnimated === "true") return;
      telemetryGrid.dataset.barsAnimated = "true";

      gsap.to(fillEls, {
        scaleX: 1,
        duration: 1.05,
        ease: "power3.out",
        stagger: 0.07,
        clearProps: "transform",
      });

      valueEls.forEach((el, idx) => {
        const target = Number(el.dataset.targetValue) || 0;
        const proxy = { val: 0 };
        gsap.to(proxy, {
          val: target,
          duration: 1.15,
          delay: Math.min(idx * 0.05, 0.3),
          ease: "power3.out",
          onUpdate: () => {
            el.textContent = formatCounterStep(proxy.val, el);
          },
          onComplete: () => {
            el.textContent =
              el.dataset.finalText || formatCounterStep(target, el);
          },
        });
      });
    };

    ScrollTrigger.create({
      trigger: telemetryGrid,
      start: "top 86%",
      once: true,
      onEnter: animateTelemetryBarsAndCounters,
    });

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const rect = telemetryGrid.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.9) {
        animateTelemetryBarsAndCounters();
      }
    });
  } else {
    ScrollTrigger.refresh();
  }
}
