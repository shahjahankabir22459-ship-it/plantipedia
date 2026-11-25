/**
 * Multi-Stage Comparison Synthesis Labor Illusion Engine
 * - Displays the 3-second, 3-stage emerald-cyan glassmorphism modal (#compare-synthesis-overlay)
 *   for Taxonomy alignment, Telemetry normalization, and Split Matrix synthesis
 * - Supports Escape key & tactile Cancel button aborting timers cleanly
 */

import { createEl } from "../../modules/utils/templates.js";

export const SYNTHESIS_DURATION_MS = 3000;

export const SYNTHESIS_STAGES = Object.freeze([
  {
    num: "01",
    shortLabel: "Taxonomy",
    badge: "STAGE 01 / 03 · TAXONOMY",
    status: "Aligning taxonomic ranks & binomial nomenclature...",
  },
  {
    num: "02",
    shortLabel: "Telemetry",
    badge: "STAGE 02 / 03 · TELEMETRY",
    status: "Normalizing morphology, soil pH & thermal telemetry...",
  },
  {
    num: "03",
    shortLabel: "Matrix",
    badge: "STAGE 03 / 03 · MATRIX",
    status: "Synthesizing side-by-side comparison matrix...",
  },
]);

export function openComparisonSynthesisOverlay({
  leftName,
  rightName,
  triggerBtn,
  onComplete,
  onCancel,
}) {
  const existingOverlay = document.getElementById("compare-synthesis-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = createEl("div", "compare-synthesis-overlay");
  overlay.id = "compare-synthesis-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "compareSynthesisTitle");
  overlay.setAttribute("aria-describedby", "compareSynthesisStatus");

  const modalCard = createEl("div", "compare-synthesis-card");

  const titleWrap = createEl("div", "compare-synthesis-specimens");
  titleWrap.id = "compareSynthesisTitle";
  titleWrap.appendChild(createEl("span", "compare-synthesis-specimen is-left", leftName));
  const swapGlyph = createEl("span", "compare-synthesis-swap", "⇄");
  swapGlyph.setAttribute("aria-hidden", "true");
  titleWrap.appendChild(swapGlyph);
  titleWrap.appendChild(createEl("span", "compare-synthesis-specimen is-right", rightName));

  const stageBadgeEl = createEl(
    "div",
    "compare-synthesis-stage-badge",
    SYNTHESIS_STAGES[0].badge,
  );
  stageBadgeEl.setAttribute("aria-live", "polite");

  const pillsRow = createEl("div", "compare-synthesis-pills");
  pillsRow.setAttribute("role", "list");
  pillsRow.setAttribute("aria-label", "Comparison synthesis stages");

  const pillNodes = SYNTHESIS_STAGES.map((stage, idx) => {
    const pill = createEl(
      "div",
      `compare-synthesis-pill${idx === 0 ? " is-active" : ""}`,
    );
    pill.setAttribute("role", "listitem");
    pill.dataset.stage = stage.num;

    const marker = createEl("span", "compare-synthesis-pill-num", stage.num);
    const label = createEl("span", "compare-synthesis-pill-label", stage.shortLabel);
    pill.appendChild(marker);
    pill.appendChild(label);
    pillsRow.appendChild(pill);
    return { pill, marker, stage };
  });

  const statusEl = createEl(
    "p",
    "compare-synthesis-status",
    SYNTHESIS_STAGES[0].status,
  );
  statusEl.id = "compareSynthesisStatus";
  statusEl.setAttribute("aria-live", "polite");

  const progressSection = createEl("div", "compare-synthesis-progress-wrap");
  const progressTrack = createEl("div", "compare-synthesis-track");
  progressTrack.setAttribute("role", "progressbar");
  progressTrack.setAttribute("aria-valuemin", "0");
  progressTrack.setAttribute("aria-valuemax", "100");
  progressTrack.setAttribute("aria-valuenow", "0");
  progressTrack.setAttribute("aria-label", "Comparison synthesis progress");

  const progressFill = createEl("div", "compare-synthesis-fill");
  progressTrack.appendChild(progressFill);

  const progressMeta = createEl("div", "compare-synthesis-meta");
  progressMeta.appendChild(
    createEl(
      "span",
      "compare-synthesis-meta-label",
      "Plantipedia Archive · Comparative Matrix Engine",
    ),
  );
  const pctEl = createEl("span", "compare-synthesis-pct", "0%");
  progressMeta.appendChild(pctEl);

  progressSection.appendChild(progressTrack);
  progressSection.appendChild(progressMeta);

  const cancelBtn = createEl("button", "compare-synthesis-cancel-btn", "✕ Cancel");
  cancelBtn.type = "button";
  cancelBtn.id = "compareSynthesisCancelBtn";

  modalCard.appendChild(titleWrap);
  modalCard.appendChild(stageBadgeEl);
  modalCard.appendChild(pillsRow);
  modalCard.appendChild(statusEl);
  modalCard.appendChild(progressSection);
  modalCard.appendChild(cancelBtn);
  overlay.appendChild(modalCard);

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
  requestAnimationFrame(() => cancelBtn.focus({ preventScroll: true }));

  let cancelled = false;
  let completed = false;
  let rafId = 0;
  let fallbackTimerId = 0;
  let activeStageIdx = -1;

  function syncStageUi(stageIdx, allComplete = false) {
    if (!allComplete && stageIdx === activeStageIdx) return;
    activeStageIdx = stageIdx;

    const stageDef = SYNTHESIS_STAGES[Math.min(stageIdx, SYNTHESIS_STAGES.length - 1)];
    stageBadgeEl.textContent = stageDef.badge;
    statusEl.textContent = stageDef.status;

    pillNodes.forEach(({ pill, marker, stage }, idx) => {
      const isDone = allComplete || idx < stageIdx;
      const isCurr = !allComplete && idx === stageIdx;
      pill.classList.toggle("is-completed", isDone);
      pill.classList.toggle("is-active", isCurr);
      marker.textContent = isDone ? "✓" : stage.num;
    });
  }

  function cleanup({ restoreFocus = true } = {}) {
    if (cancelled) return;
    cancelled = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (fallbackTimerId) {
      clearTimeout(fallbackTimerId);
      fallbackTimerId = 0;
    }
    document.removeEventListener("keydown", handleKeydown);
    overlay.remove();
    document.body.style.overflow = previousOverflow;
    if (typeof onCancel === "function") {
      onCancel();
    }
    if (restoreFocus && triggerBtn && document.body.contains(triggerBtn)) {
      triggerBtn.focus({ preventScroll: true });
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cleanup({ restoreFocus: true });
    }
  }

  function finishSynthesis() {
    if (cancelled || completed) return;
    completed = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (fallbackTimerId) {
      clearTimeout(fallbackTimerId);
      fallbackTimerId = 0;
    }
    progressFill.style.width = "100%";
    progressTrack.setAttribute("aria-valuenow", "100");
    pctEl.textContent = "100%";
    syncStageUi(2, true);
    if (typeof onComplete === "function") {
      onComplete();
    }
  }

  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cleanup({ restoreFocus: true });
  });
  document.addEventListener("keydown", handleKeydown);

  const startMs = performance.now();
  syncStageUi(0, false);

  function tick(now) {
    if (cancelled || completed) return;
    const elapsed = Math.max(0, now - startMs);
    const progress = Math.min(1, elapsed / SYNTHESIS_DURATION_MS);
    const pct = Math.round(progress * 100);

    progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
    progressTrack.setAttribute("aria-valuenow", String(pct));
    pctEl.textContent = `${pct}%`;

    if (elapsed >= SYNTHESIS_DURATION_MS) {
      finishSynthesis();
      return;
    }

    const stageIdx = elapsed < 1000 ? 0 : elapsed < 2000 ? 1 : 2;
    syncStageUi(stageIdx, false);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  fallbackTimerId = setTimeout(() => {
    finishSynthesis();
  }, SYNTHESIS_DURATION_MS + 40);

  return cleanup;
}
