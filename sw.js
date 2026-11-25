/**
 * Plantipedia Service Worker — Clean Extensionless Folder-Based Routing Cache
 * Caches core shells, modular stylesheets, ES modules, and Data Lake JSON using relative ./ URLs
 * resolved safely against self.location (compatible with both / and /plantipedia/ GitHub Pages).
 */

const CACHE_VERSION = "plantipedia-v5.2.0";

const CORE_SHELL_PATHS = [
  "./",
  "./species/",
  "./plant/",
  "./plant/live/",
  "./taxonomy/",
  "./seasons/",
  "./compare/",
  "./compare/result/",
  "./services/",
  "./404.html",
  "./manifest.json",
  "./assets/images/brand-flower.svg",
  "./assets/images/placeholder-botanical.svg",
  "./styles/base/variables.css",
  "./styles/base/base.css",
  "./styles/base/layout.css",
  "./styles/components/sections.css",
  "./styles/components/components.css",
  "./styles/pages/pages-responsive.css",
  "./styles/pages/services.css",
  "./styles/print/field-sheets.css",
  "./styles/tailwind/tailwind.config.js",
  "./styles/tailwind/load-tailwind-layers.js",
  "./src/core/bootstrap/router.js",
  "./src/core/bootstrap/app.js",
  "./src/core/bootstrap/registry.js",
  "./src/core/bootstrap/state.js",
  "./src/core/telemetry/animations.js",
  "./src/core/telemetry/telemetry-stats.js",
  "./src/core/telemetry/telemetry-meters.js",
  "./src/core/compilers/navbar-compiler.js",
  "./src/core/compilers/footer-compiler.js",
  "./src/core/compilers/specimen-not-found.js",
  "./src/engines/global-server/api.js",
  "./src/engines/global-server/global-botanical-server.js",
  "./src/engines/comparator/synthesis-overlay.js",
  "./src/modules/pages/services-controller.js",
  "./src/modules/utils/herbarium.js",
  "./src/modules/utils/seo.js",
  "./config/navbar.json?v=50",
  "./config/footer.json?v=50",
  "./config/environment.json",
  "./config/routes.json",
  "./data/index/species-index.json?v=50",
  "./data/index/pages/services.json?v=50",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        Promise.allSettled(
          CORE_SHELL_PATHS.map((rel) =>
            cache.add(new URL(rel, self.location.href).href),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML, JSON data, JS modules, and CSS; cache-first for static media
  const isDataOrNav =
    request.mode === "navigate" ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/");

  if (isDataOrNav) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === "navigate") {
              return caches.match(new URL("./404.html", self.location.href).href);
            }
            return Response.error();
          }),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
