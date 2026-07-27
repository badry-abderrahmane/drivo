import type { DriveNode, RawRow } from "./types";

export interface RawManifest {
  files: DriveNode[];
  meta: RawRow[];
}

const KEY = "drivo:manifest";

export function saveManifestCache(m: RawManifest): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* quota or unavailable — ignore */
  }
}

export function loadManifestCache(): RawManifest | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RawManifest;
  } catch {
    return null;
  }
}
