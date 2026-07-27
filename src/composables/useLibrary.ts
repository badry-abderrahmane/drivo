import { ref } from "vue";
import { loadLibrary } from "../lib/loadLibrary";
import type { LibraryItem } from "../lib/types";

const items = ref<LibraryItem[]>([]);
const loading = ref(false);
const stale = ref(false);
const error = ref<string | null>(null);
let loadedOnce = false;

async function run(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const { items: got, stale: s } = await loadLibrary();
    items.value = got;
    stale.value = s;
    loadedOnce = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

export function useLibrary() {
  async function ensureLoaded(): Promise<void> {
    if (loadedOnce || loading.value) return;
    await run();
  }
  async function reload(): Promise<void> {
    await run();
  }
  return { items, loading, stale, error, ensureLoaded, reload };
}
