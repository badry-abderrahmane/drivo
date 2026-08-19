import { CHAPTERS_BY_LEVEL, type LevelChapters } from "../data/chapters";
import { foldText } from "./normalize";

/**
 * A chapter's position in the official program for its level and matière, 1-based, or
 * null when it is not in the program at all.
 *
 * The chapter field is a free combobox, so an admin can type anything. Those chapters get
 * NO numeral rather than a guessed one — a wrong number in something styled like a
 * textbook contents page is worse than no number.
 */
export function chapterNumber(level: string, subject: string, chapter: string): number | null {
  const program = CHAPTERS_BY_LEVEL[level];
  if (!program) return null;
  const target = foldText(chapter);

  const indexIn = (list: string[] | undefined): number | null => {
    if (!Array.isArray(list)) return null;
    const i = list.findIndex((c) => foldText(c) === target);
    return i === -1 ? null : i + 1;
  };

  const named = program[subject as keyof LevelChapters];
  if (Array.isArray(named)) return indexIn(named);

  // "Physique & Chimie" is a real subject in config.ts, but the program is only split
  // into Physique and Chimie. Fall back to searching both so a combined-subject document
  // still gets the number of its actual chapter, rather than an em dash forever.
  return indexIn(program.Physique) ?? indexIn(program.Chimie);
}

/**
 * Which half of the program a chapter belongs to, regardless of how the document itself
 * is labelled. A combined "Physique & Chimie" group holds both series, and listing them
 * interleaved shows two chapters numbered 01, then two numbered 02 — which reads as a
 * bug. Sorting by this first turns them into two clean runs.
 */
export function chapterMatiere(level: string, chapter: string): keyof LevelChapters | null {
  const program = CHAPTERS_BY_LEVEL[level];
  if (!program) return null;
  const target = foldText(chapter);
  if (program.Physique.some((c) => foldText(c) === target)) return "Physique";
  if (program.Chimie.some((c) => foldText(c) === target)) return "Chimie";
  return null;
}

/**
 * A chapter list in the order the program teaches it — Physique first, then Chimie, each
 * following the official sequence — rather than alphabetically. The picker is a contents
 * page, and a contents page that starts at "Association des conducteurs ohmiques" hides
 * the shape of the year.
 *
 * `level` matters and is not an optimisation: 52 of the 153 chapter names appear under
 * more than one level, and 18 of those sit at a *different* position depending on which
 * (e.g. "Le champ magnétique" is 7th in 1ère Bac Sc. Exp and 11th in 1ère Bac SM). Ranking
 * from one global table would therefore misorder whichever level lost the tie. When no
 * level is selected the list spans the whole curriculum, so it falls back to level order
 * as declared in CHAPTERS_BY_LEVEL — Tronc Commun upward.
 *
 * Chapters outside the program keep the same treatment they get in chapterNumber(): no
 * invented position. They collect at the end, alphabetically, instead of being scattered
 * through the program at guessed indices.
 */
export function sortChaptersByProgram(chapters: string[], level?: string): string[] {
  const programs =
    level && CHAPTERS_BY_LEVEL[level]
      ? [CHAPTERS_BY_LEVEL[level]]
      : Object.values(CHAPTERS_BY_LEVEL);

  const rank = new Map<string, number>();
  let next = 0;
  for (const program of programs) {
    for (const matiere of ["Physique", "Chimie"] as const) {
      for (const chapter of program[matiere]) {
        const key = foldText(chapter);
        // First occurrence wins, so a chapter shared by several levels keeps the position
        // of the earliest level rather than the latest.
        if (!rank.has(key)) rank.set(key, next);
        next += 1;
      }
    }
  }

  return [...chapters].sort((a, b) => {
    const ra = rank.get(foldText(a));
    const rb = rank.get(foldText(b));
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.localeCompare(b, "fr");
  });
}
