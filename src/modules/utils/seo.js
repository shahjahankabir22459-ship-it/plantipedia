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
  let ldScript =
    document.getElementById(id) ||
    document.getElementById("page-jsonld") ||
    document.head.querySelector('script[type="application/ld+json"]');
  if (!ldScript) {
    ldScript = document.createElement("script");
    ldScript.type = "application/ld+json";
    document.head.appendChild(ldScript);
  }
  ldScript.id = id;
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
    typeof seoConfig.canonicalFile === "string"
      ? seoConfig.canonicalFile
      : "";
  const canonicalUrl = resolveCanonicalPageUrl(canonicalRoute);
  setCanonicalHref(canonicalUrl);

  const ogImage = seoConfig.ogImage || DEFAULT_OG_IMAGE;
  const ogImageAlt =
    seoConfig.ogImageAlt || "Plantipedia — Digital Botanical Encyclopedia";

  setMetaTag("name", "description", seoConfig.description);
  setMetaTag("name", "keywords", seoConfig.keywords);
  setMetaTag("name", "author", seoConfig.author || "Jalees Habib, Rayaan Tasnim");
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
                  { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
                ],
              },
            ],
          }
        : seoConfig.jsonLd;
    setJsonLdScript("page-jsonld", enriched);
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
        name: "Plantipedia 50-Species Botanical Index",
        description:
          "Structured taxonomic, phenological, and ecological metadata across 50 curated plant species monographs.",
        url: speciesUrl,
        creator: AUTHOR_ENTITIES,
        distribution: {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${getCanonicalSiteBase()}data/index/species-index.json`,
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

  setJsonLdScript("page-jsonld", schemaData);
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
    : baseSeo.title || "Taxonomic Lineage Explorer — Botanical Families | Plantipedia";
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

  setJsonLdScript("page-jsonld", {
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
      "Explore Bengal's six botanical seasons (Shororitu) and track flowering, fruiting, and ecological transitions across 50 species.";

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

  setJsonLdScript("page-jsonld", schemaData);
}

export function applyCompareSeo({ pageData, leftPlant, rightPlant }) {
  const baseSeo = pageData?.seo || {};
  const homeUrl = resolveCanonicalPageUrl("");
  const compareBaseUrl = resolveCanonicalPageUrl("compare/");
  const leftId = leftPlant?.slug || leftPlant?.query || "";
  const rightId = rightPlant?.slug || rightPlant?.query || "";
  const hasPair = Boolean(leftId && rightId);

  let query = "";
  if (hasPair) {
    const params = new URLSearchParams();
    if (leftPlant?.isGlobalLive || !leftPlant?.slug) {
      params.set("leftGlobal", leftId);
    } else {
      params.set("a", leftPlant.slug);
    }
    if (rightPlant?.isGlobalLive || !rightPlant?.slug) {
      params.set("rightGlobal", rightId);
    } else {
      params.set("b", rightPlant.slug);
    }
    query = `?${params.toString()}`;
  }
  const pageUrl = resolveCanonicalPageUrl("compare/", query);

  const leftName = leftPlant?.commonName || leftId;
  const rightName = rightPlant?.commonName || rightId;
  const title = hasPair
    ? `${leftName} vs. ${rightName} — Compare | Plantipedia`
    : baseSeo.title ||
      "Compare Split View — Side-by-Side Botanical Monographs | Plantipedia";
  const description = hasPair
    ? `Side-by-side botanical comparison of ${leftName}${leftPlant?.scientificName ? ` (${leftPlant.scientificName})` : ""} and ${rightName}${rightPlant?.scientificName ? ` (${rightPlant.scientificName})` : ""} across taxonomy, morphology, ecology, and cultivation.`
    : baseSeo.description ||
      "Compare any two botanical species side-by-side in an edge-to-edge dual-pane split workspace.";

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
      name: `${leftName} vs. ${rightName}`,
      item: pageUrl,
    });
  }

  const graph = [
    {
      "@type": "WebApplication",
      "@id": `${pageUrl}#webapp`,
      name: hasPair
        ? `Plantipedia Split Comparator: ${leftName} vs. ${rightName}`
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
      name: `${leftName} vs. ${rightName}`,
      numberOfItems: 2,
      itemListElement: [leftPlant, rightPlant].map((sp, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: sp?.isGlobalLive || !sp?.slug
          ? resolveCanonicalPageUrl("plant/live/", `?q=${encodeURIComponent(sp?.query || sp?.commonName || "")}`)
          : resolveCanonicalPageUrl("plant/", `?species=${encodeURIComponent(sp.slug)}`),
        item: {
          "@type": "Taxon",
          name: sp?.scientificName || sp?.commonName || "",
          alternateName: sp?.commonName || "",
          taxonRank: "Species",
        },
      })),
    });
  }

  setJsonLdScript("page-jsonld", {
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

export function applyPlantMonographSeo(plant) {
  if (!plant || typeof plant !== "object") return;

  const isGlobal = Boolean(plant.isGlobalLive);
  const category = plant.category || "Global Flora";
  const bengaliName = plant.commonNameBn || plant.localName || "";
  const homeUrl = resolveCanonicalPageUrl("");
  const directoryUrl = resolveCanonicalPageUrl("species/");
  const categoryUrl = resolveCanonicalPageUrl(
    "species/",
    `?category=${encodeURIComponent(category)}`,
  );
  const pageUrl = isGlobal
    ? resolveCanonicalPageUrl("plant/live/", `?q=${encodeURIComponent(plant.query || plant.commonName || "")}`)
    : resolveCanonicalPageUrl("plant/", `?species=${encodeURIComponent(plant.slug || "")}`);

  const displayName = bengaliName
    ? `${plant.commonName} · ${bengaliName}`
    : plant.commonName;
  const seoTitle = isGlobal
    ? `${displayName} (${plant.scientificName}) — Global Flora Index | Plantipedia`
    : `${displayName} (${plant.scientificName}) | Plantipedia`;

  const ov = plant.overview || {};
  const familySuffix = ov.family ? ` Family: ${ov.family}.` : "";
  const baseSummary = plant.shortSummary || plant.leadOverview || "";
  const seoDesc =
    baseSummary && !baseSummary.includes(plant.scientificName || "")
      ? `${displayName} (${plant.scientificName}).${familySuffix} ${baseSummary}`
      : baseSummary || `${displayName} (${plant.scientificName}).${familySuffix}`;

  const rawHeroUrl = plant.heroImage?.url || DEFAULT_OG_IMAGE;
  const heroImgUrl =
    /^https?:/i.test(rawHeroUrl) ? rawHeroUrl : DEFAULT_OG_IMAGE;
  const heroImgAlt = plant.heroImage?.alt || displayName;

  document.title = seoTitle;
  setCanonicalHref(pageUrl);

  setMetaTag("name", "description", seoDesc);
  setMetaTag("name", "author", "Jalees Habib, Rayaan Tasnim");
  setMetaTag("name", "robots", "index, follow");
  setMetaTag(
    "name",
    "keywords",
    [
      plant.commonName,
      bengaliName,
      plant.scientificName,
      ov.family,
      ov.genus,
      category,
      "Plantipedia",
      isGlobal ? "Global Botanical Server" : "botanical monograph",
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

  const alternateNames = Array.from(
    new Set(
      [plant.schemaOrg?.alternateName, plant.commonName, bengaliName].filter(
        Boolean,
      ),
    ),
  );

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["ScholarlyArticle", "Article"],
        "@id": `${pageUrl}#article`,
        headline: seoTitle,
        name: displayName,
        description: seoDesc,
        image: heroImgUrl,
        url: pageUrl,
        inLanguage: bengaliName ? ["en", "bn"] : "en",
        mainEntityOfPage: pageUrl,
        author: AUTHOR_ENTITIES,
        publisher: getPublisherOrg(homeUrl),
        about: { "@id": `${pageUrl}#taxon` },
      },
      {
        "@type": "Taxon",
        "@id": `${pageUrl}#taxon`,
        name: plant.schemaOrg?.name || plant.scientificName || plant.commonName,
        alternateName: alternateNames.length > 1 ? alternateNames : alternateNames[0] || plant.commonName,
        taxonRank: plant.schemaOrg?.taxonRank || "Species",
        description: plant.leadOverview || seoDesc,
        image: heroImgUrl,
        url: pageUrl,
        parentTaxon: plant.schemaOrg?.parentTaxon || {
          "@type": "Taxon",
          name: ov.genus || (plant.scientificName || "").split(" ")[0] || "",
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
            name: isGlobal ? "Global Flora Index" : "Available Species",
            item: isGlobal ? resolveCanonicalPageUrl("plant/live/") : directoryUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: category,
            item: categoryUrl,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: displayName,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  setJsonLdScript("page-jsonld", schemaData);
}

export function applyNotFoundSeo({ requestedSlug = "", reason = "", query = "" } = {}) {
  const qLabel = query || requestedSlug;
  let title = "Specimen Not Found in Archive | Plantipedia";
  let description = qLabel
    ? `No herbarium record matched "${qLabel}". Search all 50 documented botanical monographs in Plantipedia.`
    : "The requested botanical monograph or archive route does not exist in Plantipedia.";

  if (reason === "invalid") {
    title = "Unrecognized Botanical Specimen | Plantipedia";
    description = qLabel
      ? `"${qLabel}" is not a real plant species or recognized botanical taxon in the Global Botanical Server.`
      : "The submitted query is not a recognized botanical taxon in the Global Botanical Server.";
  } else if (reason === "network") {
    title = "Network Connection Failed — Global Botanical Server | Plantipedia";
    description = qLabel
      ? `Unable to reach the Global Botanical Server after multiple attempts while searching for "${qLabel}".`
      : "Unable to reach the Global Botanical Server. Check your internet connection and try again.";
  }

  document.title = title;
  setMetaTag("name", "description", description);
  setMetaTag("name", "robots", "noindex, follow");
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
}
