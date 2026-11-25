# Plantipedia System Architecture (v3.0)

Plantipedia is a zero-build, multi-page ES6+ static web platform engineered with clean separation across configuration, botanical datasets, core runtime compilers, domain engines, page controllers, and modular stylesheets.

---

## 1. Layered Directory Architecture

- **`config/`** — Declarative platform manifests (`environment.json`, `routes.json`, `palette-tokens.json`, `navbar.json`, `footer.json`, `site-shell.json`). Controls route registries, navigation trees, jewel-tone card tokens, and global brand metadata without modifying application code.
- **`data/`** — Three-tier static botanical data lake:
  - `data/index/` — Master 50-species index (`species-index.json`), interactive glossary (`glossary.json`), featured flora, taxonomy highlights, trivia, and route-specific page payloads (`data/index/pages/*.json`).
  - `data/monographs/` — 50 individual 8-chapter scientific monographs (`<slug>.json`), loaded strictly on demand.
  - `data/phenology/` — Six-season Bengali *Shororitu* ecological phenology dataset (`seasons.json`).
- **`src/core/`** — Foundational runtime infrastructure:
  - `src/core/bootstrap/` — Page hydration entry point (`app.js`), section mount registry (`registry.js`), subpath-safe path/route resolver (`router.js`), and reactive in-memory state (`state.js`).
  - `src/core/compilers/` — Autonomous navbar, bilingual search, and mobile drawer compiler (`navbar-compiler.js`), compact/full footer compiler (`footer-compiler.js`), layout shell hydrator (`shell.js`), and smart 404 recovery controller (`specimen-not-found.js`).
  - `src/core/telemetry/` — GSAP + ScrollTrigger scroll choreography (`animations.js`), numerical telemetry extraction (`telemetry-stats.js`), and cultivation gauge meters (`telemetry-meters.js`).
- **`src/engines/`** — Domain-specific processing engines:
  - `src/engines/search/` — Bilingual (`EN / বাংলা / Latin`) instant autocomplete and navigation handlers (`navigation.js`).
  - `src/engines/global-server/` — Centralized validated dataset fetcher (`api.js`) and the zero-key Global Botanical Server client (`global-botanical-server.js`) featuring automated taxon parsing, retry resilience, and manual abort support across 390,000+ flora taxa.
  - `src/engines/comparator/` — Three-second, three-stage Comparison Synthesis Labor Illusion overlay (`synthesis-overlay.js`) with progress telemetry and cancellation control.
  - `src/engines/citation/` — APA / MLA / BibTeX citation generator (`citation-generator.js`) and interactive botanical glossary auto-tooltip engine (`glossary-tooltips.js`).
- **`src/modules/`** — Dedicated route controllers (`src/modules/pages/*`) and shared helpers (`src/modules/utils/herbarium.js`, `seo.js`, `templates.js`).
- **`styles/`** — Layered CSS design system split into `base/`, `components/`, `pages/` (including dedicated `services.css`), `print/` (`field-sheets.css`), and `tailwind/` runtime utilities.

---

## 2. Routing & Subpath Resolution

All public routes use clean extensionless directory entry points (`/`, `/species/`, `/plant/`, `/plant/live/`, `/taxonomy/`, `/seasons/`, `/compare/`, `/compare/result/`, `/services/`, `/404.html`). Every relative asset, stylesheet, ES module import, and `fetch()` endpoint resolves via `import.meta.url` and `resolveRootPath()` so the application operates seamlessly from both root `/` deployments and nested subpath mounts.

---

## 3. Data Fetching & Caching Lifecycle

1. **Navbar & Shell Bootstrap:** `navbar-compiler.js` and `footer-compiler.js` load `./config/navbar.json`, `./config/footer.json`, and `./data/index/species-index.json` concurrently with `sessionStorage` caching (`plantipedia:species-index:v50`) and inline structural fallbacks.
2. **On-Demand Monograph Streaming:** Individual plant views only download `./data/monographs/<slug>.json` for the active specimen, keeping initial page payloads lightweight.
3. **Global Botanical Server Pipeline:** Queries outside the 50 curated local monographs invoke the zero-key live botanical gateway (`global-botanical-server.js`), normalizing taxonomic ranks, ecological telemetry, and photographic specimens into Plantipedia's unified 8-chapter monograph format.
4. **Offline PWA Cache:** `sw.js` caches core shells, stylesheets, ES modules, and configuration manifests using network-first strategies for dynamic content and cache-first strategies for static media.

---

## 4. SEO, Structured Metadata & Print Engineering

- **Dynamic JSON-LD (`src/modules/utils/seo.js`):** Injects Schema.org `EducationalOrganization`, `WebSite`, `CollectionPage`, `Dataset`, `ScholarlyArticle`, `Taxon`, and `BreadcrumbList` graphs tailored to the active species, taxonomic family, season, or comparison pair.
- **Academic Field Sheets (`styles/print/field-sheets.css`):** Strips navigation chrome, converts glassmorphic surfaces to high-contrast light-mode ink on A4 paper, enforces page-break avoidance, and preserves telemetry charts and taxonomic tables for print/PDF export.
