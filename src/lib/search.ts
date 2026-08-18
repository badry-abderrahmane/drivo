import Fuse, { type IFuseOptions } from "fuse.js";
import type { LibraryItem } from "./types";
import { foldText } from "./normalize";
import { aliasesFor } from "../data/chapterAliases";

// The single search engine for the whole app: the command palette's live preview and the
// flat "all results" grid must agree on what counts as a match, or a hit shown in one place
// could vanish from the other for the exact same query.

/** Virtual key: chapter aliases are derived, not stored on the item. */
const ALIAS_KEY = "_aliases";

/** Plain dotted-path read. Written out rather than borrowed from Fuse internals. */
function valueAt(item: LibraryItem, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, k) => (acc == null ? acc : (acc as Record<string, unknown>)[k]), item);
}

function fold(value: unknown): string | string[] {
  if (typeof value === "string") return foldText(value);
  if (Array.isArray(value)) return value.map((v) => foldText(String(v)));
  return "";
}

const FUSE_OPTIONS: IFuseOptions<LibraryItem> = {
  keys: [
    { name: "displayTitle", weight: 0.45 },
    { name: "meta.chapter", weight: 0.3 },
    { name: "meta.tags", weight: 0.1 },
    // The raw Drive filename: a student sent "2bac-sm-ondes.pdf" searches for that,
    // not for the display title an admin later wrote.
    { name: "name", weight: 0.1 },
    { name: ALIAS_KEY, weight: 0.1 },
    { name: "meta.subject", weight: 0.05 },
    { name: "meta.description", weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  // Both sides of the comparison are folded, so "electricite" matches "Électricité"
  // deterministically instead of depending on the fuzzy threshold absorbing the accent.
  getFn: (item, path) => {
    const p = Array.isArray(path) ? path.join(".") : path;
    if (p === ALIAS_KEY) return aliasesFor(item.meta.chapter).map(foldText);
    return fold(valueAt(item, p));
  },
};

export function buildSearchIndex(items: LibraryItem[]): Fuse<LibraryItem> {
  return new Fuse(items, FUSE_OPTIONS);
}

/** Matches, best first. Empty/whitespace-only query returns no results, not everything. */
export function searchItems(index: Fuse<LibraryItem>, query: string): LibraryItem[] {
  const q = foldText(query);
  if (!q) return [];
  return index.search(q).map((r) => r.item);
}
