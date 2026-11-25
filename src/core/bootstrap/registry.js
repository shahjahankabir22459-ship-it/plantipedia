/**
 * Declarative Component Registry for Plantipedia Headless Static Architecture.
 * - Scans DOM for [data-section] mount points on load
 * - Resolves minimal deduplicated JSON dataset dependencies per active page
 * - Uses ./data/catalog/species-index.json for index/search and on-demand ./data/species/<slug>.json for monographs
 * - Renders skeletons immediately to prevent CLS and hydrates concurrently via Promise.allSettled()
 */

import {
  fetchDatasetsConcurrently,
  isValidSpeciesSlug,
  normalizeSpeciesSlug,
} from "../../engines/global-server/api.js";
import {
  setActiveMonograph,
  setMountState,
  setSpeciesIndex,
} from "./state.js";
import { applyPageSeo } from "../../modules/utils/seo.js";
import {
  renderHeroSection,
  renderHomeTelemetrySection,
  renderAboutSection,
  renderFeaturedSpeciesSection,
  renderTaxonomySection,
  renderGlobalGatewaySection,
  renderTriviaSection,
  renderHighlightsSection,
  renderMountSkeleton,
  renderMountError,
} from "../../modules/utils/templates.js";
import {
  renderDirectoryBanner,
  renderDirectoryExplorer,
} from "../../modules/pages/species-directory.js";
import { renderPlantMonograph } from "../../modules/pages/plant-monograph.js";
import { renderLiveMonographView } from "../../modules/pages/live-plant-view.js";
import { renderTaxonomyExplorer } from "../../modules/pages/taxonomy-view.js";
import { renderSeasonsCalendar } from "../../modules/pages/seasons-view.js";
import { renderCompareWorkspace } from "../../modules/pages/compare-view.js";
import { renderCompareResultWorkspace } from "../../modules/pages/compare-result-view.js";
import { renderServicesPortal } from "../../modules/pages/services-controller.js";
import { animateHydratedSection, refreshScrollTriggers } from "../telemetry/animations.js";
import { initNavigationInteractions } from "../../engines/search/navigation.js";

function resolveRequestedSpeciesSlug() {
  const params = new URLSearchParams(window.location.search);
  const querySlug =
    params.get("species") || params.get("slug") || params.get("id");
  if (querySlug) return normalizeSpeciesSlug(querySlug);

  const hash = window.location.hash || "";
  const match = hash.match(/^#\/plant\/([^/?#]+)/i);
  if (match && match[1]) {
    try {
      return normalizeSpeciesSlug(decodeURIComponent(match[1]));
    } catch {
      return normalizeSpeciesSlug(match[1]);
    }
  }

  return "mango";
}

const SECTION_REGISTRY = {
  hero: {
    datasets: ["page:home"],
    optionalDatasets: ["speciesIndex"],
    render: (el, dataMap) => {
      renderHeroSection(el, {
        pageData: dataMap.get("page:home")?.data,
        catalog: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  "home-telemetry": {
    datasets: [],
    optionalDatasets: ["speciesIndex"],
    render: (el, dataMap) => {
      renderHomeTelemetrySection(el, {
        catalog: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  about: {
    datasets: ["page:home"],
    optionalDatasets: ["speciesIndex"],
    render: (el, dataMap) => {
      renderAboutSection(el, {
        pageData: dataMap.get("page:home")?.data,
        catalog: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  "featured-species": {
    datasets: ["featured"],
    optionalDatasets: ["speciesIndex"],
    render: (el, dataMap) => {
      renderFeaturedSpeciesSection(el, {
        sectionData: dataMap.get("featured")?.data,
        catalog: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  taxonomy: {
    datasets: ["taxonomy"],
    render: (el, dataMap) => {
      renderTaxonomySection(el, {
        sectionData: dataMap.get("taxonomy")?.data,
      });
    },
  },
  "global-gateway": {
    datasets: ["page:home"],
    render: (el, dataMap) => {
      renderGlobalGatewaySection(el, {
        pageData: dataMap.get("page:home")?.data,
      });
    },
  },
  trivia: {
    datasets: ["trivia"],
    render: (el, dataMap) => {
      renderTriviaSection(el, {
        sectionData: dataMap.get("trivia")?.data,
      });
    },
  },
  highlights: {
    datasets: ["highlights"],
    render: (el, dataMap) => {
      renderHighlightsSection(el, {
        sectionData: dataMap.get("highlights")?.data,
      });
    },
  },
  "directory-banner": {
    datasets: ["page:species"],
    optionalDatasets: ["speciesIndex"],
    render: (el, dataMap) => {
      renderDirectoryBanner(el, {
        pageData: dataMap.get("page:species")?.data,
        catalog: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  "directory-explorer": {
    datasets: ["page:species", "speciesIndex"],
    render: (el, dataMap) => {
      renderDirectoryExplorer(el, {
        pageData: dataMap.get("page:species")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  "plant-monograph": {
    datasets: ["page:plant", "speciesIndex"],
    optionalDatasets: ["glossary"],
    getDynamicDatasets: () => {
      const slug = resolveRequestedSpeciesSlug();
      return isValidSpeciesSlug(slug) ? [`species:${slug}`] : [];
    },
    render: (el, dataMap) => {
      const requestedSlug = resolveRequestedSpeciesSlug();
      const speciesKey = `species:${requestedSlug}`;
      const plantOutcome = dataMap.get(speciesKey);
      const plant = plantOutcome?.ok ? plantOutcome.data : null;
      setActiveMonograph(plant);
      renderPlantMonograph(el, {
        pageData: dataMap.get("page:plant")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
        plant,
        requestedSlug,
        glossaryData: dataMap.get("glossary")?.data || null,
      });
    },
  },
  "live-monograph": {
    datasets: ["page:plant", "speciesIndex"],
    optionalDatasets: ["glossary"],
    render: (el, dataMap) => {
      renderLiveMonographView(el, {
        pageData: dataMap.get("page:plant")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
        glossaryData: dataMap.get("glossary")?.data || null,
      });
    },
  },
  "taxonomy-explorer": {
    datasets: ["page:taxonomy", "speciesIndex"],
    render: (el, dataMap) => {
      renderTaxonomyExplorer(el, {
        pageData: dataMap.get("page:taxonomy")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  "seasons-calendar": {
    datasets: ["page:seasons", "speciesIndex"],
    render: (el, dataMap) => {
      renderSeasonsCalendar(el, {
        pageData: dataMap.get("page:seasons")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  "compare-workspace": {
    datasets: ["page:compare", "speciesIndex"],
    render: (el, dataMap) => {
      renderCompareWorkspace(el, {
        pageData: dataMap.get("page:compare")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
      });
    },
  },
  "compare-result": {
    datasets: ["page:compare", "speciesIndex"],
    optionalDatasets: ["page:seasons"],
    render: (el, dataMap) => {
      renderCompareResultWorkspace(el, {
        pageData: dataMap.get("page:compare")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
        seasonsData: dataMap.get("page:seasons")?.data || null,
      });
    },
  },
  "services-portal": {
    datasets: ["page:services", "speciesIndex"],
    optionalDatasets: ["page:seasons", "glossary"],
    render: (el, dataMap) => {
      renderServicesPortal(el, {
        pageData: dataMap.get("page:services")?.data,
        speciesIndex: dataMap.get("speciesIndex")?.data || [],
        seasonsData: dataMap.get("page:seasons")?.data || null,
        glossaryData: dataMap.get("glossary")?.data || null,
      });
    },
  },
  "section-map": {
    // Co-hydrated by plant-monograph once active species monograph resolves
    datasets: [],
    skipSkeleton: true,
    render: null,
  },
};

function resolveActivePageKey() {
  const mainEl = document.getElementById("app-main") || document.getElementById("compare-workspace");
  const pageName =
    mainEl?.getAttribute("data-page") ||
    document.body.getAttribute("data-page") ||
    "home";
  const pageKeyMap = {
    home: "page:home",
    species: "page:species",
    plant: "page:plant",
    "plant-live": "page:plant",
    taxonomy: "page:taxonomy",
    seasons: "page:seasons",
    compare: "page:compare",
    "compare-result": "page:compare",
    services: "page:services",
  };
  return pageKeyMap[pageName] || null;
}

function hydrateSectionMount(mountEl, sectionKey, entry, dataMap) {
  const missingRequired = (entry.datasets || []).find(
    (key) => !dataMap.get(key)?.ok,
  );

  if (missingRequired) {
    const err = dataMap.get(missingRequired)?.error;
    const msg = err?.message || `Unable to load dataset "${missingRequired}".`;
    setMountState(sectionKey, { status: "error", error: err || new Error(msg) });
    renderMountError(mountEl, sectionKey, msg);
    return;
  }

  try {
    entry.render(mountEl, dataMap);
    setMountState(sectionKey, { status: "ready", error: null });
    animateHydratedSection(sectionKey, mountEl);
    initNavigationInteractions();
  } catch (renderErr) {
    setMountState(sectionKey, { status: "error", error: renderErr });
    renderMountError(mountEl, sectionKey, renderErr.message);
  }
}

export async function retryMountSection(sectionKey) {
  const mountEl = document.querySelector(`[data-section="${sectionKey}"]`);
  const entry = SECTION_REGISTRY[sectionKey];
  if (!mountEl || !entry || typeof entry.render !== "function") return;

  setMountState(sectionKey, { status: "loading", error: null });
  renderMountSkeleton(mountEl, sectionKey);

  const dynamicKeys =
    typeof entry.getDynamicDatasets === "function"
      ? entry.getDynamicDatasets()
      : [];

  const keysToLoad = [
    ...(entry.datasets || []),
    ...(entry.optionalDatasets || []),
    ...dynamicKeys,
  ];
  const dataMap = await fetchDatasetsConcurrently(keysToLoad, { forceRefresh: true });

  const indexOutcome = dataMap.get("speciesIndex");
  if (indexOutcome?.ok) {
    setSpeciesIndex(indexOutcome.data);
  }

  hydrateSectionMount(mountEl, sectionKey, entry, dataMap);
  refreshScrollTriggers();
}

export async function hydrateActivePage(root = document) {
  const sectionMounts = Array.from(root.querySelectorAll("[data-section]"));

  const requiredDatasetKeys = new Set();
  const activePageKey = resolveActivePageKey();
  if (activePageKey) {
    requiredDatasetKeys.add(activePageKey);
  }

  sectionMounts.forEach((el) => {
    const sectionKey = el.getAttribute("data-section");
    const entry = SECTION_REGISTRY[sectionKey];
    if (!entry) return;
    if (!entry.skipSkeleton) {
      setMountState(sectionKey, { status: "loading", error: null });
      renderMountSkeleton(el, sectionKey);
    }
    (entry.datasets || []).forEach((k) => requiredDatasetKeys.add(k));
    (entry.optionalDatasets || []).forEach((k) => requiredDatasetKeys.add(k));
    if (typeof entry.getDynamicDatasets === "function") {
      entry.getDynamicDatasets().forEach((k) => requiredDatasetKeys.add(k));
    }
  });

  let dataMap;
  try {
    // Load page JSON, species-index.json, and active species monograph concurrently via Promise.allSettled()
    dataMap = await fetchDatasetsConcurrently(Array.from(requiredDatasetKeys));
  } catch (err) {
    const msg = err?.message || "Unable to fetch botanical archive datasets.";
    sectionMounts.forEach((el) => {
      const sectionKey = el.getAttribute("data-section");
      const entry = SECTION_REGISTRY[sectionKey];
      if (!entry || typeof entry.render !== "function") return;
      setMountState(sectionKey, { status: "error", error: err });
      renderMountError(el, sectionKey, msg);
    });
    return;
  }

  const indexOutcome = dataMap.get("speciesIndex");
  if (indexOutcome?.ok) {
    setSpeciesIndex(indexOutcome.data);
  }

  if (activePageKey && dataMap.get(activePageKey)?.ok) {
    try {
      applyPageSeo(dataMap.get(activePageKey).data.seo);
    } catch {
      // Non-blocking: SEO metadata failures must never stall section hydration
    }
  }

  sectionMounts.forEach((el) => {
    const sectionKey = el.getAttribute("data-section");
    const entry = SECTION_REGISTRY[sectionKey];
    if (!entry || typeof entry.render !== "function") return;
    hydrateSectionMount(el, sectionKey, entry, dataMap);
  });

  initNavigationInteractions();
  refreshScrollTriggers();
}
