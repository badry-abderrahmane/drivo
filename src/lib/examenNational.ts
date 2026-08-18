import type { LibraryItem } from "./types";
import { EXAMEN_NATIONAL_TYPE, EXAMEN_NATIONAL_LEVELS } from "../config";
import { isClassified } from "./classification";
import { sortItems } from "./filter";

export { EXAMEN_NATIONAL_LEVELS };

const YEAR_RE = /20\d{2}/;

/** The two sittings of the national exam: session normale, session de rattrapage. */
export type ExamSession = "N" | "R";

/** Uppercased and stripped of diacritics, so "corrigé" and "CORRIGE" read the same. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

/** The 4-digit year (20xx) a title names, or null when it names none. */
function yearOf(title: string): string | null {
  return title.match(YEAR_RE)?.[0] ?? null;
}

/**
 * Which sitting a file belongs to. Titles mark it with a standalone "R" (or the word
 * "rattrapage"); everything else — an explicit "N", or no marker at all — is the
 * session normale, which is by far the common case.
 */
export function examSession(title: string): ExamSession {
  return /\bR\b|RATTRAPAG/.test(fold(title)) ? "R" : "N";
}

/** True when the file is a correction rather than the subject paper itself. */
export function isCorrige(title: string): boolean {
  return fold(title).includes("CORRIG");
}

// Words that say which cell a file is in — the cell header already says it, so they
// are dropped from the chip label.
const SESSION_PHRASE_RE = /\bsession\s+(?:de\s+|du\s+)?(?:normale?|rattrapage)\b/gi;
const SESSION_WORD_RE = /\b(?:session|normale?|rattrapage|n|r)\b/gi;

/**
 * Chip text for a file: what is left of its title once the year, the session marker and
 * everything before them are removed — "PC 2025 N CORRIGÉ DÉTAILLÉ" becomes "Corrigé
 * détaillé". Files with nothing left to distinguish them take their column's name.
 */
export function examLabel(title: string, year: string | null, corrige = isCorrige(title)): string {
  const at = year ? title.indexOf(year) : -1;
  const tail = at === -1 ? title : title.slice(at + year!.length);
  const rest = tail
    .replace(SESSION_PHRASE_RE, " ")
    .replace(SESSION_WORD_RE, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  if (!rest) return corrige ? "Corrigé" : "Sujet";
  return rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
}

export interface ExamFile {
  item: LibraryItem;
  label: string;
}

export interface ExamCell {
  session: ExamSession;
  corrige: boolean;
  files: ExamFile[];
}

export interface ExamRow {
  year: string;
  /** Always the same 4 cells, in header order: N/Sujet, N/Corrigé, R/Sujet, R/Corrigé. */
  cells: ExamCell[];
}

export interface ExamTable {
  rows: ExamRow[];
  /** Exams whose title names no year — shown outside the table so none go missing. */
  other: LibraryItem[];
}

const CELLS: { session: ExamSession; corrige: boolean }[] = [
  { session: "N", corrige: false },
  { session: "N", corrige: true },
  { session: "R", corrige: false },
  { session: "R", corrige: true },
];

/**
 * The Examen National table for one final-year level: a row per year (most recent first),
 * each split into session normale / session de rattrapage and sujet / corrigé.
 */
export function buildExamTable(items: LibraryItem[], level: string): ExamTable {
  const exams = sortItems(
    items.filter(
      (it) => isClassified(it.meta) && it.meta.type === EXAMEN_NATIONAL_TYPE && it.meta.level.includes(level)
    )
  );

  const byYear = new Map<string, LibraryItem[]>();
  const other: LibraryItem[] = [];
  for (const it of exams) {
    const year = yearOf(it.displayTitle);
    if (!year) {
      other.push(it);
      continue;
    }
    const group = byYear.get(year);
    if (group) group.push(it);
    else byYear.set(year, [it]);
  }

  const rows = [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // most recent year first
    .map(([year, list]) => ({
      year,
      cells: CELLS.map(({ session, corrige }) => ({
        session,
        corrige,
        files: list
          .filter((it) => examSession(it.displayTitle) === session && isCorrige(it.displayTitle) === corrige)
          .map((item) => ({ item, label: examLabel(item.displayTitle, year, corrige) })),
      })),
    }));

  return { rows, other };
}
