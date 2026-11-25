/**
 * Central Clean-URL Base-Path Resolver for Plantipedia Folder-Based Routing
 * Works identically across root index.html (data-root="./"),
 * subfolder routes (/species/, /plant/, /taxonomy/, /seasons/, /compare/ with data-root="../"),
 * 404.html (<base>-anchored), local Live Server, and GitHub Pages (/plantipedia/).
 */

const LEGACY_HTML_ROUTE_MAP = Object.freeze({
  "index.html": "",
  "species.html": "species/",
  "plant.html": "plant/",
  "taxonomy.html": "taxonomy/",
  "seasons.html": "seasons/",
  "compare.html": "compare/",
  "services.html": "services/",
});

export function getRootPath() {
  if (typeof document !== "undefined") {
    const rawRoot = document.documentElement?.dataset?.root;
    if (typeof rawRoot === "string" && rawRoot.trim()) {
      const trimmed = rawRoot.trim();
      return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
    }
  }
  return "./";
}

function normalizeCleanTarget(cleanPath) {
  const match = cleanPath.match(/^([^?#]+)(.*)$/);
  if (!match) return cleanPath;
  const [, pathPart, suffix] = match;
  if (Object.prototype.hasOwnProperty.call(LEGACY_HTML_ROUTE_MAP, pathPart)) {
    return `${LEGACY_HTML_ROUTE_MAP[pathPart]}${suffix}`;
  }
  return cleanPath;
}

export function resolveRootPath(rawPath, fallback = "./") {
  if (typeof rawPath !== "string") return resolveRootPath(fallback);
  const trimmed = rawPath.trim();
  if (!trimmed) return resolveRootPath(fallback);

  if (/^(?:https?:|mailto:|tel:|data:)/i.test(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }

  const root = getRootPath();
  if (trimmed === "." || trimmed === "./" || trimmed === "/") {
    return root;
  }

  const withoutLeading = trimmed.replace(/^(?:\.\.\/|\.\/|\/)+/, "");
  const normalized = normalizeCleanTarget(withoutLeading);
  return `${root}${normalized}`;
}

export function normalizePathnameRoute(pathname) {
  if (!pathname) return "";
  let clean = pathname.replace(/\/index\.html$/i, "/");
  clean = clean.replace(/\.html$/i, "");
  clean = clean.replace(/^\/+|\/+$/g, "");
  return clean;
}
