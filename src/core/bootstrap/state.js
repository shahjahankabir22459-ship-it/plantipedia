/**
 * Centralized reactive-lite client state for Plantipedia multi-page JSON hydration.
 */

const initialMountState = () => ({
  status: "idle", // "idle" | "loading" | "ready" | "error"
  error: null,
});

export const appState = {
  speciesIndex: [],
  activeMonograph: null,
  mounts: {},
};

export function setMountState(mountKey, patch) {
  const prev = appState.mounts[mountKey] || initialMountState();
  appState.mounts[mountKey] = {
    ...prev,
    ...patch,
  };
}

export function getMountState(mountKey) {
  return appState.mounts[mountKey] || initialMountState();
}

export function setSpeciesIndex(speciesList) {
  appState.speciesIndex = Array.isArray(speciesList) ? speciesList : [];
}

export function getSpeciesIndex() {
  return appState.speciesIndex;
}

// Backward-compatible aliases
export const setSpeciesCatalog = setSpeciesIndex;
export const getSpeciesCatalog = getSpeciesIndex;

export function setActiveMonograph(monograph) {
  appState.activeMonograph = monograph || null;
}

export function getActiveMonograph() {
  return appState.activeMonograph;
}
