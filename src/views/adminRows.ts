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
