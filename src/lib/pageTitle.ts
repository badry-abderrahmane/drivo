import type { LibraryItem } from "./types";
import { enumeratePages } from "./seo";

/** The shell's own title — what a page with no entry of its own keeps. */
export const DEFAULT_TITLE = "PIPC — Portail Interactif de Physique-Chimie";

let cachedFor: LibraryItem[] | null = null;
let cachedTitles = new Map<string, string>();

/** "/menu/" and "/menu", "%C3%A9" and "é": one key for what is one page. */
function key(path: string): string {
  let p = path.split(/[?#]/)[0];
  try {
    p = decodeURI(p);
  } catch {
    /* malformed escape — match on it as written */
  }
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/**
 * The title the prerender gave this path, so a page reached by in-app navigation wears the
 * same tab title as one loaded cold. Built from `enumeratePages` rather than kept as a
 * second set of rules, and rebuilt only when the library itself is replaced.
 *
 * A document URL whose slug is stale still finds its title through the slug-less alias.
 */
export function pageTitle(path: string, items: LibraryItem[]): string | undefined {
  if (items !== cachedFor) {
    cachedFor = items;
    cachedTitles = new Map(enumeratePages(items).map((p) => [key(p.path), p.title]));
  }
  const k = key(path);
  const exact = cachedTitles.get(k);
  if (exact) return exact;
  const doc = /^\/doc\/([^/]+)/.exec(k);
  return doc ? cachedTitles.get(`/doc/${doc[1]}`) : undefined;
}
