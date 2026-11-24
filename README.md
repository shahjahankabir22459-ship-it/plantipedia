<div align="center">

# 🌺 Plantipedia — Digital Botanical Encyclopedia & Flora Archive

**Curating the botanical world with scientific precision — exploring Earth's diverse flora, one species at a time.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Plantipedia-10B981?style=for-the-badge&logo=githubpages&logoColor=white)](https://rayaantasnim.github.io/plantipedia/)
[![Architecture](https://img.shields.io/badge/Architecture-Multi--Layer%20JSON%20Engine-065F46?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rayaantasnim/plantipedia)

<br/>

![HTML5](https://img.shields.io/badge/HTML5-Folder%20Routes-E34F26?style=flat-square&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-Zero--Build%20CDN-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Modular%20Cascade-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B%20Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=000000)
![JSON](https://img.shields.io/badge/Data-100%25%20JSON--Driven-059669?style=flat-square&logo=json&logoColor=white)
![Flora Catalog](https://img.shields.io/badge/Flora%20Catalog-20%20Curated%20Species-34D399?style=flat-square&logo=leaflet&logoColor=white)
![Schema.org SEO](https://img.shields.io/badge/SEO-Schema.org%20JSON--LD-FBBF24?style=flat-square&logo=schema-dot-org&logoColor=000000)

[**Explore Live Archive**](https://rayaantasnim.github.io/plantipedia/) · [**Browse Species Atlas**](https://rayaantasnim.github.io/plantipedia/species/) · [**Taxonomic Lineage**](https://rayaantasnim.github.io/plantipedia/taxonomy/) · [**6-Season Calendar**](https://rayaantasnim.github.io/plantipedia/seasons/) · [**Compare Species**](https://rayaantasnim.github.io/plantipedia/compare/)

</div>

---

## 📖 Overview

**Plantipedia** is a scholarly, zero-build botanical encyclopedia documenting **20 curated plant species**—with deep coverage of South Asian and Bangladeshi flora alongside iconic global taxa. Organized into a **Multi-Layer Enterprise Directory Architecture** (`styles/`, `data/`, `js/`) with **Clean Extensionless Folder-Based Routing**, every asset, stylesheet, ES module, and JSON endpoint resolves dynamically via `data-root` (`./` or `../`) through `js/core/router.js` so the site runs identically on **GitHub Pages** and local HTTP servers.

Key architectural capabilities:

- **Clean Extensionless Folder-Based URLs:** Dedicated directory entry points serve `/`, `/species/`, `/plant/?species=<slug>`, `/taxonomy/`, `/seasons/`, and `/compare/` cleanly with zero `.html` extensions, backed by custom `404.html`, `sitemap.xml`, `robots.txt`, and `sw.js` offline caching.
- **Decoupled Global Shell Compilers:** Independent `./data/config/navbar.json` + `./js/components/navbar-compiler.js` and `./data/config/footer.json` + `./js/components/footer-compiler.js` pairs hydrate `<header id="global-navbar">` and `<footer id="global-footer">` across every route—complete with bilingual (`EN / বাংলা`) autocomplete search, Personal Herbarium drawer (`localStorage`), trailing-slash active state normalization, and `?embed=true` suppression for side-by-side comparison panes.
- **Structured Multi-Tier Data Lake (`/data/`):** Separated cleanly into `config/` (navbar, footer & shell JSON), `catalog/` (`species-index.json`, `featured-species.json`, `taxonomy.json`, `trivia.json`, `highlights.json`, `glossary.json`), `pages/` (6 per-route configs), and `species/` (20 full `00`–`07` chapter monographs loaded on demand).
- **Dynamic SEO & Schema.org JSON-LD (`js/services/seo.js`):** Injects tailored canonical links, Open Graph, Twitter Card tags, and structured JSON-LD (`CollectionPage`, `ItemList`, `Dataset`, `WebApplication`, `Taxon`, `BreadcrumbList`) across all routes.
- **Layered Styles Architecture (`/styles/`):** Core design tokens and resets (`styles/core/`), modular page and component stylesheets (`styles/modules/`), and browser-native Tailwind Play CDN configuration + `@layer components` (`styles/tailwind/`).
- **XSS-Safe & Resilient Media:** Programmatic DOM creation (`document.createElement`, `DocumentFragment`, `textContent`, URL protocol validation) and a global capture-phase image error fallback to `./assets/images/placeholder-botanical.svg`.

---

## 📂 Directory Structure

```text
plantipedia/
├── index.html                              # Root Home Gateway (/) [data-root="./"]
├── 404.html                                # Custom Specimen-Not-Found error page [data-root="./"]
├── manifest.json                           # Web App Manifest (icon, theme & start URL)
├── sw.js                                   # Service Worker for clean routes, modules & Data Lake
├── robots.txt                              # Search crawler rules & Sitemap pointer
├── sitemap.xml                             # Generated 25-URL XML sitemap (routes + 20 species)
├── googlef88d19b67a8f9099.html             # Search Console verification asset
├── server.js                               # Lightweight Express static server + 404 handler (port 3000)
├── package.json                            # Project scripts (dev, start, build, lint)
├── README.md                               # Architecture, routing, schemas & deployment guide
├── species/
│   └── index.html                          # 20-Species Atlas route (/species/) [data-root="../"]
├── plant/
│   └── index.html                          # Dynamic Monograph route (/plant/?species=<slug>) [data-root="../"]
├── taxonomy/
│   └── index.html                          # Taxonomic Lineage Explorer (/taxonomy/) [data-root="../"]
├── seasons/
│   └── index.html                          # 6-Season Botanical Calendar (/seasons/) [data-root="../"]
├── compare/
│   └── index.html                          # Dual-Pane Split View Comparator (/compare/) [data-root="../"]
├── assets/
│   └── images/
│       ├── brand-flower.svg                # Custom vector hibiscus/lotus emblem
│       └── placeholder-botanical.svg       # Offline/broken-image botanical plate fallback
├── styles/                                 # Multi-layer modular CSS cascade + zero-build Tailwind layer
│   ├── core/
│   │   ├── variables.css                   # Dark botanical palette, glass tokens, typography & easing
│   │   ├── base.css                        # Reset, radial backdrop, justified prose & reveal fallback
│   │   └── layout.css                      # Scroll progress bar, fixed glass navbar, hero & centered footer
│   ├── modules/
│   │   ├── sections.css                    # Home sections, taxonomy/season glass grids & 2-col atlas grid
│   │   ├── components.css                  # Anti-CLS min-heights, skeletons, drawer, tooltips & compare UI
│   │   └── pages-responsive.css            # Sticky pagination, monograph print styles & <= 1080px breakpoints
│   └── tailwind/                           # Zero-build Tailwind Play CDN theme & component abstractions
│       ├── tailwind.config.js              # Unified Dark Botanical Luxury theme tokens (preflight: false)
│       ├── load-tailwind-layers.js         # Browser-native <style type="text/tailwindcss"> loader
│       ├── tw-navbar.css                   # Navbar glassmorphism, autocomplete & mobile drawer utilities
│       ├── tw-footer.css                   # Compact centered footer component utilities
│       ├── tw-hero-sections.css            # Hero spotlight, mission stats & taxonomic realm utilities
│       ├── tw-grids-cards.css              # 2-column & 3-column responsive card grid utilities
│       ├── tw-pagination-controls.css      # Sticky pagination bar, category pills & A–Z index bar
│       └── tw-monograph-modals.css         # Monograph chapters, classification table & Section Map modal
├── data/                                   # 100% JSON-driven Multi-Tier Data Lake
│   ├── config/
│   │   ├── navbar.json                     # Standalone global navbar, dropdowns, search & mobile drawer config
│   │   ├── footer.json                     # Standalone compact centered footer (credits, disclaimer, copyright)
│   │   └── site-shell.json                 # Shared site shell fallback configuration
│   ├── catalog/
│   │   ├── species-index.json              # Lightweight 20-species master index (search, atlas & featured)
│   │   ├── featured-species.json           # Top 3 flagship species showcase configuration
│   │   ├── taxonomy.json                   # 4 taxonomic flora realms cards
│   │   ├── trivia.json                     # 5 physiological & evolutionary curiosities ("Did You Know?")
│   │   ├── highlights.json                 # 3 field notes & stewardship principle cards
│   │   └── glossary.json                   # Bilingual (EN / বাংলা) scientific botanical glossary terms
│   ├── pages/
│   │   ├── home.json                       # Home SEO, JSON-LD, hero copy & mission stats
│   │   ├── species.json                    # Directory SEO, banner stats, 10-per-page pagination & filters
│   │   ├── plant.json                      # Monograph SEO, table labels & Section Map descriptions
│   │   ├── taxonomy.json                   # Taxonomic Lineage Explorer page config
│   │   ├── seasons.json                    # 6-Season Bengal Botanical Calendar page config
│   │   └── compare.json                    # Dual Monograph Comparator page config
│   └── species/                            # 20 individual per-species 8-chapter monographs + Schema.org JSON-LD
│       ├── aloe-vera.json                  # Aloe vera monograph
│       ├── bamboo.json                     # Bambusoideae monograph
│       ├── ...                             # (17 additional lowercase kebab-case <slug>.json files)
│       └── water-lily.json                 # Nymphaea monograph
├── js/                                     # Enterprise ES6+ modular client engine
│   ├── core/
│   │   ├── app.js                          # Page orchestrator boot, retry delegation & SW registration
│   │   ├── registry.js                     # Concurrent [data-section] mount orchestrator (Promise.allSettled)
│   │   ├── router.js                       # Dynamic data-root base-path resolver & clean URL normalizer
│   │   ├── state.js                        # Lightweight client state for speciesIndex & activeMonograph
│   │   └── animations.js                   # GSAP 3 + ScrollTrigger choreography & IntersectionObserver fallback
│   ├── services/
│   │   ├── api.js                          # Dataset endpoints, kebab-slug validator, sessionStorage cache & fetchers
│   │   ├── herbarium.js                    # Personal Herbarium localStorage persistence & slide-over drawer
│   │   └── seo.js                          # Dynamic meta, OpenGraph, Twitter Card & Schema.org JSON-LD
│   ├── components/
│   │   ├── navbar-compiler.js              # Standalone global navbar, bilingual search & mobile drawer compiler
│   │   ├── footer-compiler.js              # Standalone compact centered footer compiler (#global-footer)
│   │   ├── specimen-not-found.js           # Shared Dark Botanical Luxury 404 & invalid-slug search view
│   │   └── shell.js                        # Universal shell fallback hydrator
│   ├── utils/
│   │   ├── templates.js                    # XSS-safe DOM builders, cards, skeletons & error fallbacks
│   │   ├── navigation.js                   # Home hero autocomplete delegating navbar search to navbar-compiler.js
│   │   ├── glossary-tooltips.js            # Interactive bilingual botanical glossary auto-tooltip engine
│   │   ├── citation-generator.js           # Institutional monograph citation builder (APA | MLA | BibTeX)
│   │   └── telemetry-meters.js             # Chapter 07 pH, sunlight & moisture telemetry visual meters
│   └── views/
│       ├── species-directory.js            # 2-col directory, sticky 10-card pagination, A–Z, category & sort
│       ├── plant-monograph.js              # On-demand 8-chapter monograph, Related Species, Pager & Section Map
│       ├── taxonomy-view.js                # Taxonomic family hierarchy explorer view
│       ├── seasons-view.js                 # 6-Season ecological bloom calendar view
│       └── compare-view.js                 # Dual-iframe split-screen & focus-mode monograph comparator
└── tools/
    └── build-catalog.mjs                   # Catalog integrity check & clean-URL sitemap.xml generator
```

---

## 🔗 Clean Folder-Based Routing & Dynamic Base Resolution

Each route uses an explicit `data-root` attribute on `<html>` (`"./"` at the root `index.html` and `404.html`; `"../"` inside `/species/`, `/plant/`, `/taxonomy/`, `/seasons/`, and `/compare/`), paired with `getRootPath()` and `resolveRootPath()` in `js/core/router.js`:

| Route Path               | HTML Entry File       | `data-root` | Purpose                                                 |
| :----------------------- | :-------------------- | :---------- | :------------------------------------------------------ |
| `/`                      | `index.html`          | `./`        | Home Gateway, Hero Search, Flagship Species & Realms    |
| `/species/`              | `species/index.html`  | `../`       | 2-Column Sticky-Paginated 20-Species Atlas              |
| `/plant/?species=<slug>` | `plant/index.html`    | `../`       | Dynamic 8-Chapter Botanical Monograph & Specimen Plate  |
| `/taxonomy/`             | `taxonomy/index.html` | `../`       | Botanical Family Lineage & Diagnostic Traits Explorer   |
| `/seasons/`              | `seasons/index.html`  | `../`       | Bangladeshi 6-Season (_Shororitu_) Phenology Calendar   |
| `/compare/`              | `compare/index.html`  | `../`       | Dual-Pane Split View & Focus Mode Comparator            |
| `404`                    | `404.html`            | `./`        | `<base>`-anchored "Specimen Not Found" Bilingual Search |

---

## 🧩 Decoupled Global Navbar & Footer Architecture

Every HTML receiver shell mounts semantic landmarks that are compiled automatically at runtime:

```html
<header id="global-navbar" class="global-navbar"></header>
<!-- Page-specific <main> mounts -->
<footer
  id="global-footer"
  class="site-footer site-footer--compact"
  data-footer-variant="compact"
></footer>
```

### 1. Independent Navbar (`./data/config/navbar.json` + `./js/components/navbar-compiler.js`)

- Concurrently fetches `./data/config/navbar.json` and `./data/catalog/species-index.json` via `Promise.allSettled()`.
- Compiles the fixed glassmorphism header (`Home`, `Taxonomy`, `Explore Flora ⌄`, `Calendar`, `Compare`), trailing-slash-normalized `aria-current="page"` state, bilingual (`EN / বাংলা`) autocomplete search bar, Personal Herbarium trigger badge, and responsive full-screen mobile overlay drawer (`<= 1080px`).
- Automatically suppresses shell chrome via `body.is-embed` when `/plant/` is loaded with `?embed=true` inside `/compare/`.

```json
{
  "brand": {
    "title": "Plantipedia",
    "logo": "./assets/images/brand-flower.svg",
    "homeHref": "./"
  },
  "links": [
    {
      "id": "nav-home",
      "label": "Home",
      "href": "./",
      "matchPaths": ["/", "/index.html"]
    },
    {
      "id": "nav-taxonomy",
      "label": "Taxonomy",
      "href": "./taxonomy/",
      "matchPaths": ["/taxonomy/", "/taxonomy"]
    },
    {
      "id": "nav-explore",
      "label": "Explore Flora",
      "href": "./species/",
      "matchPaths": ["/species/", "/species", "/plant/", "/plant"]
    }
  ],
  "search": {
    "placeholder": "Search species (EN / বাংলা)...",
    "minQueryLength": 1,
    "indexSource": "./data/catalog/species-index.json"
  }
}
```

### 2. Independent Compact Centered Footer (`./data/config/footer.json` + `./js/components/footer-compiler.js`)

- Fetches `./data/config/footer.json` independently and compiles the **compact centered single-column footer** (emblem, tagline, summary, attribution credits, ecosystem partners, educational disclaimer, auto-updating copyright year, and smooth Back-to-Top button).

---

## 🌿 Modular Per-Species Architecture & Adding a 21st+ Species

Instead of downloading every botanical monograph up front, Plantipedia separates **discovery metadata** from **deep monographs**:

- **`./data/catalog/species-index.json`** — Lightweight summary records (`slug`, `commonName`, `scientificName`, `localName`, `family`, `plantGroup`, `taxonomicDomain`, `category`, `categories`, `shortSummary`, `thumbnailUrl`, `imageAlt`, `featuredRank`). Cached in `sessionStorage` + memory for instant autocomplete, A–Z filtering, and directory pagination.
- **`./data/species/<slug>.json`** — Full 8-chapter (`00`–`07`) monograph, morphology/cultivation blocks, safety notice, and Schema.org metadata loaded on demand via `./plant/?species=<slug>`.

### 3-Step Workflow to Add a New Species

1. **Create the monograph file** at `./data/species/<lowercase-kebab-slug>.json` (e.g., `./data/species/royal-poinciana.json`) copying the `01`–`07` chapters, `overview`, and `schemaOrg` structure from an existing file such as `./data/species/mango.json`.
2. **Register its summary entry** in `./data/catalog/species-index.json` inside the `species[]` array (and increment `"totalSpecies"`):
   ```json
   {
     "slug": "royal-poinciana",
     "commonName": "Royal Poinciana",
     "scientificName": "Delonix regia",
     "localName": "Krishnochura (কৃষ্ণচূড়া)",
     "family": "Fabaceae",
     "plantGroup": "Angiosperm (Eudicot)",
     "taxonomicDomain": "Tropical Canopy & Ornamentals",
     "category": "Trees & Palms",
     "categories": ["Trees & Palms", "Flowers"],
     "shortSummary": "Flamboyant tropical canopy tree famed for fiery scarlet-orange racemes and feathery bipinnate foliage.",
     "thumbnailUrl": "https://images.pexels.com/photos/...?auto=compress&cs=tinysrgb&w=800",
     "imageAlt": "Scarlet blossoms of Delonix regia in summer bloom",
     "featuredRank": null
   }
   ```
3. **Regenerate `sitemap.xml`** by running `node tools/build-catalog.mjs`. Search, A–Z indexing, category filtering, pagination count, Related Species suggestions, Herbarium bookmarking, and `./plant/?species=royal-poinciana` will work automatically with zero code edits.

---

## 🎨 Zero-Build Tailwind CSS & Modular Cascade (`./styles/`)

Styles load in deterministic cascade order without Node.js compilation:

1. **`./styles/core/` (`variables.css`, `base.css`, `layout.css`)** — Dark Botanical Luxury tokens (`#04140c` canvas, `#071f13` surface, `#10b981` emerald accents, `Playfair Display` / `Plus Jakarta Sans` / `JetBrains Mono`), radial backdrop, scroll progress bar, and fixed glass navbar/footer layout.
2. **`./styles/modules/` (`sections.css`, `components.css`, `pages-responsive.css`)** — Section cards, 2-column `.species-grid--directory` (`<= 768px` 1-column collapse), taxonomy/season frosted glass grids, Herbarium drawer, glossary hover tooltips, compare split-screen controls, sticky pagination bar, print stylesheet, and `<= 1080px` / `<= 1280px` responsive rules.
3. **Tailwind CSS Play CDN + `./styles/tailwind/`**:
   - `tailwind.config.js` configures custom `botanical-*` palette tokens, font families, blurs, and shadows with `corePlugins: { preflight: false }` so custom CSS resets stay intact.
   - `load-tailwind-layers.js` loads the 6 modular `@layer components` sheets (`tw-navbar.css`, `tw-footer.css`, `tw-hero-sections.css`, `tw-grids-cards.css`, `tw-pagination-controls.css`, `tw-monograph-modals.css`) into browser-compiled `<style type="text/tailwindcss">` blocks.

---

## 🚀 Local Setup & Zero-Config GitHub Pages Deployment

> **HTTP Server Required:** Browsers block ES module imports and `fetch()` calls over `file://` due to CORS restrictions. Always serve over HTTP locally.

### Run Locally

- **Option A — VS Code Live Server:** Open `plantipedia/`, right-click `index.html`, and choose **Open with Live Server**.
- **Option B — Python HTTP Server:**
  ```bash
  python3 -m http.server 3000
  ```
  Visit `http://localhost:3000`.
- **Option C — Node.js / Express Server (with syntax & JSON validation):**
  ```bash
  npm install
  npm run lint
  npm run dev
  ```
  Visit `http://localhost:3000`.

### Zero-Config GitHub Pages Deployment

Because all module imports, JSON datasets, Tailwind layer loaders, and assets resolve dynamically via `data-root` and `js/core/router.js` with zero build steps:

1. Push the repository to the `main` branch on GitHub.
2. Open **Settings → Pages** in your repository.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch** (`main`, `/ (root)`), then click **Save**.
4. Your site goes live directly at `https://<username>.github.io/plantipedia/` with clean extensionless routes (`/species/`, `/taxonomy/`, `/seasons/`, `/compare/`, `/plant/?species=<slug>`).

---

## 🤝 Credits & Disclaimer

| Role                                         | Attribution                                                         |
| :------------------------------------------- | :------------------------------------------------------------------ |
| **Chief Patron & Authorization**             | **Jalees Habib**                                                    |
| **Lead Architecture, UI & UX Collaboration** | **Rayaan Tasnim**                                                   |
| **Ecosystem Credits**                        | Special Thanks to **IDAI Universe** \| Powered by **Olympiad Edge** |

Plantipedia is curated strictly for non-commercial educational study. Botanical references and Pexels photography remain the property of their respective owners; medicinal notes do not constitute clinical or medical advice.

<div align="center">

🌺 **Plantipedia** — _Exploring the fascinating world of plants, one species at a time._  
**© 2026 Plantipedia. All rights reserved.**

</div>
