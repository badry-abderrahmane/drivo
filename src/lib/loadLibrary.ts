import { fetchManifest } from "../api";
import { saveManifestCache, loadManifestCache } from "./cache";
import { buildLibrary } from "./manifest";
import type { LibraryItem } from "./types";

/**
 * How old a cached manifest may be and still be painted immediately. Matches the backend's
 * own cache TTL, so the client is never more permissive than the server.
 */
export const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * A cached library young enough to render right away, or null. Used for first paint so the
 * page never waits on the backend when it already has a recent copy; the caller is expected
 * to refresh in the background afterwards.
 */
export function readFreshCache(maxAgeMs: number = CACHE_MAX_AGE_MS): LibraryItem[] | null {
  const cached = loadManifestCache();
  if (!cached || cached.savedAt === null) return null;
  const age = Date.now() - cached.savedAt;
  // A negative age means the clock moved; treat it as untrustworthy rather than fresh.
  if (age < 0 || age > maxAgeMs) return null;
  return buildLibrary(cached.manifest.files, cached.manifest.meta);
}

export async function loadLibrary(): Promise<{ items: LibraryItem[]; stale: boolean }> {
  try {
    const m = await fetchManifest();
    saveManifestCache(m);
    return { items: buildLibrary(m.files, m.meta), stale: false };
  } catch (err) {
    // Any age will do here: an old copy beats a blank page when the backend is unreachable.
    const cached = loadManifestCache();
    if (cached) return { items: buildLibrary(cached.manifest.files, cached.manifest.meta), stale: true };
    throw err;
  }
}
