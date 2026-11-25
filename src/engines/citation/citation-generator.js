/**
 * Institutional Academic Citation Generator (APA, MLA, BibTeX)
 * Attributed solely to "Plantipedia Botanical Archive" using active species metadata and canonical URL.
 */

import { createEl } from "../../modules/utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";

function getCleanCanonicalHref(plant, cfg = {}) {
  if (cfg.canonicalUrl) return cfg.canonicalUrl;
  try {
    if (plant?.isGlobalLive) {
      const q = plant.query || plant.commonName || "";
      const targetHref = resolveRootPath(
        `./plant/live/?q=${encodeURIComponent(q)}`,
      );
      return new URL(targetHref, window.location.href).href;
    }
    if (plant?.slug) {
      const targetHref = resolveRootPath(
        `./plant/?species=${encodeURIComponent(plant.slug)}`,
      );
      return new URL(targetHref, window.location.href).href;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("embed");
    return url.href;
  } catch {
    return window.location.href;
  }
}

function buildCitations(plant, cfg = {}) {
  const institution = plant?.isGlobalLive
    ? "Plantipedia Global Flora Index"
    : (cfg.institution || "Plantipedia Botanical Archive");
  const year = String(cfg.year || 2026);
  const title = `${plant.commonName} (${plant.scientificName})`;
  const url = getCleanCanonicalHref(plant, cfg);

  const now = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const mlaMonth = monthNames[now.getMonth()].slice(0, 3);
  const apaDate = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const mlaDate = `${now.getDate()} ${mlaMonth}. ${now.getFullYear()}`;
  const keySeed = plant.slug || plant.query || plant.commonName || "species";
  const bibKey = `plantipedia_${String(keySeed).replace(/[^a-z0-9]/gi, "_")}_${year}`;

  return {
    apa: `${institution}. (${year}). ${title}: Botanical monograph and ecological profile. ${institution}. Retrieved ${apaDate}, from ${url}`,
    mla: `"${title}." ${institution}, ${year}, ${url}. Accessed ${mlaDate}.`,
    bibtex: `@misc{${bibKey},\n  author = {{${institution}}},\n  title = {${title}: Botanical Monograph and Ecological Profile},\n  year = {${year}},\n  howpublished = {\\url{${url}}},\n  note = {Accessed: ${now.toISOString().slice(0, 10)}}\n}`,
  };
}

async function copyTextSafe(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

export function renderCitationGenerator(plant, citationCfg = {}) {
  const card = createEl("section", "citation-generator-card");
  card.setAttribute("aria-label", "Cite this botanical monograph");

  const header = createEl("div", "citation-card-header");
  const titleGroup = document.createElement("div");
  titleGroup.appendChild(
    createEl(
      "span",
      "section-eyebrow",
      citationCfg.eyebrow || "Academic Reference",
    ),
  );
  titleGroup.appendChild(
    createEl(
      "h2",
      "citation-card-heading",
      citationCfg.heading || "Cite This Monograph",
    ),
  );
  header.appendChild(titleGroup);

  const tabsWrap = createEl("div", "citation-format-tabs");
  tabsWrap.setAttribute("role", "tablist");
  tabsWrap.setAttribute("aria-label", "Citation format");

  const formats = [
    { id: "apa", label: "APA" },
    { id: "mla", label: "MLA" },
    { id: "bibtex", label: "BibTeX" },
  ];

  const citations = buildCitations(plant, citationCfg);
  let activeFormat = "apa";

  const codeBox = createEl("pre", "citation-preview-box");
  const codeEl = document.createElement("code");
  codeEl.textContent = citations[activeFormat];
  codeBox.appendChild(codeEl);

  const copyBtn = createEl(
    "button",
    "citation-copy-btn",
    citationCfg.copyLabel || "Copy Citation",
  );
  copyBtn.type = "button";

  const syncFormat = (fmtId) => {
    activeFormat = fmtId;
    codeEl.textContent = citations[fmtId];
    tabsWrap.querySelectorAll(".citation-tab-btn").forEach((btn) => {
      const active = btn.getAttribute("data-format") === fmtId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  };

  formats.forEach((fmt) => {
    const btn = createEl(
      "button",
      `citation-tab-btn${fmt.id === activeFormat ? " is-active" : ""}`,
      fmt.label,
    );
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("data-format", fmt.id);
    btn.setAttribute("aria-selected", String(fmt.id === activeFormat));
    btn.addEventListener("click", () => syncFormat(fmt.id));
    tabsWrap.appendChild(btn);
  });

  header.appendChild(tabsWrap);
  card.appendChild(header);
  card.appendChild(codeBox);

  const footer = createEl("div", "citation-card-footer");
  footer.appendChild(
    createEl(
      "span",
      "citation-institution-note",
      `Attributed to ${citationCfg.institution || "Plantipedia Botanical Archive"} (${citationCfg.year || 2026})`,
    ),
  );
  footer.appendChild(copyBtn);
  card.appendChild(footer);

  let resetTimer = null;
  copyBtn.addEventListener("click", async () => {
    try {
      await copyTextSafe(citations[activeFormat]);
      clearTimeout(resetTimer);
      copyBtn.classList.add("is-copied");
      copyBtn.textContent = citationCfg.copiedLabel || "Copied ✓";
      resetTimer = setTimeout(() => {
        copyBtn.classList.remove("is-copied");
        copyBtn.textContent = citationCfg.copyLabel || "Copy Citation";
      }, 2200);
    } catch {
      copyBtn.textContent = "Select & Copy Above";
    }
  });

  return card;
}
