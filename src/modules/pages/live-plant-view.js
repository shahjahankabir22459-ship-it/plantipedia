import { createEl } from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { renderPlantMonograph } from "./plant-monograph.js";
import {
  fetchFromGlobalBotanicalServer,
  getCachedGlobalMonograph,
  normalizeGlobalQuery,
  runGlobalServerTelemetry,
} from "../../engines/global-server/global-botanical-server.js";
import { applyPageSeo } from "../utils/seo.js";

function renderLiveQueryPrompt(mountEl, { initialQuery = "", aborted = false } = {}) {
  try {
    applyPageSeo({
      title: "Global Botanical Server — Live Taxon Query | Plantipedia",
      description: "Query any worldwide plant species from the Global Botanical Server and render a live 8-chapter Plantipedia monograph.",
      canonicalFile: "plant/live/",
    });
  } catch {
    // Non-blocking
  }

  const shell = createEl("div", "gbs-live-prompt-shell");
  const card = createEl("section", "gbs-live-prompt-card glass-panel");
  card.setAttribute("aria-label", "Global Botanical Server query");

  card.appendChild(createEl("span", "global-flora-badge", "GLOBAL FLORA INDEX"));
  card.appendChild(
    createEl("h1", "gbs-live-prompt-title", "Global Botanical Server"),
  );
  card.appendChild(
    createEl(
      "p",
      "gbs-live-prompt-copy",
      aborted
        ? "Live botanical query aborted cleanly. Enter a different plant name (English, Latin, or বাংলা) below to resume."
        : "Query any plant species worldwide by common name, Linnaean binomial, or Bengali nomenclature to synthesize a live Plantipedia monograph.",
    ),
  );

  const form = createEl("form", "gbs-live-search-form");
  form.setAttribute("role", "search");

  const input = document.createElement("input");
  input.type = "search";
  input.className = "gbs-live-search-input";
  input.placeholder = "Enter plant name (e.g., Lavender, Baobab, গোলাপ)...";
  input.value = initialQuery;
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Query Global Botanical Server");

  const submitBtn = createEl(
    "button",
    "compare-submit-btn gbs-live-submit-btn",
    "Fetch Monograph →",
  );
  submitBtn.type = "submit";

  form.appendChild(input);
  form.appendChild(submitBtn);
  card.appendChild(form);

  const actions = createEl("div", "gbs-live-prompt-actions");
  const atlasLink = createEl("a", "specimen-nf-btn specimen-nf-btn--secondary", "Browse 50 Curated Species");
  atlasLink.href = resolveRootPath("./species/");
  const compareLink = createEl("a", "specimen-nf-btn specimen-nf-btn--secondary", "Open Compare Split View");
  compareLink.href = resolveRootPath("./compare/");
  actions.appendChild(atlasLink);
  actions.appendChild(compareLink);
  card.appendChild(actions);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nextQ = normalizeGlobalQuery(input.value);
    if (!nextQ) {
      input.focus();
      return;
    }
    const targetUrl = resolveRootPath(`./plant/live/?q=${encodeURIComponent(nextQ)}`);
    window.location.href = targetUrl;
  });

  shell.appendChild(card);
  mountEl.replaceChildren(shell);
}

function redirectToSmart404(reason, query) {
  const params = new URLSearchParams({
    reason: reason || "invalid",
    q: query || "",
    from: "live",
  });
  const target = resolveRootPath(`./404.html?${params.toString()}`);
  window.location.replace(target);
}

function renderEmbedErrorNotice(mountEl, reason, query) {
  const box = createEl("div", "app-error-state");
  box.setAttribute("role", "alert");
  box.appendChild(
    createEl(
      "span",
      "specimen-not-found-badge",
      reason === "network" ? "GLOBAL SERVER CONNECTION FAILED" : "UNRECOGNIZED BOTANICAL SPECIMEN",
    ),
  );
  box.appendChild(
    createEl(
      "h2",
      "",
      reason === "network" ? "Network Connection Failed" : "Unrecognized Botanical Specimen",
    ),
  );
  box.appendChild(
    createEl(
      "p",
      "",
      reason === "network"
        ? `Unable to reach the Global Botanical Server after multiple attempts while searching for "${query}".`
        : `"${query}" is not a real plant species or recognized botanical taxon in the Global Botanical Server.`,
    ),
  );
  mountEl.replaceChildren(box);
}

export async function renderLiveMonographView(mountEl, { pageData, speciesIndex, glossaryData }) {
  if (!mountEl || !pageData) return;

  const params = new URLSearchParams(window.location.search);
  const rawQuery = normalizeGlobalQuery(params.get("q") || params.get("species") || "");
  const isEmbed =
    params.get("embed") === "true" ||
    document.body.classList.contains("is-embed");
  const isCachedFlag = params.get("cached") === "1";

  if (!rawQuery) {
    renderLiveQueryPrompt(mountEl);
    return;
  }

  // If pre-fetched & validated by Compare View (or already cached in sessionStorage), render immediately
  const cachedPlant = getCachedGlobalMonograph(rawQuery);
  if (cachedPlant && isCachedFlag) {
    renderPlantMonograph(mountEl, {
      pageData,
      speciesIndex,
      plant: cachedPlant,
      requestedSlug: rawQuery,
      glossaryData,
    });
    return;
  }

  const hostShell = createEl("div", "detail-container gbs-live-telemetry-host");
  mountEl.replaceChildren(hostShell);

  const outcome = await runGlobalServerTelemetry({
    container: hostShell,
    queryLabel: rawQuery,
    work: ({ signal, onRetry }) =>
      fetchFromGlobalBotanicalServer(rawQuery, { signal, onRetry }),
    onAbort: () => {
      renderLiveQueryPrompt(mountEl, { initialQuery: rawQuery, aborted: true });
    },
  });

  if (outcome.aborted) {
    return;
  }

  const res = outcome.result;
  if (res?.ok && res.monograph) {
    renderPlantMonograph(mountEl, {
      pageData,
      speciesIndex,
      plant: res.monograph,
      requestedSlug: rawQuery,
      glossaryData,
    });
    return;
  }

  const failureReason = res?.reason || "invalid";
  if (isEmbed) {
    renderEmbedErrorNotice(mountEl, failureReason, rawQuery);
  } else {
    redirectToSmart404(failureReason, rawQuery);
  }
}
