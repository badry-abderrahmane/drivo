import type { LibraryItem } from "./types";
import { LEVELS, TYPES } from "../config";
import { CHAPTERS_BY_LEVEL, type LevelChapters } from "../data/chapters";

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

// Section order within a level's table.
const MATIERES: (keyof LevelChapters)[] = ["Physique", "Chimie"];

/** A file is menu-ready only when title, level, type, subject and ≥1 chapter are set. */
export function isMenuReady(it: LibraryItem): boolean {
  const m = it.meta;
  return !!(m.title && m.level && m.type && m.subject && m.chapter.length > 0);
}

/** All official-program levels, in config order (each has a full chapter list). */
export function menuLevels(): string[] {
  return LEVELS.filter((l) => l in CHAPTERS_BY_LEVEL);
}

function typeRank(type: string): number {
  const i = TYPES.indexOf(type);
  return i >= 0 ? i : TYPES.length;
}

/**
 * Build the thematic matrix for a level: rows are the FULL official program
 * (all chapters, Physique then Chimie), columns are the doc types present, and each
 * cell holds the matching files (by chapter + type) or is empty. Off-program
 * chapters are not shown.
 */
export function buildLevelMenu(items: LibraryItem[], level: string): LevelMenu {
  const program = CHAPTERS_BY_LEVEL[level];
  const ready = items.filter((it) => isMenuReady(it) && it.meta.level === level);

  // Columns: doc types present anywhere in this level, ordered by config.
  const types = [...new Set(ready.map((it) => it.meta.type))].sort(
    (a, b) => typeRank(a) - typeRank(b) || a.localeCompare(b, "fr")
  );

  // Cell = files of this level matching (chapter, type); the file's subject is not
  // used for placement, so a "Physique & Chimie" file still lands under its chapter.
  const cellFor = (chapter: string, type: string): LibraryItem[] =>
    ready
      .filter((it) => it.meta.type === type && it.meta.chapter.includes(chapter))
      .sort((a, b) => a.meta.order - b.meta.order || a.displayTitle.localeCompare(b.displayTitle, "fr"));

  const sections: MenuSection[] = program
    ? MATIERES.map((subject) => ({
        subject,
        rows: program[subject].map((chapter) => ({
          chapter,
          cells: types.map((type) => ({ type, files: cellFor(chapter, type) })),
        })),
      }))
    : [];

  return { level, types, sections };
}
