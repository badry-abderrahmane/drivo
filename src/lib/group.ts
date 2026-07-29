import type { LibraryItem } from "./types";
import { sortItems } from "./filter";
import { LEVELS } from "../config";

const GENERAL = "Général";

export interface CourseGroup {
  key: string;
  label: string;
  items: LibraryItem[];
}

export interface LevelSection {
  level: string;
  count: number;
  groups: CourseGroup[];
}

/**
 * Grouping levels: the metadata `level` list, and nothing else. A file with several levels
 * is grouped under each; a file with no niveau yields none and is left out of the grouped
 * view entirely, rather than inventing a section from its Drive folder name.
 */
export function levelsOf(it: LibraryItem): string[] {
  return it.meta.level;
}

/** Sub-group labels: one "subject · chapter" per chapter (a file with multiple
 *  chapters lands under each). With no chapters, falls back to the subject, then the
 *  folder path below the level segment, then Général. */
export function topicsOf(it: LibraryItem): string[] {
  const subject = it.meta.subject;
  if (it.meta.chapter.length > 0) {
    return it.meta.chapter.map((ch) => [subject, ch].filter(Boolean).join(" · "));
  }
  if (subject) return [subject];
  const sub = it.path.slice(1).join(" / ");
  return [sub || GENERAL];
}

function levelRank(level: string): number {
  const i = LEVELS.indexOf(level);
  return i >= 0 ? i : 500; // known curriculum levels first in config order, others after
}

export function groupCourses(items: LibraryItem[]): LevelSection[] {
  const byLevel = new Map<string, Map<string, LibraryItem[]>>();
  for (const it of items) {
    for (const lvl of new Set(levelsOf(it))) {
      if (!byLevel.has(lvl)) byLevel.set(lvl, new Map());
      const topics = byLevel.get(lvl)!;
      for (const top of new Set(topicsOf(it))) {
        if (!topics.has(top)) topics.set(top, []);
        topics.get(top)!.push(it);
      }
    }
  }

  const sections: LevelSection[] = [];
  for (const [level, topics] of byLevel) {
    const groups: CourseGroup[] = [];
    for (const [label, list] of topics) {
      groups.push({ key: level + "::" + label, label, items: sortItems(list) });
    }
    groups.sort((a, b) => {
      if (a.label === GENERAL) return -1;
      if (b.label === GENERAL) return 1;
      return a.label.localeCompare(b.label, "fr");
    });
    // Unique files in the level (a file placed under several chapters counts once).
    const count = new Set(groups.flatMap((g) => g.items.map((it) => it.fileId))).size;
    sections.push({ level, count, groups });
  }

  sections.sort(
    (a, b) => levelRank(a.level) - levelRank(b.level) || a.level.localeCompare(b.level, "fr")
  );
  return sections;
}
