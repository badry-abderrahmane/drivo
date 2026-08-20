import type { LibraryItem } from "./types";
import { buildSearchIndex, searchItems } from "./search";

export interface Filters {
  level?: string;
  type?: string;
  subject?: string;
  chapter?: string;
  search?: string;
}

/**
 * Copies `source` onto the reactive `target`, key by key — including the keys `source`
 * does not have, which are set back to undefined.
 *
 * Object.assign is the trap this exists to avoid: a parent clearing its filters passes a
 * bare `{}`, which has no keys at all, so Object.assign would leave every stale value in
 * place. The controls would keep displaying filters that no longer filter anything, and
 * the next edit would re-apply them.
 */
export function syncFilters(target: Filters, source: Filters): void {
  target.level = source.level;
  target.type = source.type;
  target.subject = source.subject;
  target.chapter = source.chapter;
  target.search = source.search;
}

// Structural filters (level/type/subject/chapter) narrow the set first; a search term then
// ranks *that* set via the same fuzzy engine the search palette previews with, so a result
// shown there is guaranteed to still be here for the same query.
export function applyFilters(items: LibraryItem[], f: Filters): LibraryItem[] {
  const narrowed = items.filter((it) => {
    if (f.level && !it.meta.level.includes(f.level)) return false;
    if (f.type && it.meta.type !== f.type) return false;
    if (f.subject && it.meta.subject !== f.subject) return false;
    if (f.chapter && !it.meta.chapter.includes(f.chapter)) return false;
    return true;
  });
  const q = f.search ?? "";
  if (!q.trim()) return narrowed;
  return searchItems(buildSearchIndex(narrowed), q);
}

export function sortItems(items: LibraryItem[]): LibraryItem[] {
  return [...items].sort(
    (a, b) =>
      a.meta.order - b.meta.order ||
      a.displayTitle.localeCompare(b.displayTitle, "fr")
  );
}

export function distinctValues(
  items: LibraryItem[],
  key: "type" | "subject"
): string[] {
  const set = new Set<string>();
  for (const it of items) if (it.meta[key]) set.add(it.meta[key]);
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

/** Distinct values of a list-valued field across all items. */
function distinctList(items: LibraryItem[], key: "level" | "chapter"): string[] {
  const set = new Set<string>();
  for (const it of items) for (const v of it.meta[key]) if (v) set.add(v);
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

export const distinctChapters = (items: LibraryItem[]): string[] => distinctList(items, "chapter");
export const distinctLevels = (items: LibraryItem[]): string[] => distinctList(items, "level");
