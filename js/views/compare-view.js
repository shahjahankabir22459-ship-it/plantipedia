/**
 * Compare Split View Controller (/compare/)
 * - Dual-species selector with strict validation (leftSlug && rightSlug && leftSlug !== rightSlug)
 * - 3-second "Labor Illusion" loader selecting 1 random message per stage from 5 unique messages (15 total)
 * - Background iframe preloading (../plant/?species=<slug>&embed=true)
 * - Desktop (>768px) 50/50 split layout vs Mobile (<=768px) & Desktop Focus Mode top 2-button pill switcher
 * - Fixed bottom-right floating glassmorphism Focus Mode / Split View toggle button
 */

import { createEl } from "../utils/templates.js";
import { resolveRootPath } from "../core/router.js";
import { applyCompareSeo } from "../services/seo.js";

function pickRandomMessage(pool, fallback) {
  if (!Array.isArray(pool) || pool.length === 0) return fallback;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] || fallback;
}

export function renderCompareWorkspace(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const list = Array.isArray(speciesIndex) ? speciesIndex.slice() : [];
  list.sort((a, b) => a.commonName.localeCompare(b.commonName));
  const speciesBySlug = new Map(list.map((s) => [s.slug, s]));

  const selCfg = pageData.selector || {};
  const stages =
    Array.isArray(pageData.loaderStages) && pageData.loaderStages.length === 3
      ? pageData.loaderStages
      : [
          [
            "Retrieving botanical monograph archives...",
            "Sequencing Linnaean taxonomic lineage...",
            "Indexing herbarium specimen records...",
            "Loading native habitat & distribution data...",
            "Cross-referencing species catalog entries...",
          ],
          [
            "Aligning morphological & leaf venation traits...",
            "Calibrating soil pH & cultivation parameters...",
            "Comparing pollinator guilds & ecological roles...",
            "Synthesizing phytochemical & medicinal profiles...",
            "Mapping seasonal flowering & growth cycles...",
          ],
          [
            "Assembling dual-pane split comparison...",
            "Finalizing high-contrast specimen plates...",
            "Synchronizing responsive monograph viewports...",
            "Preparing side-by-side botanical workspace...",
            "Ready — launching comparative view...",
          ],
        ];
  const wsCfg = pageData.workspace || {};

  let leftSlug = "";
  let rightSlug = "";
  let isFocusMode = window.innerWidth <= 768;
  let activeFocusPane = "left";
  let loaderTimerIds = [];
  let activeResizeHandler = null;

  function clearLoaderTimers() {
    loaderTimerIds.forEach((id) => clearTimeout(id));
    loaderTimerIds = [];
    if (activeResizeHandler) {
      window.removeEventListener("resize", activeResizeHandler);
      activeResizeHandler = null;
    }
  }

  function removeFloatingModeButton() {
    const existing = document.getElementById("compareModeToggleBtn");
    if (existing) existing.remove();
  }

  function buildSpeciesSelect(id, labelText) {
    const field = createEl("div", "compare-select-field");
    const label = createEl("label", "compare-select-label", labelText);
    label.setAttribute("for", id);

    const select = createEl("select", "compare-select-input");
    select.id = id;

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent =
      selCfg.placeholderOption || "Select a botanical specimen...";
    select.appendChild(defaultOpt);

    list.forEach((sp) => {
      const opt = document.createElement("option");
      opt.value = sp.slug;
      opt.textContent = sp.commonNameBn
        ? `${sp.commonName} (${sp.commonNameBn}) — ${sp.scientificName}`
        : `${sp.commonName} — ${sp.scientificName}`;
      select.appendChild(opt);
    });

    field.appendChild(label);
    field.appendChild(select);
    return { field, select };
  }

  function syncCompareUrlParams(slugA, slugB) {
    try {
      const url = new URL(window.location.href);
      if (slugA && slugB && slugA !== slugB) {
        url.searchParams.set("a", slugA);
        url.searchParams.set("b", slugB);
      } else {
        url.searchParams.delete("a");
        url.searchParams.delete("b");
        url.searchParams.delete("left");
        url.searchParams.delete("right");
      }
      window.history.replaceState(
        { a: slugA || null, b: slugB || null },
        "",
        url.toString(),
      );
    } catch {
      // Ignore history restrictions
    }
  }

  function renderSelectorView({ resetUrl = false } = {}) {
    clearLoaderTimers();
    removeFloatingModeButton();
    if (resetUrl) {
      syncCompareUrlParams("", "");
    }
    try {
      applyCompareSeo({ pageData, leftPlant: null, rightPlant: null });
    } catch {
      // Non-blocking SEO update
    }

    const shell = createEl("div", "compare-selector-shell");
    const card = createEl("section", "compare-selector-card");
    card.setAttribute("aria-label", "Select two botanical species to compare");

    card.appendChild(
      createEl(
        "span",
        "section-eyebrow",
        selCfg.eyebrow || "Comparative Botanical Workspace",
      ),
    );
    card.appendChild(
      createEl(
        "h1",
        "compare-selector-heading",
        selCfg.headline || "Compare Split View",
      ),
    );
    card.appendChild(
      createEl(
        "p",
        "compare-selector-subcopy",
        selCfg.subcopy ||
          "Select two distinct plant species to launch an edge-to-edge comparative inspection.",
      ),
    );

    const selectsRow = createEl("div", "compare-selects-grid");
    const leftCtl = buildSpeciesSelect(
      "compareLeftSelect",
      selCfg.leftLabel || "Left Specimen",
    );
    const rightCtl = buildSpeciesSelect(
      "compareRightSelect",
      selCfg.rightLabel || "Right Specimen",
    );

    if (leftSlug) leftCtl.select.value = leftSlug;
    if (rightSlug) rightCtl.select.value = rightSlug;

    selectsRow.appendChild(leftCtl.field);
    selectsRow.appendChild(rightCtl.field);
    card.appendChild(selectsRow);

    const warningEl = createEl("p", "compare-validation-warning", "");
    warningEl.id = "compareValidationWarning";
    warningEl.setAttribute("role", "alert");
    warningEl.hidden = true;
    card.appendChild(warningEl);

    const submitBtn = createEl(
      "button",
      "compare-submit-btn",
      selCfg.submitLabel || "Compare Specimens",
    );
    submitBtn.type = "button";
    submitBtn.id = "compareLaunchBtn";
    submitBtn.disabled = true;
    card.appendChild(submitBtn);

    const validateSelection = () => {
      leftSlug = leftCtl.select.value;
      rightSlug = rightCtl.select.value;

      if (leftSlug && rightSlug && leftSlug === rightSlug) {
        submitBtn.disabled = true;
        warningEl.textContent =
          selCfg.sameSpeciesWarning ||
          "Please select two different species to run a side-by-side comparison.";
        warningEl.hidden = false;
        return false;
      }

      warningEl.hidden = true;
      warningEl.textContent = "";
      submitBtn.disabled = !(leftSlug && rightSlug && leftSlug !== rightSlug);
      return !submitBtn.disabled;
    };

    leftCtl.select.addEventListener("change", validateSelection);
    rightCtl.select.addEventListener("change", validateSelection);

    submitBtn.addEventListener("click", () => {
      if (!validateSelection()) return;
      launchComparisonWithLoader(leftSlug, rightSlug);
    });

    validateSelection();
    shell.appendChild(card);
    mountEl.replaceChildren(shell);
  }

  function launchComparisonWithLoader(slugA, slugB) {
    clearLoaderTimers();
    removeFloatingModeButton();

    const leftPlant = speciesBySlug.get(slugA) || {
      slug: slugA,
      commonName: slugA,
    };
    const rightPlant = speciesBySlug.get(slugB) || {
      slug: slugB,
      commonName: slugB,
    };

    syncCompareUrlParams(slugA, slugB);
    try {
      applyCompareSeo({ pageData, leftPlant, rightPlant });
    } catch {
      // Non-blocking SEO update
    }

    const stageRoot = createEl("div", "compare-active-root");

    // 1. Top Pill Switcher + Reset Bar (Visible on <=768px or when Desktop Focus Mode is active)
    const controlStrip = createEl("div", "compare-focus-bar");
    controlStrip.id = "compareFocusBar";

    const pillGroup = createEl("div", "compare-pill-switcher");
    pillGroup.setAttribute("role", "tablist");
    pillGroup.setAttribute("aria-label", "Switch focused specimen");

    const leftPill = createEl(
      "button",
      "compare-pill-btn is-active",
      leftPlant.commonName,
    );
    leftPill.type = "button";
    leftPill.setAttribute("role", "tab");
    leftPill.setAttribute("data-pane", "left");
    leftPill.setAttribute("aria-selected", "true");

    const rightPill = createEl(
      "button",
      "compare-pill-btn",
      rightPlant.commonName,
    );
    rightPill.type = "button";
    rightPill.setAttribute("role", "tab");
    rightPill.setAttribute("data-pane", "right");
    rightPill.setAttribute("aria-selected", "false");

    pillGroup.appendChild(leftPill);
    pillGroup.appendChild(rightPill);

    const changeBtn = createEl(
      "button",
      "compare-change-btn",
      wsCfg.changeSpeciesLabel || "Change Species",
    );
    changeBtn.type = "button";
    changeBtn.addEventListener("click", () =>
      renderSelectorView({ resetUrl: true }),
    );

    controlStrip.appendChild(pillGroup);
    controlStrip.appendChild(changeBtn);

    // 2. Dual Iframe Viewport Container (Preloads immediately in background behind loader)
    const panesContainer = createEl("div", "compare-panes-grid");
    panesContainer.id = "comparePanesGrid";

    const leftIframe = document.createElement("iframe");
    leftIframe.className = "compare-iframe compare-iframe--left";
    leftIframe.title = `${leftPlant.commonName} Botanical Monograph`;
    leftIframe.loading = "eager";
    leftIframe.src = resolveRootPath(
      `./plant/?species=${encodeURIComponent(slugA)}&embed=true`,
    );

    const rightIframe = document.createElement("iframe");
    rightIframe.className = "compare-iframe compare-iframe--right";
    rightIframe.title = `${rightPlant.commonName} Botanical Monograph`;
    rightIframe.loading = "eager";
    rightIframe.src = resolveRootPath(
      `./plant/?species=${encodeURIComponent(slugB)}&embed=true`,
    );

    panesContainer.appendChild(leftIframe);
    panesContainer.appendChild(rightIframe);

    // 3. 3-Second "Labor Illusion" Botanical Loader Overlay
    const loaderOverlay = createEl("div", "compare-loader-overlay");
    loaderOverlay.setAttribute("role", "status");
    loaderOverlay.setAttribute("aria-live", "polite");

    const loaderCard = createEl("div", "compare-loader-card");
    loaderCard.appendChild(createEl("div", "loading-spinner"));
    loaderCard.appendChild(
      createEl(
        "h2",
        "compare-loader-title",
        `${leftPlant.commonName} vs. ${rightPlant.commonName}`,
      ),
    );
    const stageMsgEl = createEl(
      "p",
      "compare-loader-message",
      pickRandomMessage(
        stages[0],
        "Retrieving botanical monograph archives...",
      ),
    );
    loaderCard.appendChild(stageMsgEl);

    const progressTrack = createEl("div", "compare-loader-progress");
    const progressFill = createEl("div", "compare-loader-progress-fill");
    progressTrack.appendChild(progressFill);
    loaderCard.appendChild(progressTrack);

    const stageLabelEl = createEl(
      "span",
      "compare-loader-step",
      "Stage 1 of 3",
    );
    loaderCard.appendChild(stageLabelEl);
    loaderOverlay.appendChild(loaderCard);

    stageRoot.appendChild(controlStrip);
    stageRoot.appendChild(panesContainer);
    stageRoot.appendChild(loaderOverlay);
    mountEl.replaceChildren(stageRoot);

    const syncPaneClasses = () => {
      const mobileViewport = window.innerWidth <= 768;
      const effectiveFocus = mobileViewport || isFocusMode;

      stageRoot.classList.toggle("is-focus-mode", effectiveFocus);
      panesContainer.classList.toggle("is-focus-mode", effectiveFocus);
      leftIframe.classList.toggle(
        "is-active-pane",
        !effectiveFocus || activeFocusPane === "left",
      );
      rightIframe.classList.toggle(
        "is-active-pane",
        !effectiveFocus || activeFocusPane === "right",
      );

      leftPill.classList.toggle("is-active", activeFocusPane === "left");
      leftPill.setAttribute(
        "aria-selected",
        String(activeFocusPane === "left"),
      );
      rightPill.classList.toggle("is-active", activeFocusPane === "right");
      rightPill.setAttribute(
        "aria-selected",
        String(activeFocusPane === "right"),
      );

      const floatBtn = document.getElementById("compareModeToggleBtn");
      if (floatBtn) {
        floatBtn.textContent = isFocusMode
          ? wsCfg.splitViewLabel || "Split View"
          : wsCfg.focusModeLabel || "Focus Mode";
        floatBtn.hidden = mobileViewport;
      }

      const visiblePane =
        !effectiveFocus || activeFocusPane === "left"
          ? leftIframe
          : rightIframe;
      try {
        visiblePane.contentWindow?.dispatchEvent(new Event("resize"));
      } catch {
        // Ignore cross-frame restrictions if any
      }
    };

    leftPill.addEventListener("click", () => {
      activeFocusPane = "left";
      syncPaneClasses();
    });
    rightPill.addEventListener("click", () => {
      activeFocusPane = "right";
      syncPaneClasses();
    });

    // Trigger CSS transition for smooth 3s loader progress bar
    requestAnimationFrame(() => {
      progressFill.style.width = "33%";
    });

    loaderTimerIds.push(
      setTimeout(() => {
        stageLabelEl.textContent = "Stage 2 of 3";
        stageMsgEl.textContent = pickRandomMessage(
          stages[1],
          "Aligning morphological & leaf venation traits...",
        );
        progressFill.style.width = "68%";
      }, 1000),
    );

    loaderTimerIds.push(
      setTimeout(() => {
        stageLabelEl.textContent = "Stage 3 of 3";
        stageMsgEl.textContent = pickRandomMessage(
          stages[2],
          "Assembling dual-pane split comparison...",
        );
        progressFill.style.width = "100%";
      }, 2000),
    );

    loaderTimerIds.push(
      setTimeout(() => {
        loaderOverlay.classList.add("is-leaving");
        setTimeout(() => loaderOverlay.remove(), 240);

        const floatBtn = createEl(
          "button",
          "floating-back-btn compare-floating-mode-btn",
          isFocusMode
            ? wsCfg.splitViewLabel || "Split View"
            : wsCfg.focusModeLabel || "Focus Mode",
        );
        floatBtn.type = "button";
        floatBtn.id = "compareModeToggleBtn";
        floatBtn.addEventListener("click", () => {
          isFocusMode = !isFocusMode;
          syncPaneClasses();
        });
        document.body.appendChild(floatBtn);
        syncPaneClasses();
      }, 3000),
    );

    activeResizeHandler = syncPaneClasses;
    window.addEventListener("resize", activeResizeHandler);
    syncPaneClasses();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const initialA = (urlParams.get("a") || urlParams.get("left") || "")
    .trim()
    .toLowerCase();
  const initialB = (urlParams.get("b") || urlParams.get("right") || "")
    .trim()
    .toLowerCase();

  if (
    initialA &&
    initialB &&
    initialA !== initialB &&
    speciesBySlug.has(initialA) &&
    speciesBySlug.has(initialB)
  ) {
    leftSlug = initialA;
    rightSlug = initialB;
    launchComparisonWithLoader(initialA, initialB);
  } else {
    renderSelectorView();
  }
}
