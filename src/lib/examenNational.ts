import type { LibraryItem } from "./types";
import { EXAMEN_NATIONAL_TYPE, EXAMEN_NATIONAL_LEVELS } from "../config";
import { isClassified } from "./classification";
import { sortItems } from "./filter";

export { EXAMEN_NATIONAL_LEVELS };

const OTHER_YEAR = "Autres";
const YEAR_RE = /20\d{2}/;

/** Group label for a title: the first 4-digit year (20xx) it contains, else "Autres". */
function yearOf(title: string): string {
  return title.match(YEAR_RE)?.[0] ?? OTHER_YEAR;
}

export interface ExamYearGroup {
  year: string;
  items: LibraryItem[];
}

/**
 * Examen National files for one final-year level, grouped by the year found in their
 * title — most recent first, with undated files trailing in an "Autres" group.
 */
export function groupExamsByYear(items: LibraryItem[], level: string): ExamYearGroup[] {
  const exams = items.filter(
    (it) => isClassified(it.meta) && it.meta.type === EXAMEN_NATIONAL_TYPE && it.meta.level.includes(level)
  );

  const byYear = new Map<string, LibraryItem[]>();
  for (const it of exams) {
    const year = yearOf(it.displayTitle);
    const group = byYear.get(year);
    if (group) group.push(it);
    else byYear.set(year, [it]);
  }

  const groups = [...byYear.entries()].map(([year, list]) => ({ year, items: sortItems(list) }));
  groups.sort((a, b) => {
    if (a.year === OTHER_YEAR) return 1;
    if (b.year === OTHER_YEAR) return -1;
    return b.year.localeCompare(a.year); // most recent year first
  });
  return groups;
}
