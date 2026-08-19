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
  const list = program[subject as keyof LevelChapters];
  if (!Array.isArray(list)) return null;
  const target = foldText(chapter);
  const i = list.findIndex((c) => foldText(c) === target);
  return i === -1 ? null : i + 1;
}
