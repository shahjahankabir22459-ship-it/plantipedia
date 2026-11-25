/**
 * Multi-page GSAP 3 + ScrollTrigger choreography & offline IntersectionObserver fallback
 * engineered for asynchronous [data-section] mount hydration.
 */

let gsapRegistered = false;
let progressInitialized = false;
let fallbackObserver = null;
const animatedMounts = new WeakSet();

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function ensureGsapReady() {
  if (typeof window.gsap === "undefined") return false;
  if (!gsapRegistered && typeof window.ScrollTrigger !== "undefined") {
    window.gsap.registerPlugin(window.ScrollTrigger);
    gsapRegistered = true;
  }
  return true;
}

function ensureFallbackObserver() {
  if (fallbackObserver || typeof IntersectionObserver === "undefined") {
    return fallbackObserver;
  }
  fallbackObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -28px 0px" },
  );
  return fallbackObserver;
}

function revealWithCssFallback(scopeEl) {
  if (!scopeEl) return;
  const elements = Array.from(
    scopeEl.querySelectorAll(
      ".mission-stat-card, .highlight-card, .domain-card, .curiosity-strip, .species-card, .chapter-card, .pager-link",
    ),
  );
  if (!elements.length) return;

  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    elements.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  document.documentElement.classList.add("css-reveal-fallback");
  const observer = ensureFallbackObserver();

  elements.forEach((el, idx) => {
    if (el.classList.contains("is-revealed")) return;
    el.classList.add("reveal-on-scroll");
    el.style.setProperty("--reveal-delay", `${(idx % 3) * 65}ms`);
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96) {
      requestAnimationFrame(() => el.classList.add("is-revealed"));
    } else if (observer) {
      observer.observe(el);
    }
  });
}

function animateStaggerNodes(triggerEl, items) {
  if (!items || !items.length) return;
  const { gsap } = window;
  gsap.from(items, {
    y: 28,
    opacity: 0,
    duration: 0.72,
    ease: "power3.out",
    stagger: 0.1,
    clearProps: "transform,opacity",
    scrollTrigger: {
      trigger: triggerEl,
      start: "top 88%",
      once: true,
    },
  });
}

function animateHeaderNodes(headers) {
  if (!headers || !headers.length) return;
  const { gsap } = window;
  headers.forEach((el) => {
    gsap.from(el, {
      y: 24,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: el,
        start: "top 86%",
        once: true,
      },
    });
  });
}

export function initGlobalAnimations() {
  if (prefersReducedMotion() || progressInitialized) return;
  if (!ensureGsapReady() || typeof window.ScrollTrigger === "undefined") return;

  const progressBar = document.getElementById("scrollProgressBar");
  if (progressBar) {
    progressInitialized = true;
    window.gsap.to(progressBar, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.2,
      },
    });
  }
}

export function animateHydratedSection(sectionKey, mountEl) {
  if (!mountEl || animatedMounts.has(mountEl)) return;
  animatedMounts.add(mountEl);

  if (document.body.classList.contains("is-embed")) {
    return;
  }

  initGlobalAnimations();

  if (prefersReducedMotion()) return;

  if (!ensureGsapReady() || typeof window.ScrollTrigger === "undefined") {
    revealWithCssFallback(mountEl);
    return;
  }

  const { gsap, ScrollTrigger } = window;

  if (sectionKey === "hero") {
    const heroEls = mountEl.querySelectorAll(
      ".hero-kicker, .hero-headline, .hero-subcopy, .home-search-shell, .hero-summary-strip",
    );
    if (heroEls.length) {
      gsap.from(heroEls, {
        y: 28,
        opacity: 0,
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.1,
        clearProps: "transform,opacity",
      });
    }
    const heroSection = mountEl.querySelector(".home-hero");
    const heroInner = mountEl.querySelector(".home-hero-inner");
    if (heroSection && heroInner) {
      gsap.fromTo(
        heroInner,
        { yPercent: -2 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: heroSection,
            start: "top top",
            end: "bottom top",
            scrub: 0.4,
          },
        },
      );
    }
  } else if (sectionKey === "about") {
    animateHeaderNodes(mountEl.querySelectorAll(".mission-copy-col"));
    animateStaggerNodes(
      mountEl.querySelector(".mission-stats-col") || mountEl,
      mountEl.querySelectorAll(".mission-stat-card"),
    );
  } else if (sectionKey === "featured-species") {
    animateHeaderNodes(mountEl.querySelectorAll(".showcase-header"));
    animateStaggerNodes(
      mountEl.querySelector("#featuredSpeciesGrid") || mountEl,
      mountEl.querySelectorAll(".species-card"),
    );
  } else if (sectionKey === "taxonomy") {
    animateHeaderNodes(mountEl.querySelectorAll(".domains-header"));
    animateStaggerNodes(
      mountEl.querySelector(".domains-grid") || mountEl,
      mountEl.querySelectorAll(".domain-card"),
    );
  } else if (sectionKey === "global-gateway") {
    animateHeaderNodes(mountEl.querySelectorAll(".global-gateway-card"));
  } else if (sectionKey === "trivia") {
    animateHeaderNodes(mountEl.querySelectorAll(".curiosities-header"));
    animateStaggerNodes(
      mountEl.querySelector(".curiosities-list") || mountEl,
      mountEl.querySelectorAll(".curiosity-strip"),
    );
  } else if (sectionKey === "highlights") {
    animateHeaderNodes(mountEl.querySelectorAll(".highlights-header"));
    animateStaggerNodes(
      mountEl.querySelector(".highlights-grid") || mountEl,
      mountEl.querySelectorAll(".highlight-card"),
    );
  } else if (sectionKey === "directory-banner") {
    const dirEls = mountEl.querySelectorAll(
      ".breadcrumb-bar, .section-eyebrow, .directory-headline, .directory-subcopy, .directory-stat-pill",
    );
    if (dirEls.length) {
      gsap.from(dirEls, {
        y: 24,
        opacity: 0,
        duration: 0.68,
        ease: "power3.out",
        stagger: 0.08,
        clearProps: "transform,opacity",
      });
    }
  } else if (sectionKey === "directory-explorer") {
    const filterPanel = mountEl.querySelector(".directory-filter-panel");
    if (filterPanel) {
      gsap.from(filterPanel, {
        y: 20,
        opacity: 0,
        duration: 0.62,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });
    }
    animateStaggerNodes(
      mountEl.querySelector("#directorySpeciesGrid") || mountEl,
      mountEl.querySelectorAll(".species-card"),
    );
  } else if (sectionKey === "plant-monograph") {
    const detailHeroEls = mountEl.querySelectorAll(
      ".detail-breadcrumb-row, .overview-title-block > *, .overview-hero-figure, .classification-table-wrap",
    );
    if (detailHeroEls.length) {
      gsap.from(detailHeroEls, {
        y: 26,
        opacity: 0,
        duration: 0.72,
        ease: "power3.out",
        stagger: 0.09,
        clearProps: "transform,opacity",
      });
    }

    const overviewHeroCard = mountEl.querySelector(".overview-hero-card");
    const heroPlateImg = mountEl.querySelector(".overview-hero-media img");
    if (overviewHeroCard && heroPlateImg) {
      gsap.set(heroPlateImg, { scale: 1.12 });
      gsap.fromTo(
        heroPlateImg,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: overviewHeroCard,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.35,
          },
        },
      );
    }

    mountEl.querySelectorAll(".chapter-card").forEach((card) => {
      gsap.from(card, {
        y: 28,
        opacity: 0,
        duration: 0.74,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: card,
          start: "top 86%",
          once: true,
        },
      });

      const figures = card.querySelectorAll(
        ".chapter-figure-single, .gallery-figure",
      );
      if (figures.length) {
        gsap.from(figures, {
          scale: 0.95,
          opacity: 0,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.1,
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: card,
            start: "top 84%",
            once: true,
          },
        });
      }

      const subblocks = card.querySelectorAll(".subblock-item");
      if (subblocks.length) {
        gsap.from(subblocks, {
          y: 20,
          opacity: 0,
          duration: 0.65,
          ease: "power3.out",
          stagger: 0.08,
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: card.querySelector(".chapter-subblocks") || card,
            start: "top 86%",
            once: true,
          },
        });
      }
    });

    animateStaggerNodes(
      mountEl.querySelector(".species-pager") || mountEl,
      mountEl.querySelectorAll(".pager-link"),
    );
  }

  ScrollTrigger.refresh();
}

export function animateDynamicSpeciesGrid(gridScope) {
  if (!gridScope) return;
  if (!ensureGsapReady() || prefersReducedMotion()) {
    revealWithCssFallback(gridScope);
    return;
  }
  const cards = gridScope.querySelectorAll(".species-card");
  if (!cards.length) {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    return;
  }

  window.gsap.killTweensOf(cards);
  window.gsap.from(cards, {
    y: 26,
    opacity: 0,
    duration: 0.62,
    ease: "power3.out",
    stagger: 0.06,
    clearProps: "transform,opacity",
    overwrite: true,
  });
  if (window.ScrollTrigger) {
    window.ScrollTrigger.refresh();
  }
}

export function refreshScrollTriggers() {
  if (window.ScrollTrigger) {
    window.ScrollTrigger.refresh();
  }
}
