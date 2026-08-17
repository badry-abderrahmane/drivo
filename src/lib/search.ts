import Fuse, { type IFuseOptions } from "fuse.js";
import type { LibraryItem } from "./types";

// The single search engine for the whole app: the command palette's live preview and the
// flat "all results" grid must agree on what counts as a match, or a hit shown in one place
// could vanish from the other for the exact same query.
const FUSE_OPTIONS: IFuseOptions<LibraryItem> = {
  keys: [
    { name: "displayTitle", weight: 0.5 },
    { name: "meta.chapter", weight: 0.3 },
    { name: "meta.tags", weight: 0.15 },
    { name: "meta.subject", weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function buildSearchIndex(items: LibraryItem[]): Fuse<LibraryItem> {
  return new Fuse(items, FUSE_OPTIONS);
}

/** Matches, best first. Empty/whitespace-only query returns no results, not everything. */
export function searchItems(index: Fuse<LibraryItem>, query: string): LibraryItem[] {
  const q = query.trim();
  if (!q) return [];
  return index.search(q).map((r) => r.item);
}
