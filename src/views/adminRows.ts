import type { LibraryItem } from "../lib/types";
import type { SaveInput } from "../api";

export interface EditRow {
  fileId: string;
  name: string;
  mimeType: string; // display-only (drives the file-type icon); not sent on save
  path: string[]; // display-only (Drive folder path); not sent on save
  level: string[]; // multiple levels (multi-select) — shared across branches
  type: string;
  subject: string;
  chapter: string[]; // multiple chapters (multi-select combobox)
  title: string;
  description: string;
  tags: string; // comma-separated in the editor
  order: number;
}

export function toEditRow(it: LibraryItem): EditRow {
  const m = it.meta;
  return {
    fileId: m.fileId, name: it.name, mimeType: it.mimeType, path: it.path,
    level: [...m.level], type: m.type, subject: m.subject,
    chapter: [...m.chapter], title: m.title, description: m.description, tags: m.tags.join(","), order: m.order,
  };
}

export function toSaveInput(r: EditRow): SaveInput {
  return {
    fileId: r.fileId,
    level: r.level.join(";"), // ';' separator — multiple levels (shared across branches)
    type: r.type, subject: r.subject,
    chapter: r.chapter.join(";"), // ';' separator — chapter titles may contain commas
    title: r.title, description: r.description, tags: r.tags, order: Number(r.order) || 0,
  };
}

/** Stable serialization of a row's saved fields; used to detect edits. */
export function saveKey(r: EditRow): string {
  return JSON.stringify(toSaveInput(r));
}

/** Rows whose saved fields differ from the baseline snapshot (keyed by fileId). */
export function changedRows(rows: EditRow[], baseline: Map<string, string>): EditRow[] {
  return rows.filter((r) => baseline.get(r.fileId) !== saveKey(r));
}

/**
 * Suggestions for the display title. Titles are nearly always a chapter name, sometimes
 * with the document type appended, so offer both shapes for the chapters assigned to this
 * file — falling back to the level's official programme when no chapter is set yet.
 */
export function titleSuggestions(
  chapters: string[],
  type: string,
  programme: string[]
): string[] {
  const base = chapters.length > 0 ? chapters : programme;
  const out: string[] = [];
  for (const c of base) {
    if (!c) continue;
    out.push(c);
    if (type) out.push(`${c} — ${type}`);
  }
  return [...new Set(out)];
}

/**
 * A bulk edit. An ABSENT key means "ne pas changer"; a PRESENT key is applied even when
 * its value is empty, which is how "vider ce champ" is expressed. Never branch on
 * truthiness here — that would make clearing a field impossible.
 */
export interface BulkPatch {
  level?: string[];
  type?: string;
  subject?: string;
  chapter?: string[];
}

/**
 * Apply `patch` to every row whose fileId is in `ids`, in place. List fields are replaced
 * (never merged) and cloned, so patched rows never share an array. Returns the number of
 * rows touched.
 */
export function applyBulkPatch(rows: EditRow[], ids: Set<string>, patch: BulkPatch): number {
  let touched = 0;
  for (const r of rows) {
    if (!ids.has(r.fileId)) continue;
    if (patch.level !== undefined) r.level = [...patch.level];
    if (patch.type !== undefined) r.type = patch.type;
    if (patch.subject !== undefined) r.subject = patch.subject;
    if (patch.chapter !== undefined) r.chapter = [...patch.chapter];
    touched++;
  }
  return touched;
}
