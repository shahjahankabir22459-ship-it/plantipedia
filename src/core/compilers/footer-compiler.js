/**
 * Independent Global Footer Compiler (./data/config/footer.json)
 * - Targets #global-footer (or [data-shell="footer"]) automatically on page load
 * - Fetches ./data/config/footer.json and renders the compact centered Dark Botanical Luxury footer
 * - Resolves dynamic copyright year (autoYear: true) and binds smooth back-to-top scrolling
 * - Provides graceful lightweight fallback if JSON fetch fails
 */

import { fetchDataset } from "../../engines/global-server/api.js";
import { resolveSitePath } from "./navbar-compiler.js";
import { ensureGsapWithScrollTrigger } from "../telemetry/telemetry-stats.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const FALLBACK_FOOTER_CONFIG = {
  brand: {
    title: "Plantipedia",
    accentPrefix: "Plant",
    restTitle: "ipedia",
    logo: "./assets/images/brand-flower.svg",
    logoAlt: "Plantipedia floral emblem",
    homeHref: "./",
  },
  tagline: "Exploring the fascinating world of plants, one species at a time.",
  summary:
    "Exploring the fascinating world of plants, one species at a time. Plantipedia is an educational botanical archive dedicated to documenting global flora with scientific accuracy.",
  credits: [
    { role: "Chief Patron & Authorization", name: "JALEES HABIB" },
    { role: "Lead Architecture, UI & UX Collaboration", name: "RAYAAN TASNIM" },
  ],
  partners: [
    { prefix: "Special Thanks to", name: "IDAI Universe" },
    { prefix: "Powered by", name: "Olympiad Edge" },
  ],
  disclaimer:
    "Educational & Botanical Disclaimer: Monographs, taxonomic notes, and Pexels photography are curated strictly for non-commercial academic reference and do not constitute clinical or medical advice.",
  copyright: {
    autoYear: true,
    owner: "Plantipedia",
    template: "© {year} Plantipedia. All rights reserved.",
  },
};

function createFooterBrand(brandConfig) {
  const link = document.createElement("a");
  link.href = resolveSitePath(brandConfig.homeHref || "./");
  link.className = "footer-brand";
  link.setAttribute("aria-label", `${brandConfig.title || "Plantipedia"} Home`);

  if (brandConfig.logo) {
    const img = document.createElement("img");
    img.src = resolveSitePath(brandConfig.logo);
    img.alt = brandConfig.logoAlt || "";
    img.width = 30;
    img.height = 30;
    img.className = "brand-flower-svg";
    img.decoding = "async";
    img.setAttribute("aria-hidden", "true");
    link.appendChild(img);
  }

  const wordmark = document.createElement("span");
  wordmark.className = "footer-brand-name";
  if (brandConfig.accentPrefix && brandConfig.restTitle) {
    const accent = document.createElement("span");
    accent.className = "brand-accent";
    accent.textContent = brandConfig.accentPrefix;
    wordmark.appendChild(accent);
    wordmark.appendChild(document.createTextNode(brandConfig.restTitle));
  } else {
    wordmark.textContent = brandConfig.title || "Plantipedia";
  }

  link.appendChild(wordmark);
  return link;
}

function createPatronCrownIconSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "contributor-pill-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "m2 7 4.4 4.4L12 5l5.6 6.4L22 7l-2 11H4L2 7Z");
  const base = document.createElementNS(SVG_NS, "path");
  base.setAttribute("d", "M5 21h14");
  svg.appendChild(path);
  svg.appendChild(base);
  return svg;
}

function createArchitectSparkIconSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "contributor-pill-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const p1 = document.createElementNS(SVG_NS, "polyline");
  p1.setAttribute("points", "16 18 22 12 16 6");
  const p2 = document.createElementNS(SVG_NS, "polyline");
  p2.setAttribute("points", "8 6 2 12 8 18");
  svg.appendChild(p1);
  svg.appendChild(p2);
  return svg;
}

function buildFooterDom(host, config) {
  if (!host) return;
  const brand = config.brand || FALLBACK_FOOTER_CONFIG.brand;
  const bodyPage = document.body?.dataset?.page || "";
  const isHomePage =
    bodyPage === "home" ||
    (!bodyPage &&
      /^(?:\/(?:plantipedia\/?)?)?(?:index\.html)?$/i.test(
        window.location.pathname || "/",
      ));
  const isCompact =
    !isHomePage || host.getAttribute("data-footer-variant") === "compact";

  host.classList.add("site-footer");
  if (isCompact) {
    host.classList.add("site-footer--compact");
  } else {
    host.classList.remove("site-footer--compact");
  }

  const fragment = document.createDocumentFragment();

  const topLuminousLine = document.createElement("div");
  topLuminousLine.className = "footer-top-luminous-line";
  topLuminousLine.setAttribute("aria-hidden", "true");
  fragment.appendChild(topLuminousLine);

  const container = document.createElement("div");
  container.className = "footer-container";

  // Centered Emblem & Tagline Block
  const overview = document.createElement("div");
  overview.className = "footer-overview-block";
  overview.appendChild(createFooterBrand(brand));

  const taglineText = isHomePage
    ? config.summary || config.tagline || FALLBACK_FOOTER_CONFIG.summary
    : config.tagline || brand.tagline || FALLBACK_FOOTER_CONFIG.tagline;

  const copy = document.createElement("p");
  copy.className = isHomePage ? "footer-overview-copy" : "footer-tagline-compact";
  copy.textContent = taglineText;
  overview.appendChild(copy);
  container.appendChild(overview);

  const divider = document.createElement("div");
  divider.className = "footer-divider";
  divider.setAttribute("aria-hidden", "true");
  container.appendChild(divider);

  // Credits, Partners, Disclaimer (Home-Only) & Dynamic Copyright Bar
  const creditsBar = document.createElement("div");
  creditsBar.className = "footer-credits-bar";

  if (isHomePage && Array.isArray(config.credits) && config.credits.length > 0) {
    const pillsRow = document.createElement("div");
    pillsRow.className = "footer-contributor-pills";

    config.credits.forEach((credit, idx) => {
      const isPatron =
        idx === 0 || /patron/i.test(credit.role || "");
      const pill = document.createElement("div");
      pill.className = `contributor-pill ${
        isPatron ? "contributor-pill--patron" : "contributor-pill--architect"
      }`;

      pill.appendChild(
        isPatron ? createPatronCrownIconSvg() : createArchitectSparkIconSvg(),
      );

      const roleSpan = document.createElement("span");
      roleSpan.className = "contributor-pill-role";
      roleSpan.textContent = credit.role;

      const sepSpan = document.createElement("span");
      sepSpan.className = "contributor-pill-sep";
      sepSpan.setAttribute("aria-hidden", "true");
      sepSpan.textContent = "·";

      const nameSpan = document.createElement("span");
      nameSpan.className = "contributor-pill-name";
      nameSpan.textContent = credit.name;

      pill.appendChild(roleSpan);
      pill.appendChild(sepSpan);
      pill.appendChild(nameSpan);
      pillsRow.appendChild(pill);
    });

    creditsBar.appendChild(pillsRow);
  }

  if (
    isHomePage &&
    Array.isArray(config.partners) &&
    config.partners.length > 0
  ) {
    const partnerPill = document.createElement("div");
    partnerPill.className = "footer-partner-pill footer-partner-pill--home";

    config.partners.forEach((partner, idx) => {
      if (idx > 0) {
        partnerPill.appendChild(document.createElement("br"));
      }
      const muted = document.createElement("span");
      muted.className = "partner-muted";
      muted.textContent = `${partner.prefix} `;

      const strong = document.createElement("span");
      strong.className = "credit-highlight partner-highlight";
      strong.textContent = partner.name;

      partnerPill.appendChild(muted);
      partnerPill.appendChild(strong);
    });

    creditsBar.appendChild(partnerPill);
  }

  const disclaimerText = config.disclaimer || config.legalNote;
  if (isHomePage && disclaimerText) {
    const legal = document.createElement("p");
    legal.className = "footer-legal-note";
    legal.textContent = disclaimerText;
    creditsBar.appendChild(legal);
  }

  const copyCfg = config.copyright || {};
  const year =
    copyCfg.autoYear !== false ? String(new Date().getFullYear()) : "2026";
  const rawTemplate =
    copyCfg.template ||
    config.copyrightTemplate ||
    "© {year} Plantipedia. All rights reserved.";

  const bottomRow = document.createElement("div");
  bottomRow.className = "footer-bottom-meta";

  const copyrightEl = document.createElement("p");
  copyrightEl.className = "footer-copyright";
  copyrightEl.textContent = rawTemplate.replace(/\{year\}/g, year);
  bottomRow.appendChild(copyrightEl);

  creditsBar.appendChild(bottomRow);
  container.appendChild(creditsBar);
  fragment.appendChild(container);
  host.replaceChildren(fragment);
}

function initFooterRevealFallback(host) {
  host.classList.add("footer-css-reveal");
  const reveal = () => host.classList.add("is-footer-revealed");

  if (typeof IntersectionObserver === "undefined") {
    reveal();
    return;
  }

  const rect = host.getBoundingClientRect();
  if (rect.top <= window.innerHeight * 0.96) {
    requestAnimationFrame(reveal);
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        obs.disconnect();
        reveal();
      }
    },
    { threshold: 0.08 },
  );
  obs.observe(host);
}

function initFooterScrollAnimation(host) {
  if (!host) return;
  const reduced =
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
    document.body?.classList.contains("is-embed");

  if (reduced) {
    host.classList.add("is-footer-revealed");
    return;
  }

  ensureGsapWithScrollTrigger().then((ready) => {
    if (!document.body.contains(host)) return;
    if (!ready || !window.gsap || !window.ScrollTrigger) {
      initFooterRevealFallback(host);
      return;
    }

    const { gsap, ScrollTrigger } = window;
    const lines = Array.from(
      host.querySelectorAll(".footer-top-luminous-line, .footer-divider"),
    );
    const overview = host.querySelector(".footer-overview-block");
    const pills = Array.from(host.querySelectorAll(".contributor-pill"));
    const metaNodes = Array.from(
      host.querySelectorAll(
        ".footer-partner-pill, .footer-legal-note, .footer-bottom-meta",
      ),
    );

    if (lines.length) gsap.set(lines, { scaleX: 0, transformOrigin: "center center" });
    if (overview) gsap.set(overview, { opacity: 0, y: 16 });
    if (pills.length) gsap.set(pills, { opacity: 0, y: 14, scale: 0.96 });
    if (metaNodes.length) gsap.set(metaNodes, { opacity: 0 });

    const playEntrance = () => {
      if (host.dataset.footerAnimated === "true") return;
      host.dataset.footerAnimated = "true";
      host.classList.add("is-footer-revealed");

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      if (lines.length) {
        tl.to(lines, {
          scaleX: 1,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "transform",
        });
      }
      if (overview) {
        tl.to(
          overview,
          {
            opacity: 1,
            y: 0,
            duration: 0.62,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
          0.12,
        );
      }
      if (pills.length) {
        tl.to(
          pills,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.62,
            stagger: 0.12,
            ease: "back.out(1.4)",
            clearProps: "transform,opacity",
          },
          0.26,
        );
      }
      if (metaNodes.length) {
        tl.to(
          metaNodes,
          {
            opacity: 1,
            duration: 0.55,
            stagger: 0.08,
            ease: "power2.out",
            clearProps: "opacity",
          },
          0.42,
        );
      }
    };

    ScrollTrigger.create({
      trigger: host,
      start: "top 92%",
      once: true,
      onEnter: playEntrance,
    });

    const checkImmediate = () => {
      ScrollTrigger.refresh();
      const rect = host.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.94) {
        playEntrance();
      }
    };

    requestAnimationFrame(checkImmediate);
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  });
}

export function initGlobalBackToTopButton() {
  try {
    if (new URLSearchParams(window.location.search).get("embed") === "true") {
      return null;
    }
  } catch {
    // Ignore URLSearchParams issues
  }

  if (document.body?.classList.contains("is-embed")) {
    return null;
  }

  let btn = document.getElementById("plantipedia-back-to-top");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "plantipedia-back-to-top";
    btn.className = "plantipedia-back-to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.title = "Back to top";

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↑";
    btn.appendChild(arrow);

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.body.appendChild(btn);
  }

  if (!window.__plantipediaBackToTopBound) {
    window.__plantipediaBackToTopBound = true;
    const syncVisibility = () => {
      const target = document.getElementById("plantipedia-back-to-top");
      if (!target) return;
      target.classList.toggle("is-visible", window.scrollY > 320);
    };
    window.addEventListener("scroll", syncVisibility, { passive: true });
    syncVisibility();
  }

  return btn;
}

let compiledFooterPromise = null;

export function compileFooter() {
  if (compiledFooterPromise) return compiledFooterPromise;

  compiledFooterPromise = (async () => {
    const host =
      document.getElementById("global-footer") ||
      document.querySelector('[data-shell="footer"]') ||
      document.getElementById("app-footer");

    try {
      if (new URLSearchParams(window.location.search).get("embed") === "true") {
        document.body.classList.add("is-embed");
        if (host) {
          host.replaceChildren();
          host.hidden = true;
        }
        return null;
      }
    } catch {
      // Ignore query parse failures
    }

    if (!host) {
      initGlobalBackToTopButton();
      return null;
    }

    let config = FALLBACK_FOOTER_CONFIG;
    try {
      const loaded = await fetchDataset("footer");
      if (loaded && typeof loaded === "object") {
        config = loaded;
      }
    } catch {
      // Lightweight fallback guarantees footer continuity on offline/fetch errors
    }

    buildFooterDom(host, config);
    initFooterScrollAnimation(host);
    initGlobalBackToTopButton();
    document.dispatchEvent(
      new CustomEvent("plantipedia:footer-ready", { detail: { config } }),
    );
    return config;
  })();

  return compiledFooterPromise;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", compileFooter);
} else {
  compileFooter();
}
