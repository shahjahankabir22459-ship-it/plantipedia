/**
 * Plantipedia Service Worker — Clean Extensionless Folder-Based Routing Cache
 * Caches core shells, modular stylesheets, ES modules, and Data Lake JSON using relative ./ URLs
 * resolved safely against self.location (compatible with both / and /plantipedia/ GitHub Pages).
 */

const CACHE_VERSION = "plantipedia-v2.0.0";

const CORE_SHELL_PATHS = [
  "./",
  "./species/",
  "./plant/",
  "./taxonomy/",
  "./seasons/",
  "./compare/",
  "./404.html",
  "./manifest.json",
  "./assets/images/brand-flower.svg",
  "./assets/images/placeholder-botanical.svg",
  "./styles/core/variables.css",
  "./styles/core/base.css",
  "./styles/core/layout.css",
  "./styles/modules/sections.css",
  "./styles/modules/components.css",
  "./styles/modules/pages-responsive.css",
  "./styles/tailwind/tailwind.config.js",
  "./styles/tailwind/load-tailwind-layers.js",
  "./js/core/router.js",
  "./js/core/app.js",
  "./js/core/registry.js",
  "./js/core/state.js",
  "./js/core/animations.js",
  "./js/services/api.js",
  "./js/services/herbarium.js",
  "./js/services/seo.js",
  "./js/components/navbar-compiler.js",
  "./js/components/footer-compiler.js",
  "./js/components/specimen-not-found.js",
  "./data/config/navbar.json",
  "./data/config/footer.json",
  "./data/catalog/species-index.json",
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

  // Network-first for HTML pages and JSON data, cache-first for static assets
  const isDataOrNav =
    request.mode === "navigate" ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith("/");

  if (isDataOrNav) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === "navigate") {
              return caches.match(
                new URL("./404.html", self.location.href).href,
              );
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
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
