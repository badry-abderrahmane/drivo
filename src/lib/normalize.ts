/**
 * The single definition of "the same text" for both search matching and URL slugs:
 * diacritics removed, lowercased, whitespace collapsed. Non-latin scripts (Arabic
 * chapter aliases) pass through untouched — they carry no combining marks to strip.
 */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
