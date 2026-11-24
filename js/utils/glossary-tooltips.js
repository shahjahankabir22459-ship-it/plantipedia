/**
 * Interactive Botanical Glossary & Auto-Tooltip Engine (./data/catalog/glossary.json)
 * - Safely scans monograph prose text nodes (skipping headings, links, tables, and existing wraps)
 * - Highlights scientific terms with subtle dotted emerald underlines (.glossary-term)
 * - Displays a viewport-aware glassmorphism English + Bengali tooltip on hover/focus/tap
 */

import { createEl } from "./templates.js";

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildGlossaryLookup(glossaryData) {
  const terms = Array.isArray(glossaryData?.terms) ? glossaryData.terms : [];
  const byPhrase = new Map();
  const byId = new Map();
  const phrases = [];

  terms.forEach((entry) => {
    if (!entry || !entry.id) return;
    byId.set(entry.id, entry);
    const list =
      Array.isArray(entry.aliases) && entry.aliases.length > 0
        ? entry.aliases
        : [entry.term];
    list.forEach((alias) => {
      const clean = String(alias || "")
        .trim()
        .toLowerCase();
      if (!clean || byPhrase.has(clean)) return;
      byPhrase.set(clean, entry);
      phrases.push(escapeRegExp(clean));
    });
  });

  // Match longest phrases first (e.g., "pollination guild" before "pollinator")
  phrases.sort((a, b) => b.length - a.length);
  const matcher =
    phrases.length > 0
      ? new RegExp(`\\b(${phrases.join("|")})\\b`, "gi")
      : null;

  return { byPhrase, byId, matcher };
}

function isSkippableNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(
    parent.closest(
      "h1, h2, h3, h4, h5, h6, a, button, code, pre, figcaption, table, .glossary-term, .glossary-tooltip, script, style",
    ),
  );
}

export function applyGlossaryTooltips(rootContainer, glossaryData) {
  if (!rootContainer || !glossaryData) return;
  const { byPhrase, byId, matcher } = buildGlossaryLookup(glossaryData);
  if (!matcher) return;

  const proseTargets = rootContainer.querySelectorAll(
    ".overview-lead-summary, .chapter-body p, .subblock-item p, .safety-notice-box",
  );

  const seenTermsGlobal = new Set();

  proseTargets.forEach((targetEl) => {
    const walker = document.createTreeWalker(targetEl, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let curr = walker.nextNode();
    while (curr) {
      if (
        curr.nodeValue &&
        curr.nodeValue.trim().length > 2 &&
        !isSkippableNode(curr)
      ) {
        textNodes.push(curr);
      }
      curr = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      matcher.lastIndex = 0;
      let match = matcher.exec(text);
      if (!match) return;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let matchedAny = false;

      while (match) {
        const matchedText = match[0];
        const entry = byPhrase.get(matchedText.toLowerCase());
        const start = match.index;

        if (
          entry &&
          !seenTermsGlobal.has(`${targetEl.dataset?.secNum || ""}:${entry.id}`)
        ) {
          if (start > lastIdx) {
            frag.appendChild(
              document.createTextNode(text.slice(lastIdx, start)),
            );
          }
          const btn = createEl("button", "glossary-term", matchedText);
          btn.type = "button";
          btn.setAttribute("data-glossary-id", entry.id);
          btn.setAttribute(
            "aria-label",
            `${entry.term}: view botanical definition`,
          );
          frag.appendChild(btn);

          seenTermsGlobal.add(`${targetEl.dataset?.secNum || ""}:${entry.id}`);
          lastIdx = start + matchedText.length;
          matchedAny = true;
        }
        match = matcher.exec(text);
      }

      if (!matchedAny) return;
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      textNode.replaceWith(frag);
    });
  });

  bindGlossaryTooltipController(rootContainer, byId, glossaryData.tooltipLabel);
}

function ensureTooltipElement() {
  let tip = document.getElementById("botanicalGlossaryTooltip");
  if (tip) return tip;

  tip = document.createElement("div");
  tip.id = "botanicalGlossaryTooltip";
  tip.className = "glossary-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);
  return tip;
}

function positionTooltipNearAnchor(tip, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  tip.style.visibility = "hidden";
  tip.hidden = false;

  const tipRect = tip.getBoundingClientRect();
  const margin = 12;
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(
    margin,
    Math.min(left, window.innerWidth - tipRect.width - margin),
  );

  let top = rect.top - tipRect.height - 10;
  if (top < 78) {
    top = rect.bottom + 10;
  }

  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  tip.style.visibility = "visible";
}

function bindGlossaryTooltipController(rootContainer, byId, tooltipLabel) {
  const tip = ensureTooltipElement();
  let activeTrigger = null;
  let hideTimer = null;

  const showForTrigger = (trigger) => {
    const id = trigger.getAttribute("data-glossary-id");
    const entry = byId.get(id);
    if (!entry) return;

    clearTimeout(hideTimer);
    activeTrigger = trigger;

    const frag = document.createDocumentFragment();
    const head = createEl("div", "glossary-tooltip-head");
    head.appendChild(createEl("span", "glossary-tooltip-term", entry.term));
    head.appendChild(
      createEl(
        "span",
        "glossary-tooltip-cat",
        entry.category || tooltipLabel || "Botanical Term",
      ),
    );
    frag.appendChild(head);
    frag.appendChild(createEl("p", "glossary-tooltip-en", entry.en));
    if (entry.bn) {
      frag.appendChild(createEl("p", "glossary-tooltip-bn", entry.bn));
    }

    tip.replaceChildren(frag);
    positionTooltipNearAnchor(tip, trigger);
  };

  const hideTooltip = () => {
    clearTimeout(hideTimer);
    tip.hidden = true;
    activeTrigger = null;
  };

  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      hideTooltip();
    }, 140);
  };

  rootContainer.addEventListener("mouseover", (e) => {
    const trigger = e.target.closest(".glossary-term");
    if (trigger) showForTrigger(trigger);
  });

  rootContainer.addEventListener("mouseout", (e) => {
    const trigger = e.target.closest(".glossary-term");
    if (trigger && !tip.contains(e.relatedTarget)) {
      scheduleHide();
    }
  });

  rootContainer.addEventListener("focusin", (e) => {
    const trigger = e.target.closest(".glossary-term");
    if (trigger) showForTrigger(trigger);
  });

  rootContainer.addEventListener("focusout", (e) => {
    const trigger = e.target.closest(".glossary-term");
    if (trigger && !tip.contains(e.relatedTarget)) {
      scheduleHide();
    }
  });

  rootContainer.addEventListener("click", (e) => {
    const trigger = e.target.closest(".glossary-term");
    if (!trigger) return;
    e.preventDefault();
    if (activeTrigger === trigger && !tip.hidden) {
      hideTooltip();
    } else {
      showForTrigger(trigger);
    }
  });

  tip.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  tip.addEventListener("mouseleave", scheduleHide);

  if (!window.__plantipediaGlossaryGlobalBound) {
    window.__plantipediaGlossaryGlobalBound = true;

    document.addEventListener("click", (e) => {
      if (
        e.target.closest(".glossary-term") ||
        e.target.closest("#botanicalGlossaryTooltip")
      ) {
        return;
      }
      const el = document.getElementById("botanicalGlossaryTooltip");
      if (el) el.hidden = true;
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const el = document.getElementById("botanicalGlossaryTooltip");
        if (el) el.hidden = true;
      }
    });

    window.addEventListener(
      "scroll",
      () => {
        const el = document.getElementById("botanicalGlossaryTooltip");
        if (el && !el.hidden) el.hidden = true;
      },
      { passive: true },
    );
  }
}
