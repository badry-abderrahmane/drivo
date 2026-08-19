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
