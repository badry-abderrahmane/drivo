import type { LibraryItem } from "./types";
import { sortItems } from "./filter";
import { LEVELS, SUBJECTS } from "../config";

const GENERAL = "Général";
const OTHER_SUBJECT = "Autres";

/** A chapter within a matière. */
export interface CourseGroup {
  key: string;
  label: string;
  items: LibraryItem[];
}

/** One matière within a level, holding its chapters. */
export interface SubjectBlock {
  subject: string;
  /** Unique files in this matière (a file under several chapters counts once). */
  count: number;
  groups: CourseGroup[];
}

export interface LevelSection {
  level: string;
  /** Unique files in this level, across every matière. */
  count: number;
  subjects: SubjectBlock[];
}

/**
 * Grouping levels: the metadata `level` list, and nothing else. A file with several levels
 * is grouped under each; a file with no niveau yields none and is left out of the grouped
 * view entirely, rather than inventing a section from its Drive folder name.
 */
export function levelsOf(it: LibraryItem): string[] {
  return it.meta.level;
}

/** Grouping matière: the metadata Matière, else Autres. */
export function subjectOf(it: LibraryItem): string {
  return it.meta.subject || OTHER_SUBJECT;
}

/**
 * Chapter labels: one per chapter (a file with several lands under each), else the folder
 * path below the level segment, else Général.
 */
export function chaptersOf(it: LibraryItem): string[] {
  if (it.meta.chapter.length > 0) return it.meta.chapter;
  const sub = it.path.slice(1).join(" / ");
  return [sub || GENERAL];
}

function levelRank(level: string): number {
  const i = LEVELS.indexOf(level);
  return i >= 0 ? i : 500; // known curriculum levels first in config order, others after
}

function subjectRank(subject: string): number {
  const i = SUBJECTS.indexOf(subject);
  if (i >= 0) return i; // configured matières first, in config order
  return subject === OTHER_SUBJECT ? 1000 : 500; // unclassified last, unknown in between
}

function getOrSet<K, V>(map: Map<K, V>, key: K, make: () => V): V {
  let v = map.get(key);
  if (v === undefined) {
    v = make();
    map.set(key, v);
  }
  return v;
}

function uniqueCount(groups: CourseGroup[]): number {
  return new Set(groups.flatMap((g) => g.items.map((it) => it.fileId))).size;
}

/** Group into level → matière → chapitre, each level ordered by the official curriculum. */
export function groupCourses(items: LibraryItem[]): LevelSection[] {
  const byLevel = new Map<string, Map<string, Map<string, LibraryItem[]>>>();
  for (const it of items) {
    const subject = subjectOf(it);
    for (const lvl of new Set(levelsOf(it))) {
      const bySubject = getOrSet(byLevel, lvl, () => new Map<string, Map<string, LibraryItem[]>>());
      const byChapter = getOrSet(bySubject, subject, () => new Map<string, LibraryItem[]>());
      for (const ch of new Set(chaptersOf(it))) {
        getOrSet(byChapter, ch, () => []).push(it);
      }
    }
  }

  const sections: LevelSection[] = [];
  for (const [level, bySubject] of byLevel) {
    const subjects: SubjectBlock[] = [];
    for (const [subject, byChapter] of bySubject) {
      const groups: CourseGroup[] = [];
      for (const [label, list] of byChapter) {
        groups.push({ key: `${level}::${subject}::${label}`, label, items: sortItems(list) });
      }
      groups.sort((a, b) => {
        if (a.label === GENERAL) return -1;
        if (b.label === GENERAL) return 1;
        return a.label.localeCompare(b.label, "fr");
      });
      subjects.push({ subject, count: uniqueCount(groups), groups });
    }

    subjects.sort(
      (a, b) =>
        subjectRank(a.subject) - subjectRank(b.subject) ||
        a.subject.localeCompare(b.subject, "fr")
    );

    const count = uniqueCount(subjects.flatMap((s) => s.groups));
    sections.push({ level, count, subjects });
  }

  sections.sort(
    (a, b) => levelRank(a.level) - levelRank(b.level) || a.level.localeCompare(b.level, "fr")
  );
  return sections;
}
