import type { LibraryItem } from "./types";

export interface Filters {
  level?: string;
  type?: string;
  subject?: string;
  chapter?: string;
  search?: string;
}

export function applyFilters(items: LibraryItem[], f: Filters): LibraryItem[] {
  const q = (f.search ?? "").trim().toLowerCase();
  return items.filter((it) => {
    if (f.level && !it.meta.level.includes(f.level)) return false;
    if (f.type && it.meta.type !== f.type) return false;
    if (f.subject && it.meta.subject !== f.subject) return false;
    if (f.chapter && !it.meta.chapter.includes(f.chapter)) return false;
    if (q) {
      const hay = (it.displayTitle + " " + it.meta.tags.join(" ")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
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
