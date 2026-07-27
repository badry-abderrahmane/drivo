import type { LibraryItem } from "../lib/types";
import type { SaveInput } from "../api";

export interface EditRow {
  fileId: string;
  name: string;
  level: string;
  type: string;
  subject: string;
  chapter: string;
  title: string;
  description: string;
  tags: string; // comma-separated in the editor
  order: number;
}

export function toEditRow(it: LibraryItem): EditRow {
  const m = it.meta;
  return {
    fileId: m.fileId, name: it.name, level: m.level, type: m.type, subject: m.subject,
    chapter: m.chapter, title: m.title, description: m.description, tags: m.tags.join(","), order: m.order,
  };
}

export function toSaveInput(r: EditRow): SaveInput {
  return {
    fileId: r.fileId, level: r.level, type: r.type, subject: r.subject, chapter: r.chapter,
    title: r.title, description: r.description, tags: r.tags, order: Number(r.order) || 0,
  };
}
