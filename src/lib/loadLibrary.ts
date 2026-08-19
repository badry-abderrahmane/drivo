import { fetchManifest } from "../api";
import { saveManifestCache, loadManifestCache, type RawManifest } from "./cache";
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

/**
 * The build-time copy of the manifest, emitted next to the app by scripts/prerender.ts.
 * Built from BASE_URL rather than hardcoded so it survives a base-path change.
 */
export const SEED_URL = `${import.meta.env.BASE_URL}library-seed.json`;

/**
 * The seeded library, or null if it is missing or unusable. Deliberately NOT written to
 * localStorage: the seed is as old as the last deploy, and persisting it would let
 * deploy-time data masquerade as a real cached copy for the full 6h TTL. It is good
 * enough to paint with for one second while the backend answers, and no longer.
 */
export async function fetchSeed(): Promise<LibraryItem[] | null> {
  try {
    const res = await fetch(SEED_URL);
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<RawManifest>;
    if (!Array.isArray(raw.files) || !Array.isArray(raw.meta)) return null;
    return buildLibrary(raw.files, raw.meta);
  } catch {
    return null;
  }
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
