/**
 * Personal Herbarium Bookmark System & Slide-Over Drawer (localStorage)
 * - Zero-login local persistence under "plantipedia:herbarium:v1"
 * - Provides live count badges, card/monograph toggle buttons, and slide-over "My Herbarium" drawer
 * - Pure DOM manipulation with XSS-safe textContent and relative ./ navigation
 */

import { getSpeciesIndex } from "../../core/bootstrap/state.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";

const STORAGE_KEY = "plantipedia:herbarium:v1";
const SVG_NS = "http://www.w3.org/2000/svg";

function resolveHref(relPath) {
  return resolveRootPath(relPath, "./");
}

export function getSavedSlugs() {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === "string" && s.trim().length > 0);
  } catch {
    return [];
  }
}

function writeSavedSlugs(slugs) {
  const unique = Array.from(new Set(slugs.map((s) => String(s).trim().toLowerCase()).filter(Boolean)));
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(unique));
  } catch {
    // Ignore storage quota / private-browsing errors
  }
  document.dispatchEvent(
    new CustomEvent("plantipedia:herbarium-changed", {
      detail: { slugs: unique, count: unique.length },
    }),
  );
  return unique;
}

export function isSpeciesSaved(slug) {
  if (!slug) return false;
  return getSavedSlugs().includes(String(slug).trim().toLowerCase());
}

export function getSavedCount() {
  return getSavedSlugs().length;
}

export function toggleSpeciesSaved(slug) {
  const clean = String(slug || "").trim().toLowerCase();
  if (!clean) return false;
  const current = getSavedSlugs();
  const exists = current.includes(clean);
  const next = exists ? current.filter((s) => s !== clean) : [...current, clean];
  writeSavedSlugs(next);
  return !exists;
}

export function removeSpeciesFromHerbarium(slug) {
  const clean = String(slug || "").trim().toLowerCase();
  if (!clean) return;
  const next = getSavedSlugs().filter((s) => s !== clean);
  writeSavedSlugs(next);
}

export function clearHerbarium() {
  writeSavedSlugs([]);
}

export function createBookmarkSvg(filled = false, size = 16) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", filled ? "currentColor" : "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z");
  svg.appendChild(path);
  return svg;
}

function createCloseSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
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

function updateButtonVisualState(btn, saved) {
  const variant = btn.getAttribute("data-bookmark-variant") || "card";
  const commonName = btn.getAttribute("data-species-name") || "species";
  btn.classList.toggle("is-saved", saved);
  btn.setAttribute("aria-pressed", String(saved));
  btn.setAttribute(
    "aria-label",
    saved
      ? `Remove ${commonName} from My Herbarium`
      : `Save ${commonName} to My Herbarium`,
  );
  btn.title = saved ? "Saved in My Herbarium" : "Save to My Herbarium";

  const iconHost = btn.querySelector(".bookmark-icon-slot");
  if (iconHost) {
    iconHost.replaceChildren(createBookmarkSvg(saved, variant === "monograph" ? 16 : 15));
  }
  const labelEl = btn.querySelector(".bookmark-btn-label");
  if (labelEl) {
    labelEl.textContent = saved ? "Saved in Herbarium" : "Save to Herbarium";
  }
}

export function createBookmarkButton(plant, variant = "card") {
  const slug = String(plant?.slug || plant?.id || "").trim().toLowerCase();
  const saved = isSpeciesSaved(slug);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    variant === "monograph"
      ? "monograph-action-btn monograph-bookmark-btn"
      : "species-bookmark-btn";
  btn.setAttribute("data-herbarium-toggle", slug);
  btn.setAttribute("data-bookmark-variant", variant);
  btn.setAttribute("data-species-name", plant?.commonName || slug);

  const iconSlot = document.createElement("span");
  iconSlot.className = "bookmark-icon-slot";
  btn.appendChild(iconSlot);

  if (variant === "monograph") {
    const lbl = document.createElement("span");
    lbl.className = "bookmark-btn-label";
    btn.appendChild(lbl);
  }

  updateButtonVisualState(btn, saved);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleSpeciesSaved(slug);
    updateButtonVisualState(btn, nowSaved);
  });

  return btn;
}

export function syncAllHerbariumControls() {
  const savedSet = new Set(getSavedSlugs());
  const count = savedSet.size;

  document.querySelectorAll("[data-herbarium-count]").forEach((badge) => {
    badge.textContent = String(count);
  });

  document.querySelectorAll("[data-herbarium-toggle]").forEach((btn) => {
    const slug = btn.getAttribute("data-herbarium-toggle");
    updateButtonVisualState(btn, savedSet.has(slug));
  });

  const drawer = document.getElementById("herbariumDrawer");
  if (drawer && !drawer.hidden) {
    renderHerbariumDrawerList();
  }
}

function renderHerbariumDrawerList() {
  const listHost = document.getElementById("herbariumDrawerList");
  const emptyHost = document.getElementById("herbariumDrawerEmpty");
  const clearBtn = document.getElementById("herbariumDrawerClear");
  const subtitleEl = document.getElementById("herbariumDrawerCountLabel");
  if (!listHost || !emptyHost) return;

  const savedSlugs = getSavedSlugs();
  const indexMap = new Map(getSpeciesIndex().map((p) => [p.slug, p]));
  const savedItems = savedSlugs
    .map((slug) => indexMap.get(slug) || { slug, commonName: slug, scientificName: "", category: "Archive" })
    .filter(Boolean);

  if (subtitleEl) {
    subtitleEl.textContent =
      savedItems.length === 1
        ? "1 saved botanical specimen"
        : `${savedItems.length} saved botanical specimens`;
  }
  if (clearBtn) {
    clearBtn.hidden = savedItems.length === 0;
  }

  if (savedItems.length === 0) {
    listHost.replaceChildren();
    listHost.hidden = true;
    emptyHost.hidden = false;
    return;
  }

  emptyHost.hidden = true;
  listHost.hidden = false;

  const frag = document.createDocumentFragment();
  savedItems.forEach((plant) => {
    const item = document.createElement("div");
    item.className = "herbarium-drawer-item";

    const link = document.createElement("a");
    link.className = "herbarium-item-link";
    link.href = resolveHref(`./plant/?species=${encodeURIComponent(plant.slug)}`);

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "herbarium-item-thumb";
    const img = document.createElement("img");
    img.src =
      plant.thumbnailUrl ||
      resolveHref("./assets/images/placeholder-botanical.svg");
    img.alt = plant.imageAlt || plant.commonName;
    img.loading = "lazy";
    img.setAttribute("referrerpolicy", "no-referrer");
    thumbWrap.appendChild(img);

    const textCol = document.createElement("div");
    textCol.className = "herbarium-item-text";

    const title = document.createElement("span");
    title.className = "herbarium-item-title";
    title.textContent = plant.commonNameBn
      ? `${plant.commonName} (${plant.commonNameBn})`
      : plant.commonName;

    const sci = document.createElement("span");
    sci.className = "herbarium-item-sci";
    sci.textContent = plant.scientificName || plant.slug;

    const meta = document.createElement("span");
    meta.className = "herbarium-item-meta";
    meta.textContent = [plant.family, plant.category].filter(Boolean).join(" · ");

    textCol.appendChild(title);
    textCol.appendChild(sci);
    if (meta.textContent) textCol.appendChild(meta);

    link.appendChild(thumbWrap);
    link.appendChild(textCol);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "herbarium-item-remove";
    removeBtn.setAttribute("aria-label", `Remove ${plant.commonName} from My Herbarium`);
    removeBtn.title = "Remove";
    removeBtn.appendChild(createCloseSvg());
    removeBtn.addEventListener("click", () => {
      removeSpeciesFromHerbarium(plant.slug);
    });

    item.appendChild(link);
    item.appendChild(removeBtn);
    frag.appendChild(item);
  });

  listHost.replaceChildren(frag);
}

function ensureHerbariumDrawerDom() {
  if (document.getElementById("herbariumDrawerBackdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.id = "herbariumDrawerBackdrop";
  backdrop.className = "herbarium-drawer-backdrop";
  backdrop.hidden = true;

  const drawer = document.createElement("aside");
  drawer.id = "herbariumDrawer";
  drawer.className = "herbarium-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-labelledby", "herbariumDrawerTitle");
  drawer.hidden = true;

  const header = document.createElement("div");
  header.className = "herbarium-drawer-header";

  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.className = "herbarium-drawer-eyebrow";
  eyebrow.textContent = "Personal Collection · localStorage";

  const title = document.createElement("h2");
  title.id = "herbariumDrawerTitle";
  title.className = "herbarium-drawer-title";
  title.textContent = "My Herbarium";

  const countLbl = document.createElement("p");
  countLbl.id = "herbariumDrawerCountLabel";
  countLbl.className = "herbarium-drawer-sub";
  countLbl.textContent = "0 saved botanical specimens";

  titleWrap.appendChild(eyebrow);
  titleWrap.appendChild(title);
  titleWrap.appendChild(countLbl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.id = "herbariumDrawerClose";
  closeBtn.className = "herbarium-drawer-close";
  closeBtn.setAttribute("aria-label", "Close My Herbarium drawer");
  closeBtn.appendChild(createCloseSvg());

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "herbarium-drawer-body";

  const emptyBox = document.createElement("div");
  emptyBox.id = "herbariumDrawerEmpty";
  emptyBox.className = "herbarium-drawer-empty";
  const emptyTitle = document.createElement("h3");
  emptyTitle.textContent = "Your Herbarium Is Empty";
  const emptyDesc = document.createElement("p");
  emptyDesc.textContent =
    "Tap the bookmark icon on any species card or monograph header to save specimens for quick academic review.";
  const browseLink = document.createElement("a");
  browseLink.className = "empty-reset-btn empty-reset-link";
  browseLink.href = resolveHref("./species/");
  browseLink.textContent = "Browse Species Atlas";
  emptyBox.appendChild(emptyTitle);
  emptyBox.appendChild(emptyDesc);
  emptyBox.appendChild(browseLink);

  const list = document.createElement("div");
  list.id = "herbariumDrawerList";
  list.className = "herbarium-drawer-list";

  body.appendChild(emptyBox);
  body.appendChild(list);

  const footer = document.createElement("div");
  footer.className = "herbarium-drawer-footer";

  const viewSavedLink = document.createElement("a");
  viewSavedLink.className = "herbarium-footer-cta";
  viewSavedLink.href = resolveHref("./species/?saved=true");
  viewSavedLink.textContent = "Filter Saved in Atlas →";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.id = "herbariumDrawerClear";
  clearBtn.className = "herbarium-clear-btn";
  clearBtn.textContent = "Clear All";
  clearBtn.addEventListener("click", () => {
    clearHerbarium();
  });

  footer.appendChild(viewSavedLink);
  footer.appendChild(clearBtn);

  drawer.appendChild(header);
  drawer.appendChild(body);
  drawer.appendChild(footer);

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  closeBtn.addEventListener("click", closeHerbariumDrawer);
  backdrop.addEventListener("click", closeHerbariumDrawer);
}

export function openHerbariumDrawer() {
  ensureHerbariumDrawerDom();
  const backdrop = document.getElementById("herbariumDrawerBackdrop");
  const drawer = document.getElementById("herbariumDrawer");
  if (!backdrop || !drawer) return;

  renderHerbariumDrawerList();
  backdrop.hidden = false;
  drawer.hidden = false;
  document.documentElement.classList.add("overlay-locked");
  document.body.classList.add("overlay-locked");

  const closeBtn = document.getElementById("herbariumDrawerClose");
  if (closeBtn) {
    setTimeout(() => closeBtn.focus(), 40);
  }
}

export function closeHerbariumDrawer() {
  const backdrop = document.getElementById("herbariumDrawerBackdrop");
  const drawer = document.getElementById("herbariumDrawer");
  if (backdrop) backdrop.hidden = true;
  if (drawer) drawer.hidden = true;
  const mobileOverlay = document.getElementById("mobileNavOverlay");
  if (!mobileOverlay || mobileOverlay.hidden) {
    document.documentElement.classList.remove("overlay-locked");
    document.body.classList.remove("overlay-locked");
  }
}

export function initHerbariumSystem() {
  if (!window.__plantipediaHerbariumBound) {
    window.__plantipediaHerbariumBound = true;

    document.addEventListener("plantipedia:herbarium-changed", () => {
      syncAllHerbariumControls();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const drawer = document.getElementById("herbariumDrawer");
        if (drawer && !drawer.hidden) {
          closeHerbariumDrawer();
        }
      }
    });

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        syncAllHerbariumControls();
      }
    });
  }

  syncAllHerbariumControls();
}

initHerbariumSystem();
