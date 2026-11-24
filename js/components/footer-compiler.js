/**
 * Independent Global Footer Compiler (./data/config/footer.json)
 * - Targets #global-footer (or [data-shell="footer"]) automatically on page load
 * - Fetches ./data/config/footer.json and renders the compact centered Dark Botanical Luxury footer
 * - Resolves dynamic copyright year (autoYear: true) and binds smooth back-to-top scrolling
 * - Provides graceful lightweight fallback if JSON fetch fails
 */

import { fetchDataset } from "../services/api.js";
import { resolveSitePath } from "./navbar-compiler.js";

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
  backToTopLabel: "Back to Top ↑",
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

function buildFooterDom(host, config) {
  const brand = config.brand || FALLBACK_FOOTER_CONFIG.brand;
  const isCompact = host.getAttribute("data-footer-variant") === "compact";

  host.classList.add("site-footer");
  if (isCompact) {
    host.classList.add("site-footer--compact");
  }

  const container = document.createElement("div");
  container.className = "footer-container";

  // Centered Emblem & Tagline Block
  const overview = document.createElement("div");
  overview.className = "footer-overview-block";
  overview.appendChild(createFooterBrand(brand));

  const taglineText = isCompact
    ? config.tagline || brand.tagline || FALLBACK_FOOTER_CONFIG.tagline
    : config.summary || config.tagline || FALLBACK_FOOTER_CONFIG.summary;

  const copy = document.createElement("p");
  copy.className = isCompact
    ? "footer-tagline-compact"
    : "footer-overview-copy";
  copy.textContent = taglineText;
  overview.appendChild(copy);
  container.appendChild(overview);

  const divider = document.createElement("div");
  divider.className = "footer-divider";
  divider.setAttribute("aria-hidden", "true");
  container.appendChild(divider);

  // Credits, Partners, Disclaimer & Dynamic Copyright Bar
  const creditsBar = document.createElement("div");
  creditsBar.className = "footer-credits-bar";

  if (Array.isArray(config.credits) && config.credits.length > 0) {
    const creditRow = document.createElement("div");
    creditRow.className = "footer-credit-row";

    config.credits.forEach((credit) => {
      const line = document.createElement("p");
      line.className = "footer-credit-line";

      const roleSpan = document.createElement("span");
      roleSpan.className = "credit-label";
      roleSpan.textContent = credit.role;

      const sepSpan = document.createElement("span");
      sepSpan.className = "credit-sep";
      sepSpan.setAttribute("aria-hidden", "true");
      sepSpan.textContent = "·";

      const nameSpan = document.createElement("span");
      nameSpan.className = "credit-name";
      nameSpan.textContent = credit.name;

      line.appendChild(roleSpan);
      line.appendChild(sepSpan);
      line.appendChild(nameSpan);
      creditRow.appendChild(line);
    });

    creditsBar.appendChild(creditRow);
  }

  if (
    !isCompact &&
    Array.isArray(config.partners) &&
    config.partners.length > 0
  ) {
    const partnerPill = document.createElement("div");
    partnerPill.className = "footer-partner-pill";

    config.partners.forEach((partner, idx) => {
      if (idx > 0) {
        const pipe = document.createElement("span");
        pipe.className = "partner-pipe";
        pipe.setAttribute("aria-hidden", "true");
        pipe.textContent = "|";
        partnerPill.appendChild(pipe);
      }
      const muted = document.createElement("span");
      muted.className = "partner-muted";
      muted.textContent = `${partner.prefix} `;

      const strong = document.createElement("strong");
      strong.className = "partner-highlight";
      strong.textContent = partner.name;

      partnerPill.appendChild(muted);
      partnerPill.appendChild(strong);
    });

    creditsBar.appendChild(partnerPill);
  }

  const disclaimerText = config.disclaimer || config.legalNote;
  if (disclaimerText) {
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

  if (config.backToTopLabel) {
    const topBtn = document.createElement("button");
    topBtn.type = "button";
    topBtn.className = "footer-top-btn";
    topBtn.textContent = config.backToTopLabel;
    topBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    bottomRow.appendChild(topBtn);
  }

  creditsBar.appendChild(bottomRow);
  container.appendChild(creditsBar);
  host.replaceChildren(container);
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

    if (!host) return null;

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
