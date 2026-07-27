import type { LibraryItem } from "./types";
import { sortItems } from "./filter";
import { LEVELS } from "../config";

const UNCLASSIFIED = "Non classé";
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

/** Grouping level: metadata `level`, else the top folder-path segment, else Non classé. */
export function levelOf(it: LibraryItem): string {
  return it.meta.level || it.path[0] || UNCLASSIFIED;
}

/** Sub-group label: "subject · chapter" from metadata, else the folder path below the
 *  level segment, else Général. */
export function topicOf(it: LibraryItem): string {
  const meta = [it.meta.subject, it.meta.chapter].filter(Boolean).join(" · ");
  if (meta) return meta;
  const sub = it.path.slice(1).join(" / ");
  return sub || GENERAL;
}

function levelRank(level: string): number {
  const i = LEVELS.indexOf(level);
  if (i >= 0) return i; // known curriculum levels first, in config order
  if (level === UNCLASSIFIED) return 1000; // always last
  return 500; // path-derived / other levels in between
}

export function groupCourses(items: LibraryItem[]): LevelSection[] {
  const byLevel = new Map<string, Map<string, LibraryItem[]>>();
  for (const it of items) {
    const lvl = levelOf(it);
    const top = topicOf(it);
    if (!byLevel.has(lvl)) byLevel.set(lvl, new Map());
    const topics = byLevel.get(lvl)!;
    if (!topics.has(top)) topics.set(top, []);
    topics.get(top)!.push(it);
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
    const count = groups.reduce((n, g) => n + g.items.length, 0);
    sections.push({ level, count, groups });
  }

  sections.sort(
    (a, b) => levelRank(a.level) - levelRank(b.level) || a.level.localeCompare(b.level, "fr")
  );
  return sections;
}
