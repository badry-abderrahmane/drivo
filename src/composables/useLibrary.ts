import { ref } from "vue";
import { loadLibrary, readFreshCache, fetchSeed } from "../lib/loadLibrary";
import type { LibraryItem } from "../lib/types";

const items = ref<LibraryItem[]>([]);
/** A blocking load: nothing to show yet. */
const loading = ref(false);
/** A background refresh behind already-rendered cached data. */
const refreshing = ref(false);
const stale = ref(false);
const error = ref<string | null>(null);
let loadedOnce = false;

// Shared so a background refresh and a concurrent view mounting cannot both fetch.
let inFlight: Promise<void> | null = null;

function networkLoad(): Promise<void> {
  if (!inFlight) {
    inFlight = (async () => {
      try {
        const { items: got, stale: s } = await loadLibrary();
        items.value = got;
        stale.value = s;
        error.value = null;
        loadedOnce = true;
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
      } finally {
        inFlight = null;
      }
    })();
  }
  return inFlight;
}

/**
 * Paint from a recent cached copy immediately and refresh behind it; otherwise do a normal
 * blocking load. The backend is ~0.5s warm but can take ~50s on a cache miss, so a returning
 * visitor should never be made to wait for it.
 */
async function run(): Promise<void> {
  const cached = readFreshCache();
  if (cached) {
    items.value = cached;
    stale.value = false;
    loadedOnce = true;
    refreshing.value = true;
    void networkLoad().finally(() => {
      refreshing.value = false;
    });
    return;
  }
  // No cache: paint from the build-time seed (a static CDN file, ~100ms) rather than
  // blocking on the backend, which is ~0.5s warm but can take ~50s on a cache miss.
  const seeded = await fetchSeed();
  if (seeded) {
    items.value = seeded;
    stale.value = false;
    loadedOnce = true;
    refreshing.value = true;
    void networkLoad().finally(() => {
      refreshing.value = false;
    });
    return;
  }

  loading.value = true;
  try {
    await networkLoad();
  } finally {
    loading.value = false;
  }
}

export function useLibrary() {
  async function ensureLoaded(): Promise<void> {
    if (loadedOnce || loading.value) return;
    await run();
  }
  /** Force a network load, bypassing the cache (used after a reindex). */
  async function reload(): Promise<void> {
    loading.value = true;
    try {
      await networkLoad();
    } finally {
      loading.value = false;
    }
  }
  return { items, loading, refreshing, stale, error, ensureLoaded, reload };
}
