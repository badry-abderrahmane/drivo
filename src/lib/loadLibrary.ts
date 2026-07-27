import { fetchManifest } from "../api";
import { saveManifestCache, loadManifestCache } from "./cache";
import { buildLibrary } from "./manifest";
import type { LibraryItem } from "./types";

export async function loadLibrary(): Promise<{ items: LibraryItem[]; stale: boolean }> {
  try {
    const m = await fetchManifest();
    saveManifestCache(m);
    return { items: buildLibrary(m.files, m.meta), stale: false };
  } catch (err) {
    const cached = loadManifestCache();
    if (cached) return { items: buildLibrary(cached.files, cached.meta), stale: true };
    throw err;
  }
}
