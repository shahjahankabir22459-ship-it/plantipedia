#!/usr/bin/env node
/**
 * Plantipedia Catalog Integrity & Sitemap Generator
 * Validates ./data/catalog/species-index.json against ./data/species/*.json
 * and regenerates ./sitemap.xml for GitHub Pages search indexing.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SITE_BASE = "https://rayaantasnim.github.io/plantipedia";

const INDEX_PATH = path.join(ROOT_DIR, "data", "catalog", "species-index.json");
const SPECIES_DIR = path.join(ROOT_DIR, "data", "species");
const SITEMAP_PATH = path.join(ROOT_DIR, "sitemap.xml");

const STATIC_ROUTES = [
  { loc: `${SITE_BASE}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE_BASE}/species/`, changefreq: "weekly", priority: "0.9" },
  { loc: `${SITE_BASE}/taxonomy/`, changefreq: "weekly", priority: "0.9" },
  { loc: `${SITE_BASE}/seasons/`, changefreq: "weekly", priority: "0.9" },
  { loc: `${SITE_BASE}/compare/`, changefreq: "monthly", priority: "0.8" },
];

function main() {
  const indexRaw = fs.readFileSync(INDEX_PATH, "utf8");
  const indexJson = JSON.parse(indexRaw);
  const speciesList = Array.isArray(indexJson.species) ? indexJson.species : [];

  const missingMonographs = [];
  for (const sp of speciesList) {
    const file = path.join(SPECIES_DIR, `${sp.slug}.json`);
    if (!fs.existsSync(file)) {
      missingMonographs.push(sp.slug);
    }
  }

  if (missingMonographs.length > 0) {
    console.error("Missing monograph files:", missingMonographs.join(", "));
    process.exit(1);
  }

  const urls = [
    ...STATIC_ROUTES,
    ...speciesList.map((sp) => ({
      loc: `${SITE_BASE}/plant/?species=${encodeURIComponent(sp.slug)}`,
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    ),
    "</urlset>",
    "",
  ];

  fs.writeFileSync(SITEMAP_PATH, xmlLines.join("\n"), "utf8");
  console.log(
    `Generated sitemap.xml with ${urls.length} URLs (${speciesList.length} species).`,
  );
}

main();
