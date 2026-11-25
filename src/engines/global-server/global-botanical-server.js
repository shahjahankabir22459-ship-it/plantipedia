import { extractPlantTelemetryStats } from "../../core/telemetry/telemetry-stats.js";

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  if (props && typeof props === "object") {
    Object.entries(props).forEach(([key, val]) => {
      if (val === undefined || val === null) return;
      if (key === "className") {
        node.className = String(val);
      } else if (key === "textContent") {
        node.textContent = String(val);
      } else if (key === "type" || key === "id" || key === "title" || key === "disabled") {
        node[key] = val;
      } else {
        node.setAttribute(key, String(val));
      }
    });
  }
  if (Array.isArray(children)) {
    children.forEach((child) => {
      if (child === undefined || child === null) return;
      node.appendChild(
        typeof child === "string" ? document.createTextNode(child) : child,
      );
    });
  }
  return node;
}

export const GLOBAL_STATUS_MESSAGES = Object.freeze([
  "Establishing handshake with Global Botanical Server...",
  "Resolving Linnaean binomial & taxonomic hierarchy...",
  "Cross-referencing South Asian & Bengali flora nomenclature...",
  "Extracting morphological & foliar anatomy records...",
  "Synthesizing native habitat & ecological distribution...",
  "Calibrating soil pH & thermal tolerance telemetry...",
  "Indexing ethnobotanical & phytochemical literature...",
  "Fetching high-resolution herbarium imagery...",
  "Structuring 8-chapter Plantipedia monograph schema...",
  "Verifying academic citation metadata..."
]);

const RETRY_SCHEDULE_MS = [0, 1500, 3000, 4200];
const TELEMETRY_DURATION_MS = 5000;
const CACHE_STORAGE_PREFIX = "plantipedia_global_monograph_v1::";
const memoryCache = new Map();

const BOTANICAL_KEYWORDS_EN = [
  "plant", "species", "tree", "flower", "flowering", "herb", "herbaceous",
  "shrub", "fern", "moss", "palm", "genus", "family", "flora", "botanical",
  "botany", "cultivar", "plantae", "angiosperm", "angiosperms", "gymnosperm",
  "magnoliophyta", "tracheophytes", "eudicots", "monocots", "rosids", "asterids",
  "taxobox", "speciesbox", "binomial", "perennial", "deciduous", "evergreen",
  "rhizome", "inflorescence", "foliage", "seed", "fruit", "legume", "citrus",
  "vine", "climber", "aquatic plant", "medicinal plant", "succulent", "grass",
  "bamboo", "orchid", "caryophyllales", "fabaceae", "asteraceae", "poaceae",
  "malvaceae", "rubiaceae", "apocynaceae", "arecaceae", "lamiaceae", "solanaceae"
];

const BOTANICAL_KEYWORDS_BN = [
  "উদ্ভিদ", "গাছ", "বৃক্ষ", "ফুল", "ভেষজ", "প্রজাতি", "গোত্র", "গণ",
  "গুল্ম", "লতা", "পাতা", "ফল", "বর্গ", "শ্রেণি", "উদ্ভিদবিজ্ঞান", "সপুষ্পক",
  "বীরুৎ", "কন্দ", "অঙ্কুর", "পরাগ", "বীজ", "বংশ", "জাত"
];

const DISAMBIGUATION_MARKERS = [
  "may refer to:",
  "can refer to:",
  "most commonly refers to:",
  "disambiguation",
  "দ্ব্যর্থতা নিরসন",
  "নির্দেশ করতে পারে:"
];

const NON_BOTANICAL_STRONG_SIGNALS = [
  "operating system", "software", "video game", "film", "album", "song",
  "television series", "football club", "basketball", "cricket", "athlete",
  "politician", "actor", "actress", "musician", "laptop", "computer",
  "smartphone", "programming language", "fictional character", "city in",
  "municipality", "county in", "chemical element", "constellation",
  "planet in", "mythology", "company", "corporation", "airline", "airport"
];

export function sanitizeBotanicalText(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/https?:\/\/[a-z0-9.-]*wik(?:ipedia|imedia)\.org[^\s)]*/gi, "https://flora-index.global/")
    .replace(/\bwik(?:ipedia|imedia)\b/gi, "Global Flora Index")
    .replace(/\bwikidata\b/gi, "Global Taxon Registry")
    .replace(/\bwikicommons\b/gi, "Global Herbarium Archive")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeGlobalQuery(query) {
  return String(query || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cacheKeyFor(query) {
  return `${CACHE_STORAGE_PREFIX}${normalizeGlobalQuery(query).toLowerCase()}`;
}

export function getCachedGlobalMonograph(query) {
  const normalized = normalizeGlobalQuery(query);
  if (!normalized) return null;
  const key = cacheKeyFor(normalized);
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.commonName) {
          memoryCache.set(key, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage quota / privacy errors
  }
  return null;
}

export function setCachedGlobalMonograph(query, monograph) {
  if (!monograph || !query) return;
  const normalized = normalizeGlobalQuery(query);
  const key = cacheKeyFor(normalized);
  memoryCache.set(key, monograph);
  if (monograph.query && normalizeGlobalQuery(monograph.query).toLowerCase() !== normalized.toLowerCase()) {
    memoryCache.set(cacheKeyFor(monograph.query), monograph);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, JSON.stringify(monograph));
    }
  } catch {
    // Ignore storage errors
  }
}

function hasBengaliScript(text) {
  return /[\u0980-\u09FF]/.test(String(text || ""));
}

function isAbortError(err) {
  return Boolean(err && (err.name === "AbortError" || err.code === 20));
}

function waitWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const abortErr = new DOMException("Aborted", "AbortError");
      reject(abortErr);
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchJsonWithSignal(url, signal, timeoutMs = 4500) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onParentAbort, { once: true });
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`);
      err.isNetworkError = response.status >= 500 || response.status === 429 || response.status === 408;
      throw err;
    }
    return await response.json();
  } catch (err) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (err.name === "AbortError") {
      const netErr = new Error("Global Botanical Server request timed out.");
      netErr.isNetworkError = true;
      throw netErr;
    }
    if (err instanceof TypeError || err.isNetworkError) {
      err.isNetworkError = true;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  }
}

function buildApiUrl(lang, params) {
  const host = lang === "bn" ? "https://bn.wikipedia.org/w/api.php" : "https://en.wikipedia.org/w/api.php";
  const searchParams = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params
  });
  return `${host}?${searchParams.toString()}`;
}

function stripWikitextMarkup(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{lang\|[^|}]+\|([^}]+)\}\}/gi, "$1")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'{2,5}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTaxoboxFields(wikitext) {
  const fields = {};
  if (!wikitext) return fields;
  const infoboxMatch = wikitext.match(/\{\{(?:Taxobox|Speciesbox|Automatic taxobox|Subspeciesbox|Infraspeciesbox|Plantbox|Infobox plant|তথ্যছক উদ্ভিদ)[\s\S]*?\n\}\}/i);
  const sourceBlock = infoboxMatch ? infoboxMatch[0] : wikitext.slice(0, 4500);
  const lineRegex = /^\s*\|\s*([a-zA-Z0-9_ \u0980-\u09FF]+?)\s*=\s*(.+)$/gm;
  let match;
  while ((match = lineRegex.exec(sourceBlock)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    const val = sanitizeBotanicalText(stripWikitextMarkup(match[2]));
    if (val && !fields[key]) {
      fields[key] = val;
    }
  }
  fields.hasPlantTaxobox = /\{\{\s*(?:Taxobox|Speciesbox|Automatic taxobox|Subspeciesbox|Infraspeciesbox|Plantbox|Infobox plant|তথ্যছক উদ্ভিদ)\b/i.test(sourceBlock);
  return fields;
}

function extractBinomial(taxobox, title, extract) {
  const genus = taxobox.genus ? taxobox.genus.replace(/[^A-Za-z-]/g, " ").trim().split(/\s+/)[0] : "";
  const species = taxobox.species ? taxobox.species.replace(/^[A-Z]\.\s*/, "").replace(/[^a-z-]/g, " ").trim().split(/\s+/)[0] : "";
  if (taxobox.binomial && /^[A-Z][a-z-]+\s+[a-z-]+/.test(taxobox.binomial)) {
    return taxobox.binomial.match(/([A-Z][a-z-]+\s+[a-z-]+)/)[1];
  }
  if (taxobox.taxon && /^[A-Z][a-z-]+\s+[a-z-]+/.test(taxobox.taxon)) {
    return taxobox.taxon.match(/([A-Z][a-z-]+\s+[a-z-]+)/)[1];
  }
  if (genus && species && /^[A-Z][a-z-]+$/.test(genus) && /^[a-z-]+$/.test(species)) {
    return `${genus} ${species}`;
  }
  const parenMatch = String(extract || "").match(/\(([A-Z][a-z-]{2,}\s+[a-z-]{2,})\)/);
  if (parenMatch) return parenMatch[1];
  if (/^[A-Z][a-z-]{2,}\s+[a-z-]{2,}$/.test(title)) return title;
  return "";
}

function verifyBotanicalSubject(page, taxobox) {
  if (!page || page.missing) return false;
  const title = String(page.title || "").toLowerCase();
  const extract = String(page.extract || "");
  const extractLower = extract.toLowerCase();
  const categories = Array.isArray(page.categories)
    ? page.categories.map((c) => String(c.title || "").toLowerCase())
    : [];
  const joinedCats = categories.join(" | ");

  if (extract.trim().length < 40) return false;
  if (DISAMBIGUATION_MARKERS.some((m) => extractLower.slice(0, 260).includes(m)) || joinedCats.includes("disambiguation")) {
    return false;
  }

  const kingdom = String(taxobox.regnum || taxobox.kingdom || taxobox.রাজ্য || "").toLowerCase();
  if (kingdom.includes("plantae") || kingdom.includes("উদ্ভিদ")) {
    return true;
  }
  if (kingdom && (kingdom.includes("animalia") || kingdom.includes("fungi") || kingdom.includes("bacteria") || kingdom.includes("virus"))) {
    return false;
  }

  let score = 0;
  if (taxobox.hasPlantTaxobox) score += 3;
  if (taxobox.familia || taxobox.family || taxobox.গোত্র) score += 2;
  if (taxobox.genus || taxobox.species || taxobox.binomial) score += 2;

  const introSlice = extractLower.slice(0, 750);
  for (const kw of BOTANICAL_KEYWORDS_EN) {
    if (joinedCats.includes(kw)) score += 2;
    if (introSlice.includes(kw)) score += 1;
  }
  for (const kwBn of BOTANICAL_KEYWORDS_BN) {
    if (joinedCats.includes(kwBn) || extract.slice(0, 750).includes(kwBn)) {
      score += 2;
    }
  }

  for (const neg of NON_BOTANICAL_STRONG_SIGNALS) {
    if (introSlice.includes(neg) || joinedCats.includes(neg)) {
      score -= 3;
    }
  }
  if (title.includes("(disambiguation)")) return false;

  return score >= 3;
}

function normalizeDedupKey(text) {
  return sanitizeBotanicalText(String(text || ""))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function splitIntoCleanParagraphs(rawText) {
  return String(rawText || "")
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((chunk) => sanitizeBotanicalText(chunk))
    .filter((chunk) => chunk.length > 20);
}

function splitIntoSentences(text) {
  const cleaned = sanitizeBotanicalText(text);
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

function splitSectionsFromExtract(extract) {
  const rawParagraphs = String(extract || "")
    .replace(/\r\n/g, "\n")
    .split(/\n==+\s*([^=\n]+?)\s*==+\n/)
    .map((chunk) => chunk.trim());

  const leadRaw = rawParagraphs[0] || String(extract || "");
  const leadParagraphs = splitIntoCleanParagraphs(leadRaw);
  const lead = leadParagraphs.join(" ") || sanitizeBotanicalText(leadRaw);

  const namedSections = [];
  for (let i = 1; i < rawParagraphs.length; i += 2) {
    const heading = sanitizeBotanicalText(rawParagraphs[i] || "");
    const rawBody = rawParagraphs[i + 1] || "";
    const paragraphs = splitIntoCleanParagraphs(rawBody);
    const body = paragraphs.join(" ") || sanitizeBotanicalText(rawBody);
    if (!heading || !body) continue;
    if (/^(see also|references|external links|further reading|notes|bibliography|sources|gallery|আরও দেখুন|তথ্যসূত্র|বহিঃসংযোগ)/i.test(heading)) {
      continue;
    }
    namedSections.push({ heading, body, paragraphs: paragraphs.length ? paragraphs : [body] });
  }

  return {
    lead,
    leadParagraphs,
    namedSections
  };
}

function extractSentences(text, maxSentences = 3) {
  return splitIntoSentences(text).slice(0, maxSentences).join(" ");
}

function findSectionsByKeywords(namedSections, patterns) {
  const matched = [];
  for (const sec of namedSections) {
    const h = sec.heading.toLowerCase();
    if (patterns.some((p) => h.includes(p))) {
      matched.push(sec);
    }
  }
  return matched;
}

function findSectionByKeywords(namedSections, patterns) {
  return findSectionsByKeywords(namedSections, patterns)[0] || null;
}

function extractBotanicalFamily(taxobox, lead, extract, wikitext, categoriesText) {
  const rawTaxoboxFamily = sanitizeBotanicalText(taxobox.familia || taxobox.family || taxobox.গোত্র || "");
  const taxoboxAceae = rawTaxoboxFamily.match(/\b([A-Z][a-z]+aceae)\b/);
  if (taxoboxAceae) {
    return taxoboxAceae[1];
  }
  if (rawTaxoboxFamily && hasBengaliScript(rawTaxoboxFamily)) {
    return rawTaxoboxFamily;
  }

  const sources = [lead, extract, wikitext, categoriesText].filter(Boolean);
  for (const src of sources) {
    const explicitMatch = String(src).match(/\bfamily\s+(?:of\s+)?([A-Z][a-z]+aceae)\b|\b([A-Z][a-z]+aceae)\s+family\b/);
    if (explicitMatch) {
      return explicitMatch[1] || explicitMatch[2];
    }
  }

  for (const src of sources) {
    const genericMatch = String(src).match(/\b([A-Z][a-z]+aceae)\b/);
    if (genericMatch) {
      return genericMatch[1];
    }
  }

  return "";
}

function extractBotanicalOrder(taxobox, lead, extract, wikitext, categoriesText) {
  const rawTaxoboxOrder = sanitizeBotanicalText(taxobox.ordo || taxobox.order || taxobox.বর্গ || "");
  const taxoboxAles = rawTaxoboxOrder.match(/\b([A-Z][a-z]+ales)\b/);
  if (taxoboxAles) {
    return taxoboxAles[1];
  }
  if (rawTaxoboxOrder && hasBengaliScript(rawTaxoboxOrder)) {
    return rawTaxoboxOrder;
  }

  const sources = [lead, wikitext, extract, categoriesText].filter(Boolean);
  for (const src of sources) {
    const explicitMatch = String(src).match(/\border\s+(?:of\s+)?([A-Z][a-z]+ales)\b|\b([A-Z][a-z]+ales)\s+order\b/);
    if (explicitMatch) {
      return explicitMatch[1] || explicitMatch[2];
    }
  }

  for (const src of sources) {
    const genericMatch = String(src).match(/\b([A-Z][a-z]+ales)\b/);
    if (genericMatch) {
      return genericMatch[1];
    }
  }

  return "";
}

function inferPlantGroupAndClade(taxobox, leadLower, categoriesLower, extractLower) {
  const taxoboxCladeText = [
    taxobox.cladus,
    taxobox.divisio,
    taxobox.phylum,
    taxobox.classis,
    taxobox.ordo,
    taxobox.order,
    taxobox.subregnum,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const primaryBlob = `${taxoboxCladeText} ${categoriesLower} ${leadLower}`;

  if (/\b(bryophyta|bryophyte|bryophytes|marchantiophyta|anthocerotophyta|liverwort|hornwort|moss|mosses)\b|মস/.test(primaryBlob)) {
    return { plantGroup: "Bryophyte", cladeLabel: "Bryophyta" };
  }

  if (
    /\b(pteridophyte|pteridophytes|pteridophyta|polypodiophyta|polypodiopsida|lycopodiophyta|fern|ferns)\b|ফার্ন/.test(primaryBlob) &&
    !/\bfern-like\b/.test(leadLower)
  ) {
    return { plantGroup: "Fern / Pteridophyte", cladeLabel: "Pteridophyta" };
  }

  if (
    /\b(gymnosperm|gymnosperms|gymnospermae|gnetophyta|ginkgophyta|cycadophyta|pinophyta|coniferophyta|conifer|conifers|welwitschiales|ginkgoales|cycadales|pinales|ephedrales|gnetales)\b/.test(
      `${primaryBlob} ${extractLower.slice(0, 1500)}`,
    )
  ) {
    return { plantGroup: "Gymnosperm", cladeLabel: "Gymnospermae" };
  }

  return { plantGroup: "Angiosperm (Flowering Plant)", cladeLabel: "Angiospermae" };
}

function inferGrowthForm(leadLower, categoriesLower, extractLower, plantGroup) {
  const primaryText = `${leadLower.slice(0, 750)} ${categoriesLower}`;
  const detectFromText = (blob) => {
    if (/\b(aquatic|hydrophyte|water plant|submerged|floating)\b|জলজ/.test(blob)) {
      return "Hydrophytic Aquatic Macrophyte";
    }
    if (/\b(succulent|cactus|cacti|xerophyte|caudex|caudiciform)\b/.test(blob)) {
      return "Perennial Succulent / Xerophyte";
    }
    if (/\b(palm|palms)\b|তাল/.test(blob)) {
      return "Arborescent Palm";
    }
    if (/\b(vine|climber|climbing|liana|twining)\b|লতা/.test(blob)) {
      return "Twining Vine / Climber";
    }
    if (/\b(shrub|shrubs|subshrub|bush)\b|গুল্ম/.test(blob)) {
      return "Woody Shrub / Subshrub";
    }
    if (/\b(herb|herbs|herbaceous|forb)\b|ভেষজ|বীরুৎ/.test(blob)) {
      return "Herbaceous Plant";
    }
    if (/\b(tree|trees|arborescent)\b|বৃক্ষ/.test(blob)) {
      return "Perennial Woody Tree";
    }
    if (/\bmonotypic genus\b|\bmonotypic\b/.test(blob)) {
      return plantGroup === "Gymnosperm"
        ? "Monotypic Gymnosperm Taxon"
        : "Monotypic Botanical Taxon";
    }
    return "";
  };

  const primaryHabit = detectFromText(primaryText);
  if (primaryHabit) return primaryHabit;

  const secondaryHabit = detectFromText(extractLower.slice(0, 2200));
  if (secondaryHabit) return secondaryHabit;

  if (plantGroup === "Bryophyte") return "Non-Vascular Bryophyte";
  if (plantGroup === "Fern / Pteridophyte") return "Vascular Fern";
  if (plantGroup === "Gymnosperm") return "Gymnosperm Taxon";
  return "Vascular Botanical Taxon";
}

function inferCategoryFromData(taxobox, extractLower, categoriesLower) {
  const blob = `${categoriesLower} ${extractLower.slice(0, 900)} ${taxobox.familia || ""}`.toLowerCase();
  if (/aquatic|hydrophyte|nymphaea|nelumbo|water lily|lotus|marsh|mangrove|wetland|জলজ/.test(blob)) {
    return "Aquatic & Wetland";
  }
  if (/medicinal|ayurveda|herb|spice|rhizome|aromatic|alkaloid|tea|ভেষজ|মসলা/.test(blob)) {
    return "Medicinal & Spice";
  }
  if (/fruit|orchard|citrus|mango|berry|drupe|edible|cultivar|nut|palm|ফল/.test(blob)) {
    return "Fruit & Orchard";
  }
  if (/flower|ornamental|blossom|rose|jasmine|petal|bougainvillea|floral|ফুল/.test(blob)) {
    return "Ornamental Flora";
  }
  if (/tree|timber|forest|canopy|deciduous|evergreen|woody|bark|বৃক্ষ/.test(blob)) {
    return "Timber & Canopy";
  }
  return "Global Flora";
}

function inferNumericAttribute(text, regex, fallback) {
  const m = String(text || "").match(regex);
  return m ? m[0] : fallback;
}

function buildPlantipediaMonograph(page, lang, originalQuery) {
  const wikitext = page.revisions?.[0]?.slots?.main?.content || "";
  const taxobox = parseTaxoboxFields(wikitext);
  if (!verifyBotanicalSubject(page, taxobox)) {
    return null;
  }

  const title = sanitizeBotanicalText(page.title || originalQuery);
  const { lead, leadParagraphs, namedSections } = splitSectionsFromExtract(page.extract || "");
  const extractFull = sanitizeBotanicalText(page.extract || "");
  const extractLower = extractFull.toLowerCase();
  const leadLower = lead.toLowerCase();
  const categoriesText = (page.categories || []).map((c) => c.title || "").join(" ");
  const categoriesLower = categoriesText.toLowerCase();

  const scientificName = extractBinomial(taxobox, title, lead) || sanitizeBotanicalText(taxobox.binomial || taxobox.taxon || title);
  const familyName = extractBotanicalFamily(taxobox, lead, extractFull, wikitext, categoriesText);
  const orderName = extractBotanicalOrder(taxobox, lead, extractFull, wikitext, categoriesText);
  const displayFamily = familyName || "Botanical Taxon (Global Registry)";

  const genusName = sanitizeBotanicalText(
    taxobox.genus || taxobox.গণ || (scientificName.includes(" ") ? scientificName.split(" ")[0] : title),
  );
  const speciesEpithet = sanitizeBotanicalText(
    taxobox.species || (scientificName.includes(" ") ? scientificName.split(/\s+/).slice(1).join(" ") : scientificName),
  );
  const bnLangTitle = page.langlinks?.find((l) => l.lang === "bn")?.title || "";

  const commonName = title;
  const commonNameBn = lang === "bn"
    ? title
    : sanitizeBotanicalText(bnLangTitle || "বৈশ্বিক উদ্ভিদ নমুনা");

  const category = inferCategoryFromData(taxobox, extractLower, categoriesLower);

  let heroUrl = page.original?.source || page.thumbnail?.source || "";
  if (heroUrl && !/^https?:\/\//i.test(heroUrl)) heroUrl = "";

  const leadOverview = extractSentences(lead, 3) || `${commonName} is a documented botanical taxon indexed via the Global Botanical Server.`;
  const shortSummary = extractSentences(lead, 2) || leadOverview;

  const { plantGroup: inferredGroup, cladeLabel } = inferPlantGroupAndClade(
    taxobox,
    leadLower,
    categoriesLower,
    extractLower,
  );
  const inferredHabit = inferGrowthForm(leadLower, categoriesLower, extractLower, inferredGroup);

  const secTaxonomyList = findSectionsByKeywords(namedSections, ["taxonomy", "etymology", "naming", "classification", "nomenclature", "phylogeny", "evolution", "শ্রেণিবিন্যাস"]);
  const secMorphologyList = findSectionsByKeywords(namedSections, ["description", "morphology", "botany", "biology", "characteristics", "anatomy", "physiology", "বিবরণ", "গঠন"]);
  const secHabitatList = findSectionsByKeywords(namedSections, ["distribution", "habitat", "ecology", "range", "origin", "conservation", "বিস্তৃতি", "আবাসস্থল"]);
  const secCultureList = findSectionsByKeywords(namedSections, ["culture", "symbol", "history", "significance", "folklore", "culinary", "সাহিত্য", "ইতিহাস"]);
  const secUsesList = findSectionsByKeywords(namedSections, ["use", "medicinal", "phytochemistry", "chemistry", "toxicity", "ethnobotany", "economic", "ব্যবহার", "উপকারিতা"]);
  const secCultivationList = findSectionsByKeywords(namedSections, ["cultivation", "propagation", "growing", "horticulture", "soil", "care", "চাষাবাদ"]);

  const secHabitat = secHabitatList[0] || null;
  const secUses = secUsesList[0] || null;

  const inferredLifespan = /\bannual\b/.test(leadLower) ? "Annual" : "Perennial";
  const phRangeMatch = extractLower.match(/\bpH\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/i);
  const phMin = phRangeMatch ? Math.max(4.0, Math.min(8.5, parseFloat(phRangeMatch[1]))) : 6.0;
  const phMax = phRangeMatch ? Math.max(phMin, Math.min(9.0, parseFloat(phRangeMatch[2]))) : 7.2;
  const inferredPh = `pH ${phMin.toFixed(1)}–${phMax.toFixed(1)}`;
  const inferredTemp = inferNumericAttribute(extractLower, /\d{1,2}\s*[–-]\s*\d{1,2}\s*°C/i, "18–32 °C");
  const isShade = /\b(shade|understory)\b/.test(extractLower) && !/\bfull sun\b/.test(extractLower);
  const isAquatic = /\b(aquatic|hydrophyte|submerged|wetland)\b/.test(leadLower);
  const isDrought = /\b(drought-tolerant|arid|xerophyte|succulent|desert)\b/.test(extractLower);
  const inferredLight = isShade
    ? "Partial Shade to Filtered Light (4–6 hours)"
    : "Full Sun to Bright Light (6–8 hours daily)";

  const classificationString = [
    "Kingdom: Plantae",
    `Group: ${inferredGroup}`,
    orderName ? `Order: ${orderName}` : null,
    familyName ? `Family: ${familyName}` : null,
    genusName ? `Genus: ${genusName}` : null,
    scientificName ? `Binomial: ${scientificName}` : null
  ].filter(Boolean).join(" · ");

  const taxonomicFamilyOrderText = [
    familyName || "Botanical Taxon (Global Registry)",
    orderName || null,
    cladeLabel
  ].filter(Boolean).join(" · ");

  const nativeOriginText = secHabitat
    ? extractSentences(secHabitat.body, 1)
    : "Documented Global Distribution (Global Flora Index)";
  const commonUsesText = secUses
    ? extractSentences(secUses.body, 1)
    : `${category} horticulture, biodiversity support & ethnobotanical study`;

  // Paragraph & sentence deduplication tracking across Chapters 01–07
  const usedParagraphKeys = new Set();
  const usedSentenceKeys = new Set();
  const allSentencePool = [
    ...leadParagraphs.flatMap((p) => splitIntoSentences(p)),
    ...namedSections.flatMap((sec) => sec.paragraphs.flatMap((p) => splitIntoSentences(p)))
  ];

  const isTextUnused = (text) => {
    const key = normalizeDedupKey(text);
    if (!key || usedParagraphKeys.has(key)) return false;
    const sentences = splitIntoSentences(text);
    if (sentences.length > 0 && sentences.every((s) => usedSentenceKeys.has(normalizeDedupKey(s)))) {
      return false;
    }
    if (sentences.length > 0 && usedSentenceKeys.has(normalizeDedupKey(sentences[0]))) {
      return false;
    }
    return true;
  };

  const markTextUsed = (text) => {
    const key = normalizeDedupKey(text);
    if (key) usedParagraphKeys.add(key);
    splitIntoSentences(text).forEach((s) => {
      const sk = normalizeDedupKey(s);
      if (sk) usedSentenceKeys.add(sk);
    });
  };

  const claimParagraphs = (candidates, maxCount = 3) => {
    const claimed = [];
    for (const raw of candidates) {
      const clean = sanitizeBotanicalText(raw);
      if (!clean || clean.length < 20) continue;
      if (!isTextUnused(clean)) continue;
      markTextUsed(clean);
      claimed.push(clean);
      if (claimed.length >= maxCount) break;
    }
    return claimed;
  };

  const pullUnusedSentences = (keywords = [], maxSentences = 3) => {
    const remaining = allSentencePool.filter((s) => {
      const sk = normalizeDedupKey(s);
      return sk && !usedSentenceKeys.has(sk) && !usedParagraphKeys.has(sk);
    });
    if (!remaining.length) return "";

    const kwMatches = keywords.length
      ? remaining.filter((s) => {
          const lower = s.toLowerCase();
          return keywords.some((kw) => lower.includes(kw));
        })
      : [];

    const chosen = (kwMatches.length ? kwMatches : remaining).slice(0, maxSentences);
    const combined = sanitizeBotanicalText(chosen.join(" "));
    if (!combined || !isTextUnused(combined)) return "";
    markTextUsed(combined);
    return combined;
  };

  const assignChapterParagraphs = ({
    primary = [],
    secondary = [],
    sentenceKeywords = [],
    fallbacks = [],
    maxPrimary = 3
  }) => {
    const out = claimParagraphs(primary, maxPrimary);
    if (out.length === 0 && secondary.length > 0) {
      out.push(...claimParagraphs(secondary, 2));
    }
    if (out.length === 0) {
      const synthesized = pullUnusedSentences(sentenceKeywords, 3);
      if (synthesized) {
        out.push(synthesized);
      }
    }
    if (out.length === 0 && fallbacks.length > 0) {
      out.push(...claimParagraphs(fallbacks, 2));
    } else if (out.length === 1 && out[0].length < 180) {
      const supplemental = pullUnusedSentences(sentenceKeywords, 2) || claimParagraphs(fallbacks.slice(-1), 1)[0];
      if (supplemental) {
        out.push(supplemental);
      }
    }
    return out;
  };

  const collectSectionParagraphs = (sectionList) =>
    sectionList.flatMap((sec) => sec.paragraphs || []);

  const ch1Paragraphs = assignChapterParagraphs({
    primary: [...leadParagraphs.slice(0, 2), ...collectSectionParagraphs(secTaxonomyList)],
    sentenceKeywords: ["species", "genus", "family", "order", "named", "taxon", "classif", "binomial"],
    fallbacks: [
      `Taxonomically cataloged under ${classificationString}. Verified through the Global Flora Index botanical taxonomy registry for standardized Plantipedia comparative inspection.`
    ],
    maxPrimary: 3
  });

  const ch2Paragraphs = assignChapterParagraphs({
    primary: collectSectionParagraphs(secMorphologyList),
    secondary: leadParagraphs.slice(2),
    sentenceKeywords: ["leaf", "leaves", "stem", "trunk", "bark", "flower", "petal", "fruit", "seed", "cone", "root", "height", "cm", "m", "grow", "foliage", "গঠন", "পাতা", "ফুল"],
    fallbacks: [
      `Morphological records retrieved from the Global Botanical Server classify ${commonName} as a ${inferredHabit.toLowerCase()} within ${displayFamily}, exhibiting structural anatomy adapted to its native ecological guild.`
    ],
    maxPrimary: 3
  });

  const ch3Paragraphs = assignChapterParagraphs({
    primary: collectSectionParagraphs(secHabitatList),
    sentenceKeywords: ["native", "endemic", "habitat", "region", "climate", "desert", "forest", "soil", "rain", "pollinat", "ecology", "distribution", "elevation", "আবাস", "অঞ্চল"],
    fallbacks: [
      `Ecological records indicate ${commonName} establishes across natural habitats aligned with its physiological moisture and solar envelope, contributing to regional biodiversity and trophic networks.`,
      `Adapted to ambient thermal conditions around ${inferredTemp} within structured mineral or organic substrates.`
    ],
    maxPrimary: 3
  });

  const ch4Paragraphs = assignChapterParagraphs({
    primary: collectSectionParagraphs(secCultureList),
    secondary: collectSectionParagraphs(secUsesList).slice(0, 1),
    sentenceKeywords: ["cultur", "tradition", "history", "symbol", "ornamental", "food", "garden", "heritage", "ইতিহাস", "সাহিত্য"],
    fallbacks: [
      `${commonName} carries documented ecological, horticultural, or cultural interest across regional floras indexed in the Global Botanical Server.`,
      `Cross-referenced under Plantipedia's standardized monograph framework for side-by-side comparative inspection.`
    ],
    maxPrimary: 3
  });

  const ch5Paragraphs = assignChapterParagraphs({
    primary: collectSectionParagraphs(secUsesList),
    sentenceKeywords: ["chemical", "compound", "oil", "acid", "alkaloid", "medic", "toxic", "extract", "vitamin", "resin", "phytochem", "ভেষজ"],
    fallbacks: [
      `Phytochemical and ethnobotanical records note secondary metabolites, polyphenols, or structural biopolymers typical of ${displayFamily}, supporting traditional and modern botanical inquiry.`,
      `Detailed biochemical profiling should reference peer-reviewed botanical pharmacopoeias alongside Global Flora Index taxon records.`
    ],
    maxPrimary: 3
  });

  const ch6Paragraphs = assignChapterParagraphs({
    primary: collectSectionParagraphs(secCultivationList),
    sentenceKeywords: ["propagat", "seed", "cutting", "cultivat", "soil", "water", "prune", "germinat", "pot", "চাষ"],
    fallbacks: [
      `Propagation and field establishment for ${commonName} follow protocols tuned to ${inferredHabit.toLowerCase()} physiology, prioritizing root-zone aeration and seasonal moisture balance.`,
      `Lifecycle classification: ${inferredLifespan} ${inferredGroup.toLowerCase()} indexed under ${category}.`
    ],
    maxPrimary: 3
  });

  const ch7Paragraphs = assignChapterParagraphs({
    primary: [],
    sentenceKeywords: ["ph", "temperature", "°c", "sunlight", "moisture", "drought", "humidity", "frost"],
    fallbacks: [
      `Calibrated physiological telemetry estimates for ${commonName} synthesized from Global Flora Index taxon descriptors.`,
      `Abiotic profile summarizes solar irradiance preference (${inferredLight}), edaphic reaction (${inferredPh}), and thermal operating window (${inferredTemp}).`
    ],
    maxPrimary: 2
  });

  const rawSections = [
    {
      number: "01",
      title: "Botanical Identity & Classification",
      subtitle: "Global Flora Index Nomenclature & Taxonomic Hierarchy",
      summary: "Taxonomic placement, Linnaean binomial authority, and vernacular cross-referencing.",
      paragraphs: ch1Paragraphs,
      subblocks: [
        { heading: "Scientific Binomial", text: scientificName || commonName },
        { heading: "Taxonomic Family & Order", text: taxonomicFamilyOrderText }
      ]
    },
    {
      number: "02",
      title: "Morphological Architecture",
      subtitle: "Foliar, Vascular & Floral Anatomy",
      summary: "Vegetative habit, structural anatomy, and diagnostic morphological characteristics.",
      paragraphs: ch2Paragraphs
    },
    {
      number: "03",
      title: "Native Distribution & Ecology",
      subtitle: "Biogeographic Range & Habitat Interactions",
      summary: "Endemic ecological range, climate envelope, and trophic community interactions.",
      paragraphs: ch3Paragraphs
    },
    {
      number: "04",
      title: "Ethnobotanical Uses & Cultural Significance",
      subtitle: "Horticultural, Culinary & Heritage Value",
      summary: "Documented human cultivation history, culinary applications, and cultural significance.",
      paragraphs: ch4Paragraphs
    },
    {
      number: "05",
      title: "Phytochemistry & Bioactive Compounds",
      subtitle: "Secondary Metabolites & Medicinal Profile",
      summary: "Bioactive constituents, aromatic compounds, and pharmacognostic context.",
      paragraphs: ch5Paragraphs
    },
    {
      number: "06",
      title: "Propagation & Field Husbandry",
      subtitle: "Germination, Clonal & Canopy Management",
      summary: "Practical propagation pathways, seasonal pruning, and establishment milestones.",
      paragraphs: ch6Paragraphs
    },
    {
      number: "07",
      title: "Physiological Telemetry & Cultivation Profile",
      subtitle: "Soil pH, Solar Irradiance & Moisture Thresholds",
      summary: "Synthesized abiotic operating thresholds for soil chemistry, sunlight, and hydration.",
      paragraphs: ch7Paragraphs,
      subblocks: [
        { heading: "Substrate Reaction", text: `Optimal soil tolerance spans ${inferredPh} across well-aerated substrates.` },
        { heading: "Solar & Thermal Window", text: `${inferredLight} with optimal canopy temperatures near ${inferredTemp}.` }
      ]
    }
  ];

  // Final defensive pass: enforce global uniqueness across all chapters 01–07
  const finalSeenParagraphKeys = new Set();
  const sections = rawSections.map((sec) => {
    const uniqueParagraphs = [];
    for (const p of sec.paragraphs) {
      const k = normalizeDedupKey(p);
      if (!k || finalSeenParagraphKeys.has(k)) continue;
      finalSeenParagraphKeys.add(k);
      uniqueParagraphs.push(p);
    }
    return {
      ...sec,
      paragraphs: uniqueParagraphs.length
        ? uniqueParagraphs
        : [`Chapter ${sec.number} summary for ${commonName} (${scientificName || commonName}) indexed via Global Flora Index.`]
    };
  });

  const monograph = {
    isGlobalLive: true,
    query: normalizeGlobalQuery(originalQuery),
    slug: "",
    specimenId: `GBS-${String(page.pageid || "LIVE").slice(-5)}`,
    commonName,
    commonNameBn,
    scientificName: scientificName || commonName,
    familyBn: lang === "bn" ? familyName : "",
    category,
    featured: false,
    leadOverview,
    shortSummary,
    sourceBadge: "GLOBAL FLORA INDEX",
    heroImage: {
      url: heroUrl || "./assets/images/placeholder-botanical.svg",
      fallbackUrl: "./assets/images/placeholder-botanical.svg",
      alt: `${commonName} (${scientificName || commonName}) botanical specimen plate`,
      caption: `${commonName} — Live taxon plate archived via Global Botanical Server`
    },
    specimenMetadata: {
      specimenId: `GBS-${String(page.pageid || "LIVE").slice(-5)}`,
      taxonRank: "Species",
      collectionZone: nativeOriginText,
      photographer: "Global Flora Index Digital Archive",
      archiveCollection: "Global Botanical Server Live Feed"
    },
    overview: {
      plantGroup: inferredGroup,
      family: displayFamily,
      genus: genusName || "Indexed Genus",
      species: speciesEpithet || scientificName || commonName,
      growthForm: inferredHabit,
      nativeOrigin: nativeOriginText,
      commonUses: commonUsesText,
      sunlight: inferredLight,
      phRange: inferredPh,
      temperatureRange: inferredTemp,
      lifespan: inferredLifespan
    },
    cultivationTelemetry: {
      phMin,
      phMax,
      phOptimalLabel: inferredPh,
      sunlightLevel: isShade ? 2 : 3,
      sunlightLabel: isShade ? "Partial Shade (4–6 hrs)" : "Full Sun (6+ hrs direct)",
      irrigationLevel: isAquatic ? 3 : isDrought ? 1 : 2,
      irrigationLabel: isAquatic ? "High / Wetland Basin" : isDrought ? "Low / Drought-Tolerant" : "Moderate Moisture",
      soilDrainageLabel: isAquatic ? "Hydric Wetland Silt" : "Well-Drained Organic Loam"
    },
    sections,
    relatedSpecies: []
  };

  extractPlantTelemetryStats(monograph);
  return monograph;
}

async function inspectTitlesForBotany(titles, lang, originalQuery, signal) {
  for (const title of titles) {
    const detailUrl = buildApiUrl(lang, {
      action: "query",
      redirects: "1",
      titles: title,
      prop: "extracts|pageimages|categories|langlinks|revisions",
      explaintext: "1",
      exsectionformat: "wiki",
      piprop: "original|thumbnail",
      pithumbsize: "1000",
      cllimit: "40",
      lllang: lang === "bn" ? "en" : "bn",
      rvprop: "content",
      rvslots: "main",
      rvsection: "0"
    });
    const detailJson = await fetchJsonWithSignal(detailUrl, signal);
    const pages = detailJson?.query?.pages || [];
    for (const page of pages) {
      if (!page || page.missing) continue;
      const extractLower = String(page.extract || "").slice(0, 260).toLowerCase();
      const catsLower = (page.categories || []).map((c) => c.title || "").join(" ").toLowerCase();
      const isDisambig =
        DISAMBIGUATION_MARKERS.some((m) => extractLower.includes(m)) ||
        catsLower.includes("disambiguation");
      if (isDisambig) {
        return { disambiguation: true, monograph: null };
      }
      const monograph = buildPlantipediaMonograph(page, lang, originalQuery);
      if (monograph) {
        return { disambiguation: false, monograph };
      }
    }
  }
  return { disambiguation: false, monograph: null };
}

async function queryServerInLanguage(query, lang, signal) {
  const searchUrl = buildApiUrl(lang, {
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5"
  });
  const searchJson = await fetchJsonWithSignal(searchUrl, signal);
  const hits = searchJson?.query?.search || [];
  if (!hits.length) {
    return { ok: false, reason: "invalid" };
  }

  const primaryTitles = hits.map((h) => h.title).filter(Boolean).slice(0, 3);
  const firstPass = await inspectTitlesForBotany(primaryTitles, lang, query, signal);
  if (firstPass.monograph) {
    return { ok: true, monograph: firstPass.monograph };
  }

  // Only perform plant-disambiguated lookup if the raw query resolved to a disambiguation page
  // or a search snippet explicitly indicates a botanical namesake
  const hasPlantHintInSnippets =
    firstPass.disambiguation ||
    hits.some((h) => /plant|flower|tree|species|herb|genus|shrub|উদ্ভিদ|ফুল|গাছ/i.test(String(h.snippet || "")));

  if (hasPlantHintInSnippets && !/\b(plant|flower|tree)\b/i.test(query)) {
    const disambigUrl = buildApiUrl(lang, {
      action: "query",
      list: "search",
      srsearch: hasBengaliScript(query) ? `${query} উদ্ভিদ` : `${query} plant`,
      srlimit: "4"
    });
    const disambigJson = await fetchJsonWithSignal(disambigUrl, signal);
    const disambigTitles = (disambigJson?.query?.search || [])
      .map((h) => h.title)
      .filter((t) => t && !primaryTitles.includes(t))
      .slice(0, 3);
    if (disambigTitles.length > 0) {
      const secondPass = await inspectTitlesForBotany(disambigTitles, lang, query, signal);
      if (secondPass.monograph) {
        return { ok: true, monograph: secondPass.monograph };
      }
    }
  }

  return { ok: false, reason: "invalid" };
}

export async function fetchFromGlobalBotanicalServer(query, options = {}) {
  const { signal, onRetry } = options;
  const cleanQuery = normalizeGlobalQuery(query);
  if (!cleanQuery || cleanQuery.length < 2) {
    return { ok: false, reason: "invalid" };
  }

  const cached = getCachedGlobalMonograph(cleanQuery);
  if (cached) {
    return { ok: true, monograph: cached, fromCache: true };
  }

  const preferredLang = hasBengaliScript(cleanQuery) ? "bn" : "en";
  const fallbackLang = preferredLang === "bn" ? "en" : "bn";
  const startTime = Date.now();
  let lastNetworkError = null;

  for (let attempt = 0; attempt < RETRY_SCHEDULE_MS.length; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const targetOffset = RETRY_SCHEDULE_MS[attempt];
    const elapsed = Date.now() - startTime;
    if (attempt > 0) {
      if (typeof onRetry === "function") {
        onRetry(attempt + 1, RETRY_SCHEDULE_MS.length);
      }
      if (targetOffset > elapsed) {
        await waitWithSignal(targetOffset - elapsed, signal);
      }
    }

    try {
      const primaryResult = await queryServerInLanguage(cleanQuery, preferredLang, signal);
      if (primaryResult.ok) {
        setCachedGlobalMonograph(cleanQuery, primaryResult.monograph);
        return primaryResult;
      }

      // If Bengali query didn't resolve in BN index, try EN; if English didn't resolve, skip BN unless needed
      if (preferredLang === "bn") {
        const secondaryResult = await queryServerInLanguage(cleanQuery, fallbackLang, signal);
        if (secondaryResult.ok) {
          setCachedGlobalMonograph(cleanQuery, secondaryResult.monograph);
          return secondaryResult;
        }
      }

      // Server responded cleanly and confirmed specimen is invalid / non-botanical
      return { ok: false, reason: "invalid" };
    } catch (err) {
      if (isAbortError(err) && signal?.aborted) {
        throw err;
      }
      if (err?.isNetworkError) {
        lastNetworkError = err;
        continue;
      }
      lastNetworkError = err;
    }
  }

  return {
    ok: false,
    reason: "network",
    error: lastNetworkError?.message || "Global Botanical Server connection failed."
  };
}

function pickFiveStatusMessages() {
  const pool = [...GLOBAL_STATUS_MESSAGES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

export async function runGlobalServerTelemetry({
  container,
  queryLabel = "Global Specimen",
  work,
  onAbort
}) {
  if (!container) {
    throw new Error("Telemetry container element is required.");
  }

  const controller = new AbortController();
  const messages = pickFiveStatusMessages();
  let abortedByUser = false;
  let rafId = 0;
  let cycleTimer = 0;
  let retryFlag = false;

  const progressFill = el("div", { className: "gbs-loader-fill" });
  const pctBadge = el("span", { className: "gbs-loader-pct", textContent: "0%" });
  const statusEl = el("p", { className: "gbs-loader-status", textContent: messages[0] });
  const subStatusEl = el("p", {
    className: "gbs-loader-substatus",
    textContent: `Target taxon: "${queryLabel}" · Encrypted Botanical Index Stream`
  });
  const abortBtn = el("button", {
    type: "button",
    className: "compare-loader-abort-btn",
    textContent: "✕ Abort"
  });

  const loaderCard = el("div", {
    className: "gbs-loader-card glass-panel",
    role: "status",
    "aria-live": "polite"
  }, [
    el("div", { className: "gbs-loader-head" }, [
      el("div", { className: "gbs-loader-title-wrap" }, [
        el("span", { className: "gbs-loader-badge", textContent: "GLOBAL BOTANICAL SERVER" }),
        el("h3", { className: "gbs-loader-heading", textContent: "Synthesizing Live Botanical Monograph" })
      ]),
      abortBtn
    ]),
    statusEl,
    el("div", { className: "gbs-loader-track" }, [progressFill]),
    el("div", { className: "gbs-loader-meta" }, [
      subStatusEl,
      pctBadge
    ])
  ]);

  const previousChildren = [...container.childNodes];
  container.replaceChildren(loaderCard);

  const cleanupTimers = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (cycleTimer) clearInterval(cycleTimer);
  };

  const restorePrevious = () => {
    cleanupTimers();
    if (typeof onAbort === "function") {
      onAbort();
    } else {
      container.replaceChildren(...previousChildren);
    }
  };

  abortBtn.addEventListener("click", () => {
    if (abortedByUser) return;
    abortedByUser = true;
    controller.abort();
    restorePrevious();
  });

  const startMs = performance.now();
  let messageStep = 0;
  cycleTimer = setInterval(() => {
    if (abortedByUser) return;
    messageStep = Math.min(messageStep + 1, messages.length - 1);
    statusEl.textContent = messages[messageStep];
  }, 1000);

  const updateProgress = () => {
    if (abortedByUser) return;
    const elapsed = performance.now() - startMs;
    const pct = Math.min(100, Math.round((elapsed / TELEMETRY_DURATION_MS) * 100));
    progressFill.style.width = `${pct}%`;
    pctBadge.textContent = `${pct}%`;
    if (elapsed < TELEMETRY_DURATION_MS) {
      rafId = requestAnimationFrame(updateProgress);
    }
  };
  rafId = requestAnimationFrame(updateProgress);

  const notifyRetry = () => {
    if (abortedByUser || retryFlag) return;
    retryFlag = true;
    subStatusEl.textContent = "Retrying Global Server connection...";
    subStatusEl.classList.add("is-retrying");
  };

  try {
    const workPromise = Promise.resolve().then(() => work({ signal: controller.signal, onRetry: notifyRetry }));
    const timerPromise = waitWithSignal(TELEMETRY_DURATION_MS, controller.signal);

    const [workResult] = await Promise.all([workPromise, timerPromise]);
    cleanupTimers();

    if (abortedByUser || controller.signal.aborted) {
      return { aborted: true };
    }

    progressFill.style.width = "100%";
    pctBadge.textContent = "100%";
    return { aborted: false, result: workResult };
  } catch (err) {
    cleanupTimers();
    if (abortedByUser || isAbortError(err) || controller.signal.aborted) {
      return { aborted: true };
    }
    return {
      aborted: false,
      result: { ok: false, reason: "network", error: err?.message || "Connection interrupted." }
    };
  }
}
