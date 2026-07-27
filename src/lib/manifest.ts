import type { DriveNode, RawRow, MetaRow, LibraryItem } from "./types";

export function parseTags(s: string): string[] {
  return s ? s.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

// Chapters use ';' as the separator (not ',') because several official chapter
// titles contain commas, e.g. "Noyaux, masse et énergie".
export function parseChapters(s: string): string[] {
  return s ? s.split(";").map((c) => c.trim()).filter(Boolean) : [];
}

export function normalizeMeta(raw: Partial<RawRow> & { fileId: string }): MetaRow {
  const rawTags = (raw as RawRow).tags;
  const rawChapter = (raw as RawRow).chapter;
  const order = Number(raw.order);
  return {
    fileId: raw.fileId,
    level: raw.level ?? "",
    type: raw.type ?? "",
    subject: raw.subject ?? "",
    chapter: Array.isArray(rawChapter) ? rawChapter : parseChapters(rawChapter ?? ""),
    title: raw.title ?? "",
    description: raw.description ?? "",
    tags: Array.isArray(rawTags) ? rawTags : parseTags(rawTags ?? ""),
    order: Number.isFinite(order) ? order : 0,
  };
}

export function buildLibrary(
  nodes: DriveNode[],
  meta: (RawRow | MetaRow)[]
): LibraryItem[] {
  const byId = new Map<string, MetaRow>();
  for (const m of meta) byId.set(m.fileId, normalizeMeta(m as RawRow));
  return nodes
    .filter((n) => !n.isFolder)
    .map((n) => {
      const m = byId.get(n.fileId) ?? normalizeMeta({ fileId: n.fileId });
      return { ...n, meta: m, displayTitle: m.title || n.name };
    });
}
