import type { DriveNode, RawRow } from "./types";

export interface RawManifest {
  files: DriveNode[];
  meta: RawRow[];
}

export interface CachedManifest {
  manifest: RawManifest;
  /** When it was stored. `null` for entries written before timestamps existed. */
  savedAt: number | null;
}

const KEY = "drivo:manifest";

export function saveManifestCache(m: RawManifest): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), files: m.files, meta: m.meta }));
  } catch {
    /* quota or unavailable — ignore */
  }
}

/**
 * The stored manifest, with its age so callers can decide what it is good for: painting
 * immediately (only if recent) or standing in for an unreachable backend (any age).
 */
export function loadManifestCache(): CachedManifest | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<{ savedAt: number; files: DriveNode[]; meta: RawRow[] }>;
    if (!Array.isArray(parsed.files) || !Array.isArray(parsed.meta)) return null;
    return {
      manifest: { files: parsed.files, meta: parsed.meta },
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : null,
    };
  } catch {
    return null;
  }
}
