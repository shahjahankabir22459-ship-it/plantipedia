<div align="center">

# 🌿 Plantipedia — Digital Botanical Archive & Worldwide Flora Engine

**A scholarly, bilingual (`EN / বাংলা`) botanical encyclopedia pairing 50 ultra-fast local monographs with a zero-key Worldwide Botanical Server Gateway across 390,000+ global flora taxa.**

![Version 3.0](https://img.shields.io/badge/Platform-Version%203.0-10b981?style=flat-square)
![Curated Monographs](https://img.shields.io/badge/Local%20Monographs-50%20Species%20%C2%B7%2034%20Families-34d399?style=flat-square)
![Worldwide Gateway](https://img.shields.io/badge/Global%20Server-390%2C000%2B%20Taxa-22d3ee?style=flat-square)
![Bilingual Support](https://img.shields.io/badge/Bilingual-EN%20%2F%20%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE-fbbf24?style=flat-square)
![Zero-Build Static Web](https://img.shields.io/badge/Runtime-Zero--Build%20ES6%2B%20Static%20Web-2dd4bf?style=flat-square)

</div>

---

## Architectural Evolution: Version 1.0 → 2.0 → 3.0

Plantipedia has evolved through three deliberate engineering generations—transforming a handful of static plant sheets into an enterprise-layered botanical research platform:

| Generation | Milestone & Scope | Engineering Architecture |
| :--- | :--- | :--- |
| **Version 1.0** | **6 Foundational Plant Pages** | Early hand-authored HTML monographs establishing Plantipedia's emerald aesthetic, Linnaean classification tables, and Bengali vernacular pairing. |
| **Version 2.0** | **30 Curated Species · JSON Engine** | Transitioned to a centralized JSON-driven rendering pipeline with bilingual `EN / বাংলা` instant search, A–Z directory filtering, and shared header/footer shell compilers. |
| **Version 3.0** | **50 Local Monographs + Global Flora Platform** | Enterprise multi-layered ES6+ architecture uniting **50 ultra-fast local 8-chapter monographs** across **34 families**, a **Zero-Key Global Botanical Server Gateway** (390,000+ taxa), a **3-Stage Split Specimen Comparator**, a **10-Section Services Research Suite**, **GSAP ScrollTrigger telemetry**, **Schema.org `Taxon` JSON-LD**, and **A4 print-ready PDF field sheets**. |

---

## Core Platform Capabilities

- **50 Curated 8-Chapter Monographs (`/plant/`):** Standardized scientific chapters (`00–07`) covering morphology, taxonomy, native habitat, ecology, medicinal value, cultivation telemetry, and cultural context—enriched with jewel-tone card tokens, GSAP-animated soil pH & thermal telemetry meters, APA/MLA/BibTeX citation exports, and interactive glossary tooltips.
- **Zero-Key Global Botanical Server Gateway (`/plant/live/`):** Real-time worldwide flora query engine featuring expedition chips, automated taxonomic rank parsing, 5-second telemetry synthesis with abort control, retry recovery, and smart `404.html` diagnostics.
- **Split Specimen Comparator (`/compare/` & `/compare/result/`):** Dual-pane comparison studio supporting local monographs and live Global Server fetches, enhanced with a **3-second, 3-stage Comparison Synthesis Labor Illusion** (`Taxonomy → Telemetry → Matrix Assembly`), interactive **Cancel** abort control, and a distraction-free, footer-free split matrix output.
- **10-Section Digital Research Suite (`/services/`):** Floating **Map Matrix** full-screen navigation overlay with scroll-spy tracking, filterable platform capability matrix, interactive SVG taxonomy & 6-season charts, **4-Step Synthesis Pipeline** inspector, **Screen vs. Print Field-Sheet Studio** preview, and live citation/glossary sandboxes.
- **Taxonomic Explorer & 6-Season *Shororitu* Calendar (`/taxonomy/` & `/seasons/`):** Filter across **34 botanical families** or track seasonal blooming, fruiting, and harvest cycles across Bangladesh's six ecological seasons (*গ্রীষ্ম, বর্ষা, শরৎ, হেমন্ত, শীত, বসন্ত*).
- **Personal Herbarium & Offline PWA (`sw.js`):** Local browser bookmark drawer (`My Herbarium`), instant bilingual `EN / বাংলা / Latin` search, and network-first Service Worker offline caching.

---

## High-Level Module Architecture

Plantipedia enforces strict separation of concerns across modular domain layers:

- **`config/`** — Declarative environment manifests, route registries, jewel-tone botanical palette tokens, and navigation/footer shell schemas.
- **`data/`** — Three-tier botanical data lake split into `data/index/` (master 50-species index, glossary, taxonomy & page configs), `data/monographs/` (50 individual 8-chapter species JSON files), and `data/phenology/` (6-season Bengali *Shororitu* dataset).
- **`src/core/`** — Bootstrap lifecycle (`bootstrap/`), autonomous navbar/footer/404 compilers (`compilers/`), and GSAP ScrollTrigger telemetry engines (`telemetry/`).
- **`src/engines/`** — Bilingual search & navigation (`search/`), validated dataset & Global Botanical Server gateway (`global-server/`), 3-stage comparison synthesis overlay (`comparator/`), and citation/glossary processors (`citation/`).
- **`src/modules/`** — Dedicated controllers for every route (`pages/`) alongside SEO JSON-LD, herbarium storage, and template helpers (`utils/`).
- **`styles/`** — Layered stylesheets organized into `base/`, `components/`, `pages/` (with dedicated `services.css`), `print/` (`field-sheets.css`), and `tailwind/`.
- **`docs/`** — Technical system architecture (`ARCHITECTURE.md`) and JSON data contract reference (`SCHEMA-GUIDE.md`).

---

## Local Development & Verification

Plantipedia runs with zero bundler overhead:

```bash
# Install static server dependency and launch on port 3000
npm install && npm run dev

# Validate all ES modules, JSON configs, and botanical monographs
npm run lint

# Verify catalog integrity across all 50 monographs and regenerate sitemap.xml
node tools/build-catalog.mjs
```

---

## Credits & Educational Disclaimer

- **Chief Patron & Authorization:** **Jalees Habib**
- **Lead Architecture, UI & UX Collaboration:** **Rayaan Tasnim**
- **Special Thanks:** **IDAI Universe**
- **Powered by:** **Olympiad Edge**

*Educational & Botanical Disclaimer: All monographs, taxonomic classifications, phytochemical summaries, Global Botanical Server records, and curated botanical photography on Plantipedia are provided strictly for non-commercial educational and botanical reference purposes and do not constitute clinical, agricultural, or medical advice.*

<div align="center">

🌺 **Plantipedia** — *Exploring the fascinating world of plants, one species at a time.*  
**© 2026 Plantipedia. All rights reserved.**

</div>
