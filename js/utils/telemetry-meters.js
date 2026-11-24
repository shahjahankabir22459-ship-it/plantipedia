/**
 * Visual Cultivation & Ecological Telemetry Meters (Chapter 07 on plant.html)
 * Renders Soil pH Spectrum Meter (4.0–9.0), Sunlight Intensity bars, and Irrigation Frequency meters.
 */

import { createEl } from "./templates.js";

function inferTelemetryFromText(plant) {
  const sec07 = (plant?.sections || []).find((s) => s.number === "07");
  const corpus = [
    ...(sec07?.paragraphs || []),
    ...(sec07?.subblocks || []).map((b) => `${b.heading} ${b.text}`),
  ]
    .join(" ")
    .toLowerCase();

  let phMin = 6.0;
  let phMax = 7.2;
  const phMatch = corpus.match(
    /ph\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/i,
  );
  if (phMatch) {
    phMin = Math.max(4.0, Math.min(9.0, parseFloat(phMatch[1])));
    phMax = Math.max(phMin, Math.min(9.0, parseFloat(phMatch[2])));
  }

  let sunlightLevel = 3;
  let sunlightLabel = "Full Sun (6+ hrs direct)";
  if (
    corpus.includes("shade-tree") ||
    corpus.includes("filtered") ||
    corpus.includes("partial shade")
  ) {
    sunlightLevel = 2;
    sunlightLabel = "Partial / Filtered Shade";
  }

  let irrigationLevel = 2;
  let irrigationLabel = "Moderate Moisture";
  if (
    corpus.includes("aquatic") ||
    corpus.includes("water depth") ||
    corpus.includes("submerged")
  ) {
    irrigationLevel = 3;
    irrigationLabel = "High / Permanent Aquatic Basin";
  } else if (
    corpus.includes("drought-tolerant") ||
    corpus.includes("allow soil to dry")
  ) {
    irrigationLevel = 1;
    irrigationLabel = "Low / Drought-Tolerant";
  }

  return {
    phMin,
    phMax,
    phOptimalLabel: `pH ${phMin.toFixed(1)} – ${phMax.toFixed(1)}`,
    sunlightLevel,
    sunlightLabel,
    irrigationLevel,
    irrigationLabel,
    soilDrainageLabel: "Well-Drained Organic Loam",
  };
}

function buildSegmentedBar(level, labels, toneClass) {
  const bar = createEl("div", `telemetry-seg-bar ${toneClass}`);
  bar.setAttribute("role", "img");
  bar.setAttribute(
    "aria-label",
    labels[Math.max(0, Math.min(labels.length - 1, level - 1))],
  );

  labels.forEach((stepLabel, idx) => {
    const seg = createEl(
      "div",
      `telemetry-seg${idx < level ? " is-active" : ""}`,
    );
    seg.appendChild(createEl("span", "telemetry-seg-fill"));
    seg.appendChild(createEl("span", "telemetry-seg-caption", stepLabel));
    bar.appendChild(seg);
  });
  return bar;
}

export function renderCultivationTelemetry(plant, telemetryCfg = {}) {
  const data = plant?.cultivationTelemetry || inferTelemetryFromText(plant);
  const phMin = Math.max(4.0, Math.min(9.0, Number(data.phMin) || 6.0));
  const phMax = Math.max(phMin, Math.min(9.0, Number(data.phMax) || 7.2));

  const leftPct = ((phMin - 4.0) / 5.0) * 100;
  const widthPct = Math.max(6, ((phMax - phMin) / 5.0) * 100);

  const panel = createEl("div", "cultivation-telemetry-panel");
  const head = createEl("div", "telemetry-panel-head");
  head.appendChild(
    createEl(
      "span",
      "telemetry-panel-kicker",
      telemetryCfg.heading || "Ecological & Cultivation Telemetry",
    ),
  );
  if (data.soilDrainageLabel) {
    head.appendChild(
      createEl("span", "telemetry-drainage-tag", data.soilDrainageLabel),
    );
  }
  panel.appendChild(head);

  // 1. Soil pH Spectrum Meter (4.0 – 9.0)
  const phCard = createEl("div", "telemetry-ph-card");
  const phTop = createEl("div", "telemetry-row-top");
  phTop.appendChild(
    createEl(
      "span",
      "telemetry-metric-label",
      telemetryCfg.phLabel || "Optimal Soil pH Spectrum (4.0 – 9.0)",
    ),
  );
  phTop.appendChild(
    createEl(
      "span",
      "telemetry-metric-value",
      data.phOptimalLabel || `pH ${phMin} – ${phMax}`,
    ),
  );
  phCard.appendChild(phTop);

  const phTrack = createEl("div", "telemetry-ph-track");
  const phRange = createEl("div", "telemetry-ph-range");
  phRange.style.left = `${leftPct.toFixed(1)}%`;
  phRange.style.width = `${widthPct.toFixed(1)}%`;
  phTrack.appendChild(phRange);

  const neutralMarker = createEl("div", "telemetry-ph-neutral-tick");
  neutralMarker.style.left = "60%"; // 7.0 on 4.0–9.0 scale
  neutralMarker.setAttribute("aria-hidden", "true");
  phTrack.appendChild(neutralMarker);
  phCard.appendChild(phTrack);

  const scaleTicks = createEl("div", "telemetry-ph-scale");
  scaleTicks.appendChild(createEl("span", "", "4.0 Acidic"));
  scaleTicks.appendChild(createEl("span", "", "7.0 Neutral"));
  scaleTicks.appendChild(createEl("span", "", "9.0 Alkaline"));
  phCard.appendChild(scaleTicks);
  panel.appendChild(phCard);

  // 2. Sunlight & Irrigation Level Bars
  const metersGrid = createEl("div", "telemetry-meters-grid");

  const sunCard = createEl("div", "telemetry-meter-card");
  const sunTop = createEl("div", "telemetry-row-top");
  sunTop.appendChild(
    createEl(
      "span",
      "telemetry-metric-label",
      telemetryCfg.sunlightLabel || "Sunlight Intensity",
    ),
  );
  sunTop.appendChild(
    createEl(
      "span",
      "telemetry-metric-value",
      data.sunlightLabel || "Full Sun",
    ),
  );
  sunCard.appendChild(sunTop);
  sunCard.appendChild(
    buildSegmentedBar(
      Number(data.sunlightLevel) || 3,
      ["Shade", "Partial Shade", "Full Sun"],
      "is-sunlight",
    ),
  );

  const waterCard = createEl("div", "telemetry-meter-card");
  const waterTop = createEl("div", "telemetry-row-top");
  waterTop.appendChild(
    createEl(
      "span",
      "telemetry-metric-label",
      telemetryCfg.irrigationLabel || "Irrigation Frequency",
    ),
  );
  waterTop.appendChild(
    createEl(
      "span",
      "telemetry-metric-value",
      data.irrigationLabel || "Moderate",
    ),
  );
  waterCard.appendChild(waterTop);
  waterCard.appendChild(
    buildSegmentedBar(
      Number(data.irrigationLevel) || 2,
      ["Low / Drought", "Moderate", "High / Wet"],
      "is-irrigation",
    ),
  );

  metersGrid.appendChild(sunCard);
  metersGrid.appendChild(waterCard);
  panel.appendChild(metersGrid);

  return panel;
}
