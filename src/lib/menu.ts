import type { LibraryItem } from "./types";
import { LEVELS, TYPES } from "../config";
import { chaptersFor } from "../data/chapters";

export interface MenuCell {
  type: string;
  files: LibraryItem[];
}
export interface MenuRow {
  chapter: string;
  cells: MenuCell[]; // aligned with LevelMenu.types
}
export interface MenuSection {
  subject: string;
  rows: MenuRow[];
}
export interface LevelMenu {
  level: string;
  types: string[]; // columns
  sections: MenuSection[];
}

const SUBJECT_ORDER = ["Physique", "Chimie", "Physique & Chimie"];

/** A file is menu-ready only when title, level, type, subject and ≥1 chapter are set. */
export function isMenuReady(it: LibraryItem): boolean {
  const m = it.meta;
  return !!(m.title && m.level && m.type && m.subject && m.chapter.length > 0);
}

function levelRank(level: string): number {
  const i = LEVELS.indexOf(level);
  return i >= 0 ? i : LEVELS.length;
}

export function levelsWithMenu(items: LibraryItem[]): string[] {
  const set = new Set<string>();
  for (const it of items) if (isMenuReady(it)) set.add(it.meta.level);
  return [...set].sort(
    (a, b) => levelRank(a) - levelRank(b) || a.localeCompare(b, "fr")
  );
}

function subjectRank(subject: string): number {
  const i = SUBJECT_ORDER.indexOf(subject);
  return i >= 0 ? i : SUBJECT_ORDER.length;
}

function typeRank(type: string): number {
  const i = TYPES.indexOf(type);
  return i >= 0 ? i : TYPES.length;
}

export function buildLevelMenu(items: LibraryItem[], level: string): LevelMenu {
  const ready = items.filter((it) => isMenuReady(it) && it.meta.level === level);

  // Columns: distinct types present, ordered by config then alphabetically.
  const types = [...new Set(ready.map((it) => it.meta.type))].sort(
    (a, b) => typeRank(a) - typeRank(b) || a.localeCompare(b, "fr")
  );

  // Group by subject → chapter → (already flat files).
  const bySubject = new Map<string, LibraryItem[]>();
  for (const it of ready) {
    if (!bySubject.has(it.meta.subject)) bySubject.set(it.meta.subject, []);
    bySubject.get(it.meta.subject)!.push(it);
  }

  const sections: MenuSection[] = [...bySubject.keys()]
    .sort((a, b) => subjectRank(a) - subjectRank(b) || a.localeCompare(b, "fr"))
    .map((subject) => {
      const subjectItems = bySubject.get(subject)!;

      // Row order: curriculum order for this (level, subject), extras after alpha.
      const curriculum = chaptersFor(level, subject);
      const rank = new Map(curriculum.map((ch, i) => [ch, i]));
      const chapters = [...new Set(subjectItems.flatMap((it) => it.meta.chapter))].sort((a, b) => {
        const ra = rank.has(a) ? rank.get(a)! : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(b) ? rank.get(b)! : Number.MAX_SAFE_INTEGER;
        return ra - rb || a.localeCompare(b, "fr");
      });

      const rows: MenuRow[] = chapters.map((chapter) => {
        const inChapter = subjectItems.filter((it) => it.meta.chapter.includes(chapter));
        const cells: MenuCell[] = types.map((type) => {
          const files = inChapter
            .filter((it) => it.meta.type === type)
            .sort((a, b) => a.meta.order - b.meta.order || a.displayTitle.localeCompare(b.displayTitle, "fr"));
          return { type, files };
        });
        return { chapter, cells };
      });

      return { subject, rows };
    });

  return { level, types, sections };
}
