/**
 * Compare Split View Controller (/compare/)
 * - Dual Real-Time Search Inputs (#left-specimen-input & #right-specimen-input)
 *   with instant 50-species local autocomplete (EN / বাংলা / Latin / family)
 * - Global Botanical Server lookup trigger whenever query >= 2 chars and local matches < 2
 * - Inline 5-second Global Botanical Server telemetry loader with AbortController & retry loop
 * - Smart error recovery redirecting to ../404.html?reason=invalid|network&q=...&from=compare
 * - URL pre-selection support (?left=<slug>, ?right=<slug>, ?leftGlobal=, ?rightGlobal=, ?leftType=, ?rightType=)
 * - Clean handoff to ./result/?left=...&leftType=...&right=...&rightType=...
 */

import {
  buildImageElement,
  createEl,
  createSearchIconSvg,
} from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { applyCompareSeo } from "../utils/seo.js";
import {
  fetchFromGlobalBotanicalServer,
  getCachedGlobalMonograph,
  normalizeGlobalQuery,
  runGlobalServerTelemetry,
} from "../../engines/global-server/global-botanical-server.js";
import { openComparisonSynthesisOverlay } from "../../engines/comparator/synthesis-overlay.js";

function scoreSpeciesMatch(sp, q) {
  const fields = [
    sp.commonName,
    sp.commonNameBn,
    sp.localName,
    sp.scientificName,
    sp.slug,
    sp.family,
    sp.familyBn,
    sp.category,
  ]
    .filter(Boolean)
    .map((val) => String(val).toLowerCase());

  let bestScore = 0;
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    if (field === q) {
      bestScore = Math.max(bestScore, i <= 4 ? 100 : 75);
    } else if (field.startsWith(q)) {
      bestScore = Math.max(bestScore, i <= 4 ? 85 : 55);
    } else if (field.includes(` ${q}`)) {
      bestScore = Math.max(bestScore, i <= 4 ? 70 : 45);
    } else if (field.includes(q)) {
      bestScore = Math.max(bestScore, i <= 4 ? 50 : 30);
    }
  }
  return bestScore;
}

function formatSpecimenInputLabel(sp) {
  if (!sp) return "";
  return sp.commonNameBn ? `${sp.commonName} (${sp.commonNameBn})` : sp.commonName;
}

export function renderCompareWorkspace(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const list = Array.isArray(speciesIndex) ? speciesIndex.slice() : [];
  list.sort((a, b) => a.commonName.localeCompare(b.commonName));
  const speciesBySlug = new Map(list.map((s) => [s.slug.toLowerCase(), s]));

  const selCfg = pageData.selector || {};

  // Independent specimen states
  const panelState = {
    left: { mode: "local", slug: "", globalQuery: "", verifiedPlant: null },
    right: { mode: "local", slug: "", globalQuery: "", verifiedPlant: null },
  };

  let docClickCleanup = null;
  let activeSynthesisCleanup = null;

  function clearDocumentListeners() {
    if (typeof docClickCleanup === "function") {
      docClickCleanup();
      docClickCleanup = null;
    }
    if (typeof activeSynthesisCleanup === "function") {
      activeSynthesisCleanup({ restoreFocus: false });
      activeSynthesisCleanup = null;
    }
  }

  function removeFloatingModeButton() {
    const existing = document.getElementById("compareModeToggleBtn");
    if (existing) existing.remove();
  }

  function filterCuratedSpecies(rawQuery) {
    const q = String(rawQuery || "").trim().toLowerCase();
    if (!q) return [];
    const scored = [];
    for (const sp of list) {
      const score = scoreSpeciesMatch(sp, q);
      if (score > 0) {
        scored.push({ sp, score });
      }
    }
    scored.sort((a, b) => b.score - a.score || a.sp.commonName.localeCompare(b.sp.commonName));
    return scored.slice(0, 14).map((entry) => entry.sp);
  }

  function getPanelIdentity(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      const q = normalizeGlobalQuery(
        st.globalQuery || st.verifiedPlant?.query || st.verifiedPlant?.commonName,
      );
      return q ? `global:${q.toLowerCase()}` : "";
    }
    return st.slug ? `local:${st.slug.toLowerCase()}` : "";
  }

  function getPanelDisplayPlant(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      if (st.verifiedPlant) return st.verifiedPlant;
      const q = normalizeGlobalQuery(st.globalQuery);
      const cached = q ? getCachedGlobalMonograph(q) : null;
      return (
        cached || {
          isGlobalLive: true,
          query: q,
          commonName: q || "Global Specimen",
          scientificName: "Global Botanical Server",
        }
      );
    }
    return speciesBySlug.get(st.slug) || { slug: st.slug, commonName: st.slug };
  }

  function isPanelReady(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      return Boolean(st.verifiedPlant);
    }
    return Boolean(st.slug && speciesBySlug.has(st.slug));
  }

  function areSidesDuplicate() {
    if (!isPanelReady("left") || !isPanelReady("right")) return false;
    const idL = getPanelIdentity("left");
    const idR = getPanelIdentity("right");
    if (idL === idR) return true;
    const plantL = getPanelDisplayPlant("left");
    const plantR = getPanelDisplayPlant("right");
    if (
      plantL?.scientificName &&
      plantR?.scientificName &&
      plantL.scientificName.toLowerCase() === plantR.scientificName.toLowerCase() &&
      plantL.scientificName !== "Global Botanical Server"
    ) {
      return true;
    }
    return false;
  }

  function syncCompareUrlParams() {
    try {
      const url = new URL(window.location.href);
      ["a", "b", "left", "right", "leftGlobal", "rightGlobal", "leftType", "rightType"].forEach(
        (k) => {
          url.searchParams.delete(k);
        },
      );
      if (isPanelReady("left")) {
        if (panelState.left.mode === "global") {
          url.searchParams.set("left", normalizeGlobalQuery(panelState.left.globalQuery));
          url.searchParams.set("leftType", "global");
        } else {
          url.searchParams.set("left", panelState.left.slug);
          url.searchParams.set("leftType", "local");
        }
      }
      if (isPanelReady("right")) {
        if (panelState.right.mode === "global") {
          url.searchParams.set("right", normalizeGlobalQuery(panelState.right.globalQuery));
          url.searchParams.set("rightType", "global");
        } else {
          url.searchParams.set("right", panelState.right.slug);
          url.searchParams.set("rightType", "local");
        }
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore history errors
    }
  }

  function navigateToCompareResult() {
    const params = new URLSearchParams();
    if (panelState.left.mode === "global") {
      const leftVal = normalizeGlobalQuery(
        panelState.left.globalQuery ||
          panelState.left.verifiedPlant?.query ||
          panelState.left.verifiedPlant?.commonName,
      );
      params.set("left", leftVal);
      params.set("leftType", "global");
    } else {
      params.set("left", panelState.left.slug);
      params.set("leftType", "local");
    }
    if (panelState.right.mode === "global") {
      const rightVal = normalizeGlobalQuery(
        panelState.right.globalQuery ||
          panelState.right.verifiedPlant?.query ||
          panelState.right.verifiedPlant?.commonName,
      );
      params.set("right", rightVal);
      params.set("rightType", "global");
    } else {
      params.set("right", panelState.right.slug);
      params.set("rightType", "local");
    }
    window.location.href = resolveRootPath(`./compare/result/?${params.toString()}`);
  }

  function resolveSpecimenDisplayName(side) {
    const plant = getPanelDisplayPlant(side);
    const st = panelState[side];
    return (
      plant?.commonName ||
      plant?.query ||
      st.globalQuery ||
      st.slug ||
      (side === "left" ? "Left Specimen" : "Right Specimen")
    );
  }

  function launchComparisonSynthesis(triggerBtn) {
    if (typeof activeSynthesisCleanup === "function") {
      return;
    }

    activeSynthesisCleanup = openComparisonSynthesisOverlay({
      leftName: resolveSpecimenDisplayName("left"),
      rightName: resolveSpecimenDisplayName("right"),
      triggerBtn,
      onComplete: () => {
        activeSynthesisCleanup = null;
        navigateToCompareResult();
      },
      onCancel: () => {
        activeSynthesisCleanup = null;
      },
    });
  }

  function redirectToCompare404(reason, query) {
    const params = new URLSearchParams({
      reason: reason || "invalid",
      q: query || "",
      from: "compare",
    });
    window.location.href = resolveRootPath(`./404.html?${params.toString()}`);
  }

  function renderSelectorView({ resetUrl = false, highlightRight = false } = {}) {
    clearDocumentListeners();
    removeFloatingModeButton();

    if (resetUrl) {
      panelState.left = { mode: "local", slug: "", globalQuery: "", verifiedPlant: null };
      panelState.right = { mode: "local", slug: "", globalQuery: "", verifiedPlant: null };
      syncCompareUrlParams();
    }

    try {
      applyCompareSeo({ pageData, leftPlant: null, rightPlant: null });
    } catch {
      // Non-blocking SEO update
    }

    const shell = createEl("div", "compare-selector-shell");
    const card = createEl("section", "compare-selector-card");
    card.setAttribute("aria-label", "Search and select two botanical species to compare");

    card.appendChild(
      createEl("span", "section-eyebrow", selCfg.eyebrow || "Comparative Botanical Workspace"),
    );
    card.appendChild(
      createEl("h1", "compare-selector-heading", selCfg.headline || "Compare Split View"),
    );
    card.appendChild(
      createEl(
        "p",
        "compare-selector-subcopy",
        selCfg.subcopy ||
          "Search and lock two distinct plant species from the 50-monograph archive or query any worldwide taxon via the Global Botanical Server.",
      ),
    );

    const selectsRow = createEl("div", "compare-selects-grid");
    const warningEl = createEl("p", "compare-validation-warning", "");
    warningEl.id = "compareValidationWarning";
    warningEl.setAttribute("role", "alert");
    warningEl.hidden = true;

    const submitBtn = createEl(
      "button",
      "compare-submit-btn",
      selCfg.submitLabel || "Compare Specimens",
    );
    submitBtn.type = "button";
    submitBtn.id = "compareLaunchBtn";
    submitBtn.disabled = true;

    const rightHint = createEl(
      "span",
      "compare-select-hint",
      selCfg.rightNextStepHint || "Next step: Type a second specimen name to compare side-by-side.",
    );

    const panelControllers = {};

    function closeAllMenus(exceptSide = null) {
      Object.entries(panelControllers).forEach(([sideKey, ctl]) => {
        if (exceptSide && sideKey === exceptSide) return;
        ctl.closeMenu();
      });
    }

    function buildSpecimenPanel(side, labelText) {
      const st = panelState[side];
      const field = createEl("div", "compare-select-field");
      field.dataset.side = side;

      const inputId = `${side}-specimen-input`;
      const clearBtnId = `${side}-clear-btn`;
      const menuId = `${side}-autocomplete-menu`;

      const label = createEl("label", "compare-select-label", labelText);
      label.setAttribute("for", inputId);
      field.appendChild(label);

      const searchWrap = createEl("div", "compare-search-wrap");
      const inputBox = createEl("div", "compare-search-input-box");

      const searchIcon = createSearchIconSvg(17, "compare-search-icon");
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.id = inputId;
      inputEl.className = "compare-search-input";
      inputEl.placeholder = "Type plant name (EN / বাংলা / Latin)...";
      inputEl.autocomplete = "off";
      inputEl.spellcheck = false;
      inputEl.setAttribute("role", "combobox");
      inputEl.setAttribute("aria-autocomplete", "list");
      inputEl.setAttribute("aria-expanded", "false");
      inputEl.setAttribute("aria-controls", menuId);
      inputEl.setAttribute("aria-label", `${labelText} search`);

      const clearBtn = createEl("button", "compare-search-clear-btn", "✕");
      clearBtn.type = "button";
      clearBtn.id = clearBtnId;
      clearBtn.setAttribute("aria-label", `Clear ${labelText}`);
      clearBtn.hidden = true;

      inputBox.appendChild(searchIcon);
      inputBox.appendChild(inputEl);
      inputBox.appendChild(clearBtn);
      searchWrap.appendChild(inputBox);

      const menu = createEl("div", "compare-autocomplete-menu");
      menu.id = menuId;
      menu.hidden = true;
      menu.setAttribute("role", "listbox");
      menu.setAttribute("aria-label", `${labelText} suggestions`);

      const listBox = createEl("div", "compare-autocomplete-list");
      const globalFooter = createEl("div", "compare-autocomplete-global-footer");
      globalFooter.hidden = true;

      const globalFetchBtn = createEl("button", "compare-dropdown-global-btn", "");
      globalFetchBtn.type = "button";
      globalFetchBtn.setAttribute("role", "option");
      globalFooter.appendChild(globalFetchBtn);

      menu.appendChild(listBox);
      menu.appendChild(globalFooter);
      searchWrap.appendChild(menu);

      const statusEl = createEl("div", "compare-selection-status");
      statusEl.hidden = true;

      const telemetrySlot = createEl("div", "compare-global-inline-telemetry");
      telemetrySlot.id = `${side}-global-telemetry-slot`;
      telemetrySlot.hidden = true;

      let currentMatches = [];
      let highlightedIndex = -1;
      let isInlineFetching = false;
      let activeGlobalQuery = "";

      function syncClearButton() {
        clearBtn.hidden = inputEl.value.length === 0;
      }

      function syncStatusBadge() {
        statusEl.replaceChildren();
        if (st.mode === "local" && st.slug && speciesBySlug.has(st.slug)) {
          const sp = speciesBySlug.get(st.slug);
          statusEl.appendChild(createEl("span", "compare-badge compare-badge--curated", "CURATED MONOGRAPH"));
          if (sp.scientificName) {
            statusEl.appendChild(createEl("span", "compare-global-verified-name", sp.scientificName));
          }
          statusEl.hidden = false;
          return;
        }
        if (st.mode === "global" && st.verifiedPlant) {
          statusEl.appendChild(
            createEl("span", "compare-badge compare-badge--global", "🌐 GLOBAL BOTANICAL SERVER"),
          );
          if (
            st.verifiedPlant.scientificName &&
            st.verifiedPlant.scientificName.toLowerCase() !==
              st.verifiedPlant.commonName.toLowerCase()
          ) {
            statusEl.appendChild(
              createEl("span", "compare-global-verified-name", st.verifiedPlant.scientificName),
            );
          }
          statusEl.hidden = false;
          return;
        }
        statusEl.hidden = true;
      }

      function hydrateLockedInputText() {
        if (st.mode === "local" && st.slug && speciesBySlug.has(st.slug)) {
          inputEl.value = formatSpecimenInputLabel(speciesBySlug.get(st.slug));
        } else if (st.mode === "global" && st.verifiedPlant) {
          inputEl.value = st.verifiedPlant.commonName || st.globalQuery || "";
        } else if (st.mode === "global" && st.globalQuery) {
          inputEl.value = st.globalQuery;
        }
        syncClearButton();
        syncStatusBadge();
      }

      function closeMenu() {
        menu.hidden = true;
        highlightedIndex = -1;
        inputEl.setAttribute("aria-expanded", "false");
        field.classList.remove("is-open");
      }

      function getInteractiveMenuItems() {
        const opts = Array.from(listBox.querySelectorAll(".compare-autocomplete-option"));
        if (!globalFooter.hidden) {
          opts.push(globalFetchBtn);
        }
        return opts;
      }

      function applyHighlightIndex(nextIdx) {
        const items = getInteractiveMenuItems();
        items.forEach((el) => el.classList.remove("is-highlighted"));
        if (items.length === 0) {
          highlightedIndex = -1;
          return;
        }
        if (nextIdx < 0) {
          highlightedIndex = -1;
          return;
        }
        const bounded = nextIdx % items.length;
        highlightedIndex = bounded;
        const target = items[bounded];
        if (target) {
          target.classList.add("is-highlighted");
          target.scrollIntoView({ block: "nearest" });
        }
      }

      function lockLocalSpecies(sp) {
        if (!sp) return;
        st.mode = "local";
        st.slug = sp.slug.toLowerCase();
        st.globalQuery = "";
        st.verifiedPlant = null;
        inputEl.value = formatSpecimenInputLabel(sp);
        syncClearButton();
        syncStatusBadge();
        closeMenu();
        validateSelection();
        syncCompareUrlParams();

        if (side === "left" && !isPanelReady("right")) {
          const rightInput = document.getElementById("right-specimen-input");
          if (rightInput) {
            requestAnimationFrame(() => rightInput.focus({ preventScroll: true }));
          }
        }
      }

      async function triggerInlineGlobalFetch(rawQueryValue) {
        if (isInlineFetching) return;
        const query = normalizeGlobalQuery(rawQueryValue ?? inputEl.value);
        if (query.length < 2) {
          warningEl.textContent =
            "Please enter at least 2 characters for Global Botanical Server lookup.";
          warningEl.hidden = false;
          inputEl.focus();
          return;
        }

        closeAllMenus();
        warningEl.hidden = true;
        warningEl.textContent = "";
        st.mode = "global";
        st.slug = "";
        st.globalQuery = query;
        st.verifiedPlant = null;
        inputEl.value = query;
        syncClearButton();
        syncStatusBadge();

        const cached = getCachedGlobalMonograph(query);
        if (cached) {
          st.verifiedPlant = cached;
          inputEl.value = cached.commonName || query;
          syncClearButton();
          syncStatusBadge();
          validateSelection();
          syncCompareUrlParams();
          if (side === "left" && !isPanelReady("right")) {
            const rightInput = document.getElementById("right-specimen-input");
            if (rightInput) {
              requestAnimationFrame(() => rightInput.focus({ preventScroll: true }));
            }
          }
          return;
        }

        isInlineFetching = true;
        searchWrap.hidden = true;
        statusEl.hidden = true;
        telemetrySlot.hidden = false;
        telemetrySlot.replaceChildren();

        const telemetryOutcome = await runGlobalServerTelemetry({
          container: telemetrySlot,
          queryLabel: query,
          work: ({ signal, onRetry }) =>
            fetchFromGlobalBotanicalServer(query, { signal, onRetry }),
          onAbort: () => {
            telemetrySlot.replaceChildren();
            telemetrySlot.hidden = true;
            searchWrap.hidden = false;
            syncStatusBadge();
          },
        });

        isInlineFetching = false;

        if (telemetryOutcome.aborted) {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
          searchWrap.hidden = false;
          st.verifiedPlant = null;
          syncStatusBadge();
          validateSelection();
          requestAnimationFrame(() => inputEl.focus());
          return;
        }

        const res = telemetryOutcome.result;
        if (res?.ok && res.monograph) {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
          searchWrap.hidden = false;
          st.mode = "global";
          st.globalQuery = query;
          st.verifiedPlant = res.monograph;
          inputEl.value = res.monograph.commonName || query;
          syncClearButton();
          syncStatusBadge();
          validateSelection();
          syncCompareUrlParams();
          if (side === "left" && !isPanelReady("right")) {
            const rightInput = document.getElementById("right-specimen-input");
            if (rightInput) {
              requestAnimationFrame(() => rightInput.focus({ preventScroll: true }));
            }
          }
          return;
        }

        redirectToCompare404(res?.reason || "invalid", query);
      }

      function renderAutocomplete(rawQuery) {
        const trimmed = String(rawQuery || "").trim().replace(/\s+/g, " ");
        syncClearButton();

        if (trimmed.length < 1) {
          currentMatches = [];
          activeGlobalQuery = "";
          closeMenu();
          return;
        }

        closeAllMenus(side);
        currentMatches = filterCuratedSpecies(trimmed);
        highlightedIndex = -1;
        listBox.replaceChildren();

        if (currentMatches.length === 0) {
          listBox.appendChild(
            createEl(
              "div",
              "compare-autocomplete-empty",
              `No curated archive species matched "${trimmed}".`,
            ),
          );
        } else {
          currentMatches.forEach((sp, idx) => {
            const optBtn = createEl("button", "compare-autocomplete-option");
            optBtn.type = "button";
            optBtn.setAttribute("role", "option");
            optBtn.dataset.slug = sp.slug;
            optBtn.dataset.idx = String(idx);

            const thumb = buildImageElement(
              sp.thumbnailUrl || sp.image?.imageUrl,
              sp.imageAlt || sp.commonName,
              sp.commonName,
            );
            thumb.className = "compare-autocomplete-thumb";
            optBtn.appendChild(thumb);

            const textCol = createEl("div", "compare-autocomplete-text");
            textCol.appendChild(
              createEl("span", "compare-option-common", formatSpecimenInputLabel(sp)),
            );
            const sciSub = sp.family
              ? `${sp.scientificName} · ${sp.family}`
              : sp.scientificName;
            textCol.appendChild(createEl("span", "compare-option-sci", sciSub));
            optBtn.appendChild(textCol);

            optBtn.addEventListener("mouseenter", () => {
              applyHighlightIndex(idx);
            });

            optBtn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              lockLocalSpecies(sp);
            });

            listBox.appendChild(optBtn);
          });
        }

        if (trimmed.length >= 2 && currentMatches.length < 2) {
          activeGlobalQuery = trimmed;
          globalFetchBtn.textContent = `🌐 Fetch "${trimmed}" from Global Botanical Server →`;
          globalFooter.hidden = false;
        } else {
          activeGlobalQuery = "";
          globalFooter.hidden = true;
        }

        menu.hidden = false;
        inputEl.setAttribute("aria-expanded", "true");
        field.classList.add("is-open");
      }

      inputEl.addEventListener("input", () => {
        // Unlock previous selection whenever user edits the search query
        st.mode = "local";
        st.slug = "";
        st.globalQuery = "";
        st.verifiedPlant = null;
        syncStatusBadge();
        validateSelection();
        syncCompareUrlParams();
        renderAutocomplete(inputEl.value);
      });

      inputEl.addEventListener("focus", () => {
        if (!isPanelReady(side) && inputEl.value.trim().length >= 1) {
          renderAutocomplete(inputEl.value);
        }
      });

      inputEl.addEventListener("keydown", (e) => {
        const items = getInteractiveMenuItems();
        if (e.key === "ArrowDown") {
          if (menu.hidden && inputEl.value.trim().length >= 1) {
            renderAutocomplete(inputEl.value);
          }
          if (!menu.hidden && items.length > 0) {
            e.preventDefault();
            applyHighlightIndex(highlightedIndex + 1);
          }
        } else if (e.key === "ArrowUp") {
          if (!menu.hidden && items.length > 0) {
            e.preventDefault();
            const prevIdx =
              highlightedIndex <= 0 ? items.length - 1 : highlightedIndex - 1;
            applyHighlightIndex(prevIdx);
          }
        } else if (e.key === "Escape") {
          if (!menu.hidden) {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();

          if (highlightedIndex >= 0 && items[highlightedIndex]) {
            const target = items[highlightedIndex];
            if (target === globalFetchBtn) {
              triggerInlineGlobalFetch(activeGlobalQuery || inputEl.value);
            } else {
              const slug = target.dataset.slug;
              const sp = speciesBySlug.get(String(slug || "").toLowerCase());
              if (sp) lockLocalSpecies(sp);
            }
            return;
          }

          const trimmed = inputEl.value.trim().replace(/\s+/g, " ");
          if (trimmed.length >= 2 && currentMatches.length < 2) {
            triggerInlineGlobalFetch(trimmed);
            return;
          }
          if (currentMatches.length >= 1) {
            lockLocalSpecies(currentMatches[0]);
            return;
          }
          if (trimmed.length >= 2) {
            triggerInlineGlobalFetch(trimmed);
          }
        }
      });

      globalFetchBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerInlineGlobalFetch(activeGlobalQuery || inputEl.value);
      });

      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInlineFetching) {
          const abortBtn = telemetrySlot.querySelector(".compare-loader-abort-btn");
          if (abortBtn) abortBtn.click();
        }
        st.mode = "local";
        st.slug = "";
        st.globalQuery = "";
        st.verifiedPlant = null;
        inputEl.value = "";
        syncClearButton();
        syncStatusBadge();
        closeMenu();
        validateSelection();
        syncCompareUrlParams();
        requestAnimationFrame(() => inputEl.focus());
      });

      menu.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      hydrateLockedInputText();
      panelControllers[side] = { triggerInlineGlobalFetch, closeMenu };

      field.appendChild(searchWrap);
      field.appendChild(statusEl);
      field.appendChild(telemetrySlot);

      if (side === "right") {
        field.appendChild(rightHint);
      }

      return field;
    }

    const leftField = buildSpecimenPanel("left", selCfg.leftLabel || "Left Specimen");
    const rightField = buildSpecimenPanel("right", selCfg.rightLabel || "Right Specimen");

    selectsRow.appendChild(leftField);
    selectsRow.appendChild(rightField);
    card.appendChild(selectsRow);
    card.appendChild(warningEl);
    card.appendChild(submitBtn);

    function validateSelection() {
      const leftReady = isPanelReady("left");
      const rightReady = isPanelReady("right");

      leftField.classList.toggle("is-preselected", leftReady);
      rightField.classList.toggle("is-preselected", rightReady);

      const guideRight = Boolean(leftReady && !rightReady);
      rightField.classList.toggle("is-guided-next", guideRight);
      rightHint.hidden = !guideRight;

      if (areSidesDuplicate()) {
        submitBtn.disabled = true;
        warningEl.textContent =
          selCfg.sameSpeciesWarning ||
          "Please select two different species to run a side-by-side comparison.";
        warningEl.hidden = false;
        return false;
      }

      warningEl.hidden = true;
      warningEl.textContent = "";
      submitBtn.disabled = !(leftReady && rightReady);
      return !submitBtn.disabled;
    }

    submitBtn.addEventListener("click", () => {
      if (!validateSelection()) return;
      launchComparisonSynthesis(submitBtn);
    });

    const handleDocClick = (e) => {
      if (!e.target.closest(".compare-search-wrap")) {
        closeAllMenus();
      }
    };
    document.addEventListener("click", handleDocClick);
    docClickCleanup = () => document.removeEventListener("click", handleDocClick);

    validateSelection();
    shell.appendChild(card);
    mountEl.replaceChildren(shell);

    // Resolve any uncached URL global specimens inline
    ["left", "right"].forEach((side) => {
      const st = panelState[side];
      if (st.mode === "global" && st.globalQuery && !st.verifiedPlant) {
        panelControllers[side]?.triggerInlineGlobalFetch(st.globalQuery);
      }
    });

    if (highlightRight && isPanelReady("left") && !isPanelReady("right")) {
      requestAnimationFrame(() => {
        rightField.scrollIntoView({ behavior: "smooth", block: "center" });
        const rightInput = document.getElementById("right-specimen-input");
        if (rightInput) rightInput.focus({ preventScroll: true });
      });
    }
  }

  // Hydrate initial URL parameters (?left=, ?right=, ?a=, ?b=, ?leftGlobal=, ?rightGlobal=, ?leftType=, ?rightType=)
  const urlParams = new URLSearchParams(window.location.search);
  const leftTypeParam = urlParams.get("leftType");
  const rightTypeParam = urlParams.get("rightType");

  const rawLeftParam = urlParams.get("left") || urlParams.get("a") || urlParams.get("species") || "";
  const rawRightParam = urlParams.get("right") || urlParams.get("b") || "";

  const initialLeftGlobal = normalizeGlobalQuery(
    urlParams.get("leftGlobal") || (leftTypeParam === "global" ? rawLeftParam : ""),
  );
  const initialRightGlobal = normalizeGlobalQuery(
    urlParams.get("rightGlobal") || (rightTypeParam === "global" ? rawRightParam : ""),
  );
  const initialA = leftTypeParam === "global" ? "" : rawLeftParam.trim().toLowerCase();
  const initialB = rightTypeParam === "global" ? "" : rawRightParam.trim().toLowerCase();

  if (initialLeftGlobal) {
    panelState.left = {
      mode: "global",
      slug: "",
      globalQuery: initialLeftGlobal,
      verifiedPlant: getCachedGlobalMonograph(initialLeftGlobal),
    };
  } else if (initialA && speciesBySlug.has(initialA)) {
    panelState.left = {
      mode: "local",
      slug: initialA,
      globalQuery: "",
      verifiedPlant: null,
    };
  }

  if (initialRightGlobal) {
    panelState.right = {
      mode: "global",
      slug: "",
      globalQuery: initialRightGlobal,
      verifiedPlant: getCachedGlobalMonograph(initialRightGlobal),
    };
  } else if (initialB && speciesBySlug.has(initialB) && initialB !== panelState.left.slug) {
    panelState.right = {
      mode: "local",
      slug: initialB,
      globalQuery: "",
      verifiedPlant: null,
    };
  }

  renderSelectorView({
    highlightRight: Boolean(isPanelReady("left") && !isPanelReady("right")),
  });
}
