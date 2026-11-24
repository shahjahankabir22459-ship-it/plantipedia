/**
 * Unified ES6+ Module Entry Point for Plantipedia Headless Static Architecture.
 * - Binds capture-phase global SVG image fallback handler
 * - Scans and hydrates [data-shell] and [data-section] mount points via registry.js
 * - Wires section-level retry actions and ScrollTrigger lifecycle
 */

import { bindGlobalImageFallbackHandler } from "../components/navbar-compiler.js";
import { resolveRootPath } from "./router.js";
import { hydrateActivePage, retryMountSection } from "./registry.js";
import { initGlobalAnimations, refreshScrollTriggers } from "./animations.js";

function registerServiceWorker() {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    window.location.protocol === "file:"
  ) {
    return;
  }
  try {
    navigator.serviceWorker.register(resolveRootPath("sw.js")).catch(() => {
      // Non-blocking PWA offline cache registration
    });
  } catch {
    // Ignore registration issues
  }
}

function bindRetryDelegation() {
  if (window.__plantipediaRetryBound) return;
  window.__plantipediaRetryBound = true;

  document.addEventListener("click", (e) => {
    const retryBtn = e.target.closest('[data-action="retry-section"]');
    if (!retryBtn) return;
    const sectionKey = retryBtn.getAttribute("data-section-key");
    if (sectionKey) {
      retryMountSection(sectionKey);
    }
  });
}

async function bootApp() {
  bindGlobalImageFallbackHandler();
  bindRetryDelegation();
  registerServiceWorker();
  try {
    initGlobalAnimations();
  } catch {
    // Non-blocking animation initialization
  }
  try {
    await hydrateActivePage(document);
  } catch (err) {
    console.error("Plantipedia page hydration failed:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}

window.addEventListener("load", () => {
  initGlobalAnimations();
  refreshScrollTriggers();
});
