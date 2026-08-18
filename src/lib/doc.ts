import type { LibraryItem } from "./types";
import { isClassified } from "./classification";
import { slugify } from "./slug";

/** Documents in the same chapter, shown at the bottom of a document page. */
const RELATED_LIMIT = 8;

/**
 * The published document with this id, or null. An unclassified file resolves to null
 * exactly like an unknown id: a direct URL must not become a side door to a file that is
 * deliberately absent from every other student-facing view.
 */
export function findDoc(items: LibraryItem[], fileId: string): LibraryItem | null {
  const found = items.find((it) => it.fileId === fileId);
  return found && isClassified(found.meta) ? found : null;
}

/**
 * Published siblings sharing at least one level AND at least one chapter with `item`,
 * excluding itself. These links are what a student browses next, and they are also the
 * internal link graph a crawler follows from any single indexed page into the library.
 */
export function relatedDocs(
  items: LibraryItem[],
  item: LibraryItem,
  limit: number = RELATED_LIMIT
): LibraryItem[] {
  return items
    .filter(
      (it) =>
        it.fileId !== item.fileId &&
        isClassified(it.meta) &&
        it.meta.level.some((l) => item.meta.level.includes(l)) &&
        it.meta.chapter.some((c) => item.meta.chapter.includes(c))
    )
    .slice(0, limit);
}

/** The decorative, human-readable half of a document URL. */
export function docSlug(item: LibraryItem): string {
  return slugify(item.displayTitle);
}
