import Fuse, { type IFuseOptions } from "fuse.js";
import { foldText } from "../lib/normalize";
import type { EditRow } from "./adminRows";

/**
 * Fuzzy search for the admin worklist.
 *
 * Deliberately separate from src/lib/search.ts, which serves students. The two have
 * different jobs: a student is discovering material, so title and chapter dominate there
 * and Arabic chapter aliases are indexed; an admin is hunting a file to classify, so the
 * raw Drive filename matters most and the classification fields (Niveau, Type) are how a
 * worklist gets narrowed. Sharing one index would mean a tweak for students silently
 * changing this behaviour. Only `foldText` is shared, and that is a string utility.
 */

/** Weighted so the Drive filename wins: often it is all an unclassified file has. */
const FUSE_OPTIONS: IFuseOptions<EditRow> = {
  keys: [
    { name: "name", weight: 0.3 },
    { name: "title", weight: 0.25 },
    { name: "chapter", weight: 0.15 },
    { name: "subject", weight: 0.1 },
    { name: "type", weight: 0.08 },
    { name: "level", weight: 0.07 },
    { name: "tags", weight: 0.03 },
    { name: "description", weight: 0.02 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  // Both sides folded, so "electricite" matches "Électricité" deterministically rather
  // than relying on the fuzzy threshold to absorb the accent.
  getFn: (row, path) => {
    const key = (Array.isArray(path) ? path.join(".") : path) as keyof EditRow;
    const value = row[key];
    if (typeof value === "string") return foldText(value);
    if (Array.isArray(value)) return value.map((v) => foldText(String(v)));
    return "";
  },
};

export function buildAdminIndex(rows: EditRow[]): Fuse<EditRow> {
  return new Fuse(rows, FUSE_OPTIONS);
}

/**
 * Rows matching the query, best first. An empty query returns every row: this filters a
 * worklist the admin is working through, unlike the student palette where an empty query
 * means "nothing to show yet".
 */
export function searchRows(rows: EditRow[], query: string, index?: Fuse<EditRow>): EditRow[] {
  const q = foldText(query);
  if (!q) return rows;
  return (index ?? buildAdminIndex(rows)).search(q).map((r) => r.item);
}
