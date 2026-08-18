import { foldText } from "./normalize";

/** URL segment for a French label: "2ème Bac SM" -> "2eme-bac-sm". */
export function slugify(s: string): string {
  return foldText(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The label whose slug is `slug`, or null. Resolution is a lookup against real data,
 * never an attempt to un-slugify: an unknown slug must produce a clean not-found
 * rather than a plausible-looking guess.
 */
export function resolveSlug(slug: string, candidates: string[]): string | null {
  if (!slug) return null;
  return candidates.find((c) => slugify(c) === slug) ?? null;
}
