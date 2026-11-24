/**
 * Dynamic Document Head & Structured Schema.org JSON-LD Hydration Engine
 * Updates title, meta tags, canonical URL, OpenGraph, Twitter Cards, and Schema.org JSON-LD
 * across all Clean-URL folder routes (/, /species/, /plant/, /taxonomy/, /seasons/, /compare/, & 404).
 */

const PRODUCTION_SITE_URL = "https://rayaantasnim.github.io/plantipedia/";
const DEFAULT_OG_IMAGE =
  "https://images.pexels.com/photos/31591013/pexels-photo-31591013/free-photo-of-lush-monstera-leaves-in-colombian-jungle.jpeg?auto=compress&cs=tinysrgb&w=1200";

const AUTHOR_ENTITIES = [
  { "@type": "Person", name: "Jalees Habib" },
  { "@type": "Person", name: "Rayaan Tasnim" },
];

export function getCanonicalSiteBase() {
  try {
    const { hostname, origin, pathname } = window.location;
    if (hostname.endsWith("github.io")) {
      const parts = pathname.split("/").filter(Boolean);
      const repoSegment = parts.length > 0 ? `${parts[0]}/` : "";
      return `${origin}/${repoSegment}`;
    }
  } catch {
    // Fallback to production canonical URL
  }
  return PRODUCTION_SITE_URL;
}

function resolveCanonicalPageUrl(routePath = "", queryString = "") {
  const base = getCanonicalSiteBase();
  const cleanRoute = String(routePath || "")
    .replace(/^\.?\//, "")
    .replace(/^index\.html$/i, "")
    .replace(/\.html$/i, "/");
  return `${base}${cleanRoute}${queryString}`;
}

function setMetaTag(attrName, attrValue, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonicalHref(href) {
  if (!href) return;
  let canonicalEl = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute("href", href);
}

function setJsonLdScript(id, schemaData) {
  if (!schemaData) return;
  let ldScript = document.getElementById(id);
  if (!ldScript) {
    ldScript = document.createElement("script");
    ldScript.type = "application/ld+json";
    ldScript.id = id;
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(schemaData, null, 2);
}

function getPublisherOrg(homeUrl) {
  return {
    "@type": "EducationalOrganization",
    "@id": `${homeUrl}#organization`,
    name: "Plantipedia",
    url: homeUrl,
    founder: AUTHOR_ENTITIES,
  };
}

export function applyPageSeo(seoConfig) {
  if (!seoConfig || typeof seoConfig !== "object") return;

  if (seoConfig.title) {
    document.title = seoConfig.title;
  }

  const canonicalRoute =
    typeof seoConfig.canonicalFile === "string" ? seoConfig.canonicalFile : "";
  const canonicalUrl = resolveCanonicalPageUrl(canonicalRoute);
  setCanonicalHref(canonicalUrl);

  const ogImage = seoConfig.ogImage || DEFAULT_OG_IMAGE;
  const ogImageAlt =
    seoConfig.ogImageAlt || "Plantipedia — Digital Botanical Encyclopedia";

  setMetaTag("name", "description", seoConfig.description);
  setMetaTag("name", "keywords", seoConfig.keywords);
  setMetaTag(
    "name",
    "author",
    seoConfig.author || "Jalees Habib, Rayaan Tasnim",
  );
  setMetaTag("name", "robots", seoConfig.robots || "index, follow");
  setMetaTag("property", "og:type", seoConfig.ogType || "website");
  setMetaTag("property", "og:site_name", "Plantipedia");
  setMetaTag("property", "og:title", seoConfig.ogTitle || seoConfig.title);
  setMetaTag(
    "property",
    "og:description",
    seoConfig.ogDescription || seoConfig.description,
  );
  setMetaTag("property", "og:url", canonicalUrl);
  setMetaTag("property", "og:image", ogImage);
  setMetaTag("property", "og:image:alt", ogImageAlt);

  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", seoConfig.ogTitle || seoConfig.title);
  setMetaTag(
    "name",
    "twitter:description",
    seoConfig.ogDescription || seoConfig.description,
  );
  setMetaTag("name", "twitter:image", ogImage);
  setMetaTag("name", "twitter:image:alt", ogImageAlt);

  if (seoConfig.jsonLd) {
    const homeUrl = resolveCanonicalPageUrl("");
    const isHome = canonicalRoute === "" || canonicalRoute === "index.html";
    const enriched =
      isHome && Array.isArray(seoConfig.jsonLd["@graph"])
        ? {
            "@context": "https://schema.org",
            "@graph": [
              ...seoConfig.jsonLd["@graph"],
              {
                "@type": "Dataset",
                "@id": `${homeUrl}#dataset`,
                name: "Plantipedia Curated Botanical Species Archive",
                description: seoConfig.description,
                url: homeUrl,
                license: "https://creativecommons.org/licenses/by-nc/4.0/",
                creator: AUTHOR_ENTITIES,
              },
              {
                "@type": "BreadcrumbList",
                "@id": `${homeUrl}#breadcrumb`,
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: homeUrl,
                  },
                ],
              },
            ],
          }
        : seoConfig.jsonLd;
    setJsonLdScript("dynamic-page-jsonld", enriched);
  }
}

export function applySpeciesDirectorySeo({ pageData, speciesList }) {
  const seo = pageData?.seo || {};
  applyPageSeo(seo);

  const homeUrl = resolveCanonicalPageUrl("");
  const speciesUrl = resolveCanonicalPageUrl("species/");
  const list = Array.isArray(speciesList) ? speciesList : [];

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${speciesUrl}#collection`,
        name: seo.title || "Available Species Directory | Plantipedia",
        description: seo.description || "",
        url: speciesUrl,
        isPartOf: { "@id": `${homeUrl}#website` },
        publisher: getPublisherOrg(homeUrl),
        author: AUTHOR_ENTITIES,
        mainEntity: { "@id": `${speciesUrl}#itemlist` },
      },
      {
        "@type": "Dataset",
        "@id": `${speciesUrl}#dataset`,
        name: "Plantipedia 20-Species Botanical Index",
        description:
          "Structured taxonomic, phenological, and ecological metadata across 20 curated plant species monographs.",
        url: speciesUrl,
        creator: AUTHOR_ENTITIES,
        distribution: {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${getCanonicalSiteBase()}data/catalog/species-index.json`,
        },
      },
      {
        "@type": "ItemList",
        "@id": `${speciesUrl}#itemlist`,
        name: "Documented Plant Species Atlas",
        numberOfItems: list.length,
        itemListElement: list.map((sp, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: resolveCanonicalPageUrl(
            "plant/",
            `?species=${encodeURIComponent(sp.slug)}`,
          ),
          item: {
            "@type": "Taxon",
            name: sp.scientificName,
            alternateName: sp.commonNameBn
              ? `${sp.commonName} (${sp.commonNameBn})`
              : sp.commonName,
            taxonRank: "Species",
            url: resolveCanonicalPageUrl(
              "plant/",
              `?species=${encodeURIComponent(sp.slug)}`,
            ),
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${speciesUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Available Species",
            item: speciesUrl,
          },
        ],
      },
    ],
  };

  setJsonLdScript("dynamic-page-jsonld", schemaData);
}

export function applyTaxonomySeo({ pageData, families, activeFamily }) {
  const baseSeo = pageData?.seo || {};
  const homeUrl = resolveCanonicalPageUrl("");
  const taxonomyBaseUrl = resolveCanonicalPageUrl("taxonomy/");
  const familyList = Array.isArray(families) ? families : [];

  const query = activeFamily
    ? `?family=${encodeURIComponent(activeFamily.name)}`
    : "";
  const pageUrl = resolveCanonicalPageUrl("taxonomy/", query);

  const title = activeFamily
    ? `${activeFamily.name} Family Lineage & Species | Plantipedia`
    : baseSeo.title ||
      "Taxonomic Lineage Explorer — Botanical Families | Plantipedia";
  const description = activeFamily
    ? `${activeFamily.description} Explore ${activeFamily.species.length} documented species in ${activeFamily.name} (${activeFamily.order}).`
    : baseSeo.description ||
      "Browse documented botanical families, diagnostic traits, and member plant monographs on Plantipedia.";

  document.title = title;
  setCanonicalHref(pageUrl);
  setMetaTag("name", "description", description);
  setMetaTag("name", "robots", "index, follow");
  setMetaTag("property", "og:type", "website");
  setMetaTag("property", "og:site_name", "Plantipedia");
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:url", pageUrl);
  setMetaTag("property", "og:image", baseSeo.ogImage || DEFAULT_OG_IMAGE);
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
  setMetaTag("name", "twitter:image", baseSeo.ogImage || DEFAULT_OG_IMAGE);

  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Taxonomic Lineage",
      item: taxonomyBaseUrl,
    },
  ];
  if (activeFamily) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: activeFamily.name,
      item: pageUrl,
    });
  }

  const graph = [
    {
      "@type": "CollectionPage",
      "@id": `${pageUrl}#collection`,
      name: title,
      description,
      url: pageUrl,
      publisher: getPublisherOrg(homeUrl),
      author: AUTHOR_ENTITIES,
      mainEntity: { "@id": `${pageUrl}#itemlist` },
    },
    {
      "@type": "Dataset",
      "@id": `${pageUrl}#dataset`,
      name: activeFamily
        ? `${activeFamily.name} Botanical Family Dataset`
        : "Plantipedia Angiosperm & Vascular Family Registry",
      description,
      url: pageUrl,
      creator: AUTHOR_ENTITIES,
    },
    activeFamily
      ? {
          "@type": "ItemList",
          "@id": `${pageUrl}#itemlist`,
          name: `Documented Species in ${activeFamily.name}`,
          numberOfItems: activeFamily.species.length,
          itemListElement: activeFamily.species.map((sp, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: resolveCanonicalPageUrl(
              "plant/",
              `?species=${encodeURIComponent(sp.slug)}`,
            ),
            item: {
              "@type": "Taxon",
              name: sp.scientificName,
              alternateName: sp.commonName,
              taxonRank: "Species",
            },
          })),
        }
      : {
          "@type": "ItemList",
          "@id": `${pageUrl}#itemlist`,
          name: "Documented Botanical Families",
          numberOfItems: familyList.length,
          itemListElement: familyList.map((fam, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: resolveCanonicalPageUrl(
              "taxonomy/",
              `?family=${encodeURIComponent(fam.name)}`,
            ),
            item: {
              "@type": "Taxon",
              name: fam.name,
              alternateName: fam.familyBn || fam.name,
              taxonRank: "Family",
            },
          })),
        },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: breadcrumbItems,
    },
  ];

  if (activeFamily) {
    graph.push({
      "@type": "Taxon",
      "@id": `${pageUrl}#family-taxon`,
      name: activeFamily.name,
      alternateName: activeFamily.familyBn || activeFamily.name,
      taxonRank: "Family",
      description: activeFamily.description,
      url: pageUrl,
    });
  }

  setJsonLdScript("dynamic-page-jsonld", {
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

export function applySeasonsSeo({
  pageData,
  seasons,
  focusedSeason,
  activeSpecies,
}) {
  const baseSeo = pageData?.seo || {};
  const homeUrl = resolveCanonicalPageUrl("");
  const seasonsBaseUrl = resolveCanonicalPageUrl("seasons/");
  const seasonList = Array.isArray(seasons) ? seasons : [];
  const floraList = Array.isArray(activeSpecies) ? activeSpecies : [];

  const query = focusedSeason
    ? `?season=${encodeURIComponent(focusedSeason.id)}`
    : "";
  const pageUrl = resolveCanonicalPageUrl("seasons/", query);

  const title = focusedSeason
    ? `${focusedSeason.nameEn} (${focusedSeason.nameBn}) Flora Phenology | Plantipedia`
    : baseSeo.title ||
      "Bangladeshi 6-Season Botanical Calendar (ষড়ঋতু) | Plantipedia";
  const description = focusedSeason
    ? `${focusedSeason.climateSummary} Discover ${floraList.length} active flora species during ${focusedSeason.nameEn} (${focusedSeason.bengaliMonths}).`
    : baseSeo.description ||
      "Explore Bengal's six botanical seasons (Shororitu) and track flowering, fruiting, and ecological transitions across 20 species.";

  document.title = title;
  setCanonicalHref(pageUrl);
  setMetaTag("name", "description", description);
  setMetaTag("name", "robots", "index, follow");
  setMetaTag("property", "og:type", "website");
  setMetaTag("property", "og:site_name", "Plantipedia");
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:url", pageUrl);
  setMetaTag("property", "og:image", baseSeo.ogImage || DEFAULT_OG_IMAGE);
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
  setMetaTag("name", "twitter:image", baseSeo.ogImage || DEFAULT_OG_IMAGE);

  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "6-Season Calendar",
      item: seasonsBaseUrl,
    },
  ];
  if (focusedSeason) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: `${focusedSeason.nameEn} (${focusedSeason.nameBn})`,
      item: pageUrl,
    });
  }

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collection`,
        name: title,
        description,
        url: pageUrl,
        publisher: getPublisherOrg(homeUrl),
        author: AUTHOR_ENTITIES,
        mainEntity: { "@id": `${pageUrl}#itemlist` },
      },
      {
        "@type": "Dataset",
        "@id": `${pageUrl}#dataset`,
        name: focusedSeason
          ? `${focusedSeason.nameEn} (${focusedSeason.nameBn}) Ecological Phenology Dataset`
          : "Bangladeshi Shororitu 6-Season Botanical Phenology Dataset",
        description,
        url: pageUrl,
        temporalCoverage: focusedSeason
          ? focusedSeason.gregorianRange
          : "Annual 6-Season Cycle",
        spatialCoverage: {
          "@type": "Place",
          name: "Bengal Delta & South Asia",
        },
        creator: AUTHOR_ENTITIES,
      },
      focusedSeason
        ? {
            "@type": "ItemList",
            "@id": `${pageUrl}#itemlist`,
            name: `Flora Active in ${focusedSeason.nameEn}`,
            numberOfItems: floraList.length,
            itemListElement: floraList.map((sp, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              url: resolveCanonicalPageUrl(
                "plant/",
                `?species=${encodeURIComponent(sp.slug)}`,
              ),
              item: {
                "@type": "Taxon",
                name: sp.scientificName,
                alternateName: sp.commonName,
                taxonRank: "Species",
              },
            })),
          }
        : {
            "@type": "ItemList",
            "@id": `${pageUrl}#itemlist`,
            name: "Six Bangladeshi Botanical Seasons (Shororitu)",
            numberOfItems: seasonList.length,
            itemListElement: seasonList.map((s, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: `${s.nameEn} (${s.nameBn}) — ${s.bengaliMonths}`,
              url: resolveCanonicalPageUrl(
                "seasons/",
                `?season=${encodeURIComponent(s.id)}`,
              ),
            })),
          },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
    ],
  };

  setJsonLdScript("dynamic-page-jsonld", schemaData);
}

export function applyCompareSeo({ pageData, leftPlant, rightPlant }) {
  const baseSeo = pageData?.seo || {};
  const homeUrl = resolveCanonicalPageUrl("");
  const compareBaseUrl = resolveCanonicalPageUrl("compare/");
  const hasPair = Boolean(leftPlant?.slug && rightPlant?.slug);

  const query = hasPair
    ? `?a=${encodeURIComponent(leftPlant.slug)}&b=${encodeURIComponent(rightPlant.slug)}`
    : "";
  const pageUrl = resolveCanonicalPageUrl("compare/", query);

  const title = hasPair
    ? `${leftPlant.commonName} vs. ${rightPlant.commonName} — Compare | Plantipedia`
    : baseSeo.title ||
      "Compare Split View — Side-by-Side Botanical Monographs | Plantipedia";
  const description = hasPair
    ? `Side-by-side botanical comparison of ${leftPlant.commonName} (${leftPlant.scientificName}) and ${rightPlant.commonName} (${rightPlant.scientificName}) across taxonomy, morphology, ecology, and cultivation.`
    : baseSeo.description ||
      "Compare any two curated botanical species side-by-side in an edge-to-edge dual-pane split workspace.";

  document.title = title;
  setCanonicalHref(pageUrl);
  setMetaTag("name", "description", description);
  setMetaTag("name", "robots", "index, follow");
  setMetaTag("property", "og:type", "website");
  setMetaTag("property", "og:site_name", "Plantipedia");
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:url", pageUrl);
  setMetaTag("property", "og:image", baseSeo.ogImage || DEFAULT_OG_IMAGE);
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
  setMetaTag("name", "twitter:image", baseSeo.ogImage || DEFAULT_OG_IMAGE);

  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Compare Split View",
      item: compareBaseUrl,
    },
  ];
  if (hasPair) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: `${leftPlant.commonName} vs. ${rightPlant.commonName}`,
      item: pageUrl,
    });
  }

  const graph = [
    {
      "@type": "WebApplication",
      "@id": `${pageUrl}#webapp`,
      name: hasPair
        ? `Plantipedia Split Comparator: ${leftPlant.commonName} vs. ${rightPlant.commonName}`
        : "Plantipedia Botanical Split-Screen Comparator",
      applicationCategory: "EducationalApplication",
      operatingSystem: "All",
      browserRequirements: "Requires modern ES6+ web browser",
      description,
      url: pageUrl,
      publisher: getPublisherOrg(homeUrl),
      author: AUTHOR_ENTITIES,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: breadcrumbItems,
    },
  ];

  if (hasPair) {
    graph.push({
      "@type": "ItemList",
      "@id": `${pageUrl}#compared-specimens`,
      name: `${leftPlant.commonName} vs. ${rightPlant.commonName}`,
      numberOfItems: 2,
      itemListElement: [leftPlant, rightPlant].map((sp, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: resolveCanonicalPageUrl(
          "plant/",
          `?species=${encodeURIComponent(sp.slug)}`,
        ),
        item: {
          "@type": "Taxon",
          name: sp.scientificName,
          alternateName: sp.commonName,
          taxonRank: "Species",
        },
      })),
    });
  }

  setJsonLdScript("dynamic-page-jsonld", {
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

export function applyPlantMonographSeo(plant) {
  if (!plant || typeof plant !== "object") return;

  const homeUrl = resolveCanonicalPageUrl("");
  const directoryUrl = resolveCanonicalPageUrl("species/");
  const categoryUrl = resolveCanonicalPageUrl(
    "species/",
    `?category=${encodeURIComponent(plant.category)}`,
  );
  const pageUrl = resolveCanonicalPageUrl(
    "plant/",
    `?species=${encodeURIComponent(plant.slug)}`,
  );

  const seoTitle = `${plant.commonName} (${plant.scientificName}) | Plantipedia`;
  const seoDesc = plant.shortSummary;
  const heroImgUrl = plant.heroImage?.url || DEFAULT_OG_IMAGE;
  const heroImgAlt = plant.heroImage?.alt || plant.commonName;
  const ov = plant.overview || {};

  document.title = seoTitle;
  setCanonicalHref(pageUrl);

  setMetaTag("name", "description", seoDesc);
  setMetaTag("name", "robots", "index, follow");
  setMetaTag(
    "name",
    "keywords",
    [
      plant.commonName,
      plant.scientificName,
      ov.family,
      ov.genus,
      plant.category,
      "Plantipedia",
      "botanical monograph",
    ]
      .filter(Boolean)
      .join(", "),
  );

  setMetaTag("property", "og:type", "article");
  setMetaTag("property", "og:site_name", "Plantipedia");
  setMetaTag("property", "og:title", seoTitle);
  setMetaTag("property", "og:description", seoDesc);
  setMetaTag("property", "og:url", pageUrl);
  setMetaTag("property", "og:image", heroImgUrl);
  setMetaTag("property", "og:image:alt", heroImgAlt);

  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", seoTitle);
  setMetaTag("name", "twitter:description", seoDesc);
  setMetaTag("name", "twitter:image", heroImgUrl);
  setMetaTag("name", "twitter:image:alt", heroImgAlt);

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: seoTitle,
        description: seoDesc,
        image: heroImgUrl,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        author: AUTHOR_ENTITIES,
        publisher: getPublisherOrg(homeUrl),
        about: { "@id": `${pageUrl}#taxon` },
      },
      {
        "@type": "Taxon",
        "@id": `${pageUrl}#taxon`,
        name: plant.schemaOrg?.name || plant.scientificName,
        alternateName: plant.schemaOrg?.alternateName || plant.commonName,
        taxonRank: plant.schemaOrg?.taxonRank || "Species",
        description: plant.leadOverview || seoDesc,
        image: heroImgUrl,
        url: pageUrl,
        parentTaxon: plant.schemaOrg?.parentTaxon || {
          "@type": "Taxon",
          name: ov.genus || plant.scientificName.split(" ")[0],
          taxonRank: "Genus",
          parentTaxon: {
            "@type": "Taxon",
            name: ov.family || "",
            taxonRank: "Family",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Available Species",
            item: directoryUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: plant.category,
            item: categoryUrl,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: plant.commonName,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  setJsonLdScript("dynamic-plant-jsonld", schemaData);
}

export function applyNotFoundSeo({ requestedSlug = "" } = {}) {
  const title = "Specimen Not Found in Archive | Plantipedia";
  const description = requestedSlug
    ? `No herbarium record matched "${requestedSlug}". Search all 20 documented botanical monographs in Plantipedia.`
    : "The requested botanical monograph or archive route does not exist in Plantipedia.";

  document.title = title;
  setMetaTag("name", "description", description);
  setMetaTag("name", "robots", "noindex, follow");
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
}
