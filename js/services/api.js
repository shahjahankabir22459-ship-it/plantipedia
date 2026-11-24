/**
 * Centralized JSON Data Fetching, Schema Validation, SessionStorage Caching & Request Deduplication Layer.
 * Uses strict relative ./ paths resolved safely for root and GitHub Pages subpath hosting.
 */

import { resolveRootPath } from "../core/router.js";

const SITE_ROOT_URL = new URL("../../", import.meta.url);
const SPECIES_INDEX_STORAGE_KEY = "plantipedia:species-index:v1.3.0";
const KEBAB_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const DATASET_ENDPOINTS = Object.freeze({
  navbar: "./data/config/navbar.json",
  footer: "./data/config/footer.json",
  siteShell: "./data/config/site-shell.json",
  speciesIndex: "./data/catalog/species-index.json",
  catalog: "./data/catalog/species-index.json",
  glossary: "./data/catalog/glossary.json",
  "page:home": "./data/pages/home.json",
  "page:species": "./data/pages/species.json",
  "page:plant": "./data/pages/plant.json",
  "page:taxonomy": "./data/pages/taxonomy.json",
  "page:seasons": "./data/pages/seasons.json",
  "page:compare": "./data/pages/compare.json",
  featured: "./data/catalog/featured-species.json",
  taxonomy: "./data/catalog/taxonomy.json",
  trivia: "./data/catalog/trivia.json",
  highlights: "./data/catalog/highlights.json",
});

export const SECTION_ENDPOINTS = Object.freeze({
  featured: DATASET_ENDPOINTS.featured,
  taxonomy: DATASET_ENDPOINTS.taxonomy,
  trivia: DATASET_ENDPOINTS.trivia,
  highlights: DATASET_ENDPOINTS.highlights,
});

export const SPECIES_INDEX_ENDPOINT = DATASET_ENDPOINTS.speciesIndex;
export const CATALOG_ENDPOINT = SPECIES_INDEX_ENDPOINT;

const inFlightCache = new Map();

export function resolveDatasetHref(relativePath) {
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    return resolveRootPath(relativePath);
  }
  const clean = relativePath.replace(/^\.\//, "");
  return new URL(clean, SITE_ROOT_URL).href;
}

export function normalizeSpeciesSlug(rawSlug) {
  if (typeof rawSlug !== "string") return "";
  return rawSlug.trim().toLowerCase();
}

export function isValidSpeciesSlug(slug) {
  return KEBAB_SLUG_RE.test(slug);
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Malformed ${label} payload: expected a JSON object.`);
  }
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Malformed dataset entry: missing "${fieldName}".`);
  }
}

function assertImageObject(imageObj, contextLabel) {
  assertObject(imageObj, `${contextLabel}.image`);
  assertNonEmptyString(
    imageObj.imageUrl || imageObj.url,
    `${contextLabel}.image.imageUrl`,
  );
  assertNonEmptyString(
    imageObj.imageAlt || imageObj.alt,
    `${contextLabel}.image.imageAlt`,
  );
}

function validateNavbarPayload(payload) {
  assertObject(payload, "navbar");
  assertObject(payload.brand, "navbar.brand");
  if (!Array.isArray(payload.links)) {
    throw new Error('Malformed navbar.json payload: "links" must be an array.');
  }
  return payload;
}

function validateFooterPayload(payload) {
  assertObject(payload, "footer");
  assertObject(payload.brand, "footer.brand");
  return payload;
}

function validateSiteShellPayload(payload) {
  assertObject(payload, "site-shell");
  assertObject(payload.brand, "site-shell.brand");
  assertObject(payload.navbar, "site-shell.navbar");
  assertObject(payload.footer, "site-shell.footer");
  return payload;
}

function validateSpeciesIndexPayload(payload) {
  assertObject(payload, "species-index");
  if (!Array.isArray(payload.species)) {
    throw new Error(
      'Malformed species-index.json payload: "species" must be an array.',
    );
  }
  payload.species.forEach((item, idx) => {
    assertObject(item, `species-index.species[${idx}]`);
    assertNonEmptyString(item.slug, "slug");
    assertNonEmptyString(item.commonName, "commonName");
    assertNonEmptyString(item.scientificName, "scientificName");
    assertNonEmptyString(item.category, "category");
  });
  return payload.species;
}

function validateSpeciesMonographPayload(payload) {
  assertObject(payload, "species-monograph");
  assertNonEmptyString(payload.slug, "slug");
  assertNonEmptyString(payload.commonName, "commonName");
  assertNonEmptyString(payload.scientificName, "scientificName");
  assertObject(payload.overview, "overview");
  if (!Array.isArray(payload.sections)) {
    throw new Error(
      'Malformed monograph payload: "sections" must be an array.',
    );
  }
  return payload;
}

function validateHomePagePayload(payload) {
  assertObject(payload, "pages/home");
  assertObject(payload.hero, "pages/home.hero");
  assertObject(payload.about, "pages/home.about");
  assertNonEmptyString(payload.hero.headline, "hero.headline");
  assertNonEmptyString(payload.about.heading, "about.heading");
  return payload;
}

function validateSpeciesPagePayload(payload) {
  assertObject(payload, "pages/species");
  assertObject(payload.banner, "pages/species.banner");
  assertObject(payload.explorer, "pages/species.explorer");
  assertNonEmptyString(payload.banner.headline, "banner.headline");
  return payload;
}

function validatePlantPagePayload(payload) {
  assertObject(payload, "pages/plant");
  assertObject(payload.sectionMap, "pages/plant.sectionMap");
  assertObject(payload.monograph, "pages/plant.monograph");
  return payload;
}

function validateTaxonomyPagePayload(payload) {
  assertObject(payload, "pages/taxonomy");
  assertObject(payload.banner, "pages/taxonomy.banner");
  assertObject(payload.families, "pages/taxonomy.families");
  return payload;
}

function validateSeasonsPagePayload(payload) {
  assertObject(payload, "pages/seasons");
  assertObject(payload.banner, "pages/seasons.banner");
  if (!Array.isArray(payload.seasons)) {
    throw new Error(
      'Malformed pages/seasons payload: "seasons" must be an array.',
    );
  }
  return payload;
}

function validateComparePagePayload(payload) {
  assertObject(payload, "pages/compare");
  assertObject(payload.selector, "pages/compare.selector");
  if (!Array.isArray(payload.loaderStages)) {
    throw new Error(
      'Malformed pages/compare payload: "loaderStages" must be an array.',
    );
  }
  return payload;
}

function validateGlossaryPayload(payload) {
  assertObject(payload, "glossary");
  if (!Array.isArray(payload.terms)) {
    throw new Error(
      'Malformed glossary.json payload: "terms" must be an array.',
    );
  }
  return payload;
}

function validateFeaturedPayload(payload) {
  assertObject(payload, "featured-species");
  if (!Array.isArray(payload.items)) {
    throw new Error(
      'Malformed featured-species payload: "items" must be an array.',
    );
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `featured-species.items[${idx}]`);
    assertNonEmptyString(item.id || item.slug, "id/slug");
    assertNonEmptyString(item.commonName, "commonName");
    assertNonEmptyString(item.scientificName, "scientificName");
    assertNonEmptyString(item.category, "category");
    assertNonEmptyString(item.family, "family");
    assertNonEmptyString(item.shortSummary, "shortSummary");
    assertImageObject(item.image, `featured-species.items[${idx}]`);
  });
  return payload;
}

function validateTaxonomyPayload(payload) {
  assertObject(payload, "taxonomy");
  if (!Array.isArray(payload.items)) {
    throw new Error('Malformed taxonomy payload: "items" must be an array.');
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `taxonomy.items[${idx}]`);
    assertNonEmptyString(item.id, "id");
    assertNonEmptyString(item.title, "title");
    assertNonEmptyString(item.description, "description");
    assertNonEmptyString(item.href, "href");
    if (item.image) {
      assertImageObject(item.image, `taxonomy.items[${idx}]`);
    }
  });
  return payload;
}

function validateTriviaPayload(payload) {
  assertObject(payload, "trivia");
  if (!Array.isArray(payload.items)) {
    throw new Error('Malformed trivia payload: "items" must be an array.');
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `trivia.items[${idx}]`);
    assertNonEmptyString(item.id, "id");
    assertNonEmptyString(item.title, "title");
    assertNonEmptyString(item.description, "description");
    assertNonEmptyString(item.taxonLabel, "taxonLabel");
    if (item.image) {
      assertImageObject(item.image, `trivia.items[${idx}]`);
    }
  });
  return payload;
}

function validateHighlightsPayload(payload) {
  assertObject(payload, "highlights");
  if (!Array.isArray(payload.items)) {
    throw new Error('Malformed highlights payload: "items" must be an array.');
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `highlights.items[${idx}]`);
    assertNonEmptyString(item.id, "id");
    assertNonEmptyString(item.title, "title");
    assertNonEmptyString(item.description, "description");
    if (item.image) {
      assertImageObject(item.image, `highlights.items[${idx}]`);
    }
  });
  return payload;
}

const VALIDATORS = {
  navbar: validateNavbarPayload,
  footer: validateFooterPayload,
  siteShell: validateSiteShellPayload,
  speciesIndex: validateSpeciesIndexPayload,
  catalog: validateSpeciesIndexPayload,
  glossary: validateGlossaryPayload,
  "page:home": validateHomePagePayload,
  "page:species": validateSpeciesPagePayload,
  "page:plant": validatePlantPagePayload,
  "page:taxonomy": validateTaxonomyPagePayload,
  "page:seasons": validateSeasonsPagePayload,
  "page:compare": validateComparePagePayload,
  featured: validateFeaturedPayload,
  taxonomy: validateTaxonomyPayload,
  trivia: validateTriviaPayload,
  highlights: validateHighlightsPayload,
};

async function fetchJsonResource(url, label) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label} (HTTP ${response.status}).`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`Invalid JSON syntax in ${label}.`);
  }
}

function readCachedSpeciesIndex() {
  try {
    const raw = window.sessionStorage?.getItem(SPECIES_INDEX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedSpeciesIndex(speciesList) {
  try {
    if (Array.isArray(speciesList) && speciesList.length > 0) {
      window.sessionStorage?.setItem(
        SPECIES_INDEX_STORAGE_KEY,
        JSON.stringify(speciesList),
      );
    }
  } catch {
    // Ignore sessionStorage quota/privacy errors
  }
}

export function fetchDataset(datasetKey, { forceRefresh = false } = {}) {
  const normalizedKey = datasetKey === "catalog" ? "speciesIndex" : datasetKey;
  const relPath = DATASET_ENDPOINTS[normalizedKey];
  const validator = VALIDATORS[normalizedKey];
  if (!relPath || !validator) {
    return Promise.reject(new Error(`Unknown dataset key: "${datasetKey}".`));
  }

  if (!forceRefresh && inFlightCache.has(normalizedKey)) {
    return inFlightCache.get(normalizedKey);
  }

  if (!forceRefresh && normalizedKey === "speciesIndex") {
    const cached = readCachedSpeciesIndex();
    if (cached) {
      const resolved = Promise.resolve(cached);
      inFlightCache.set(normalizedKey, resolved);
      return resolved;
    }
  }

  const requestPromise = fetchJsonResource(resolveDatasetHref(relPath), relPath)
    .then((raw) => {
      const validated = validator(raw);
      if (normalizedKey === "speciesIndex") {
        writeCachedSpeciesIndex(validated);
      }
      return validated;
    })
    .catch((err) => {
      inFlightCache.delete(normalizedKey);
      throw err;
    });

  inFlightCache.set(normalizedKey, requestPromise);
  return requestPromise;
}

/**
 * On-demand monograph fetcher for ./data/species/<slug>.json.
 * Enforces lowercase kebab-case slugs for GitHub Pages case-sensitivity safety.
 */
export function fetchSpeciesMonograph(rawSlug, { forceRefresh = false } = {}) {
  const slug = normalizeSpeciesSlug(rawSlug);
  if (!slug || !isValidSpeciesSlug(slug)) {
    return Promise.reject(new Error(`Invalid species slug: "${rawSlug}".`));
  }

  const cacheKey = `species:${slug}`;
  if (!forceRefresh && inFlightCache.has(cacheKey)) {
    return inFlightCache.get(cacheKey);
  }

  const relPath = `./data/species/${slug}.json`;
  const requestPromise = fetchJsonResource(resolveDatasetHref(relPath), relPath)
    .then((raw) => validateSpeciesMonographPayload(raw))
    .catch((err) => {
      inFlightCache.delete(cacheKey);
      throw err;
    });

  inFlightCache.set(cacheKey, requestPromise);
  return requestPromise;
}

export async function fetchDatasetsConcurrently(
  datasetKeys,
  { forceRefresh = false } = {},
) {
  const uniqueKeys = Array.from(new Set(datasetKeys)).filter(Boolean);
  const settled = await Promise.allSettled(
    uniqueKeys.map((key) => {
      if (key.startsWith("species:")) {
        const slug = key.slice("species:".length);
        return fetchSpeciesMonograph(slug, { forceRefresh }).then((data) => ({
          key,
          data,
        }));
      }
      return fetchDataset(key, { forceRefresh }).then((data) => ({
        key,
        data,
      }));
    }),
  );

  const map = new Map();
  settled.forEach((outcome, idx) => {
    const key = uniqueKeys[idx];
    if (outcome.status === "fulfilled") {
      map.set(key, { ok: true, data: outcome.value.data, error: null });
    } else {
      map.set(key, {
        ok: false,
        data: null,
        error: outcome.reason || new Error(`Failed to load dataset "${key}".`),
      });
    }
  });
  return map;
}

export function clearDatasetCache(datasetKey) {
  if (datasetKey) {
    inFlightCache.delete(datasetKey);
  } else {
    inFlightCache.clear();
  }
}
