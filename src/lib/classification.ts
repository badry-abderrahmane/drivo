// A file is "classified" when its four classification fields are filled:
// Niveau, Type, Matière and at least one Chapitre. (Title is a display label, not
// a classification field.)

export interface Classifiable {
  level: string;
  type: string;
  subject: string;
  chapter: string[];
}

export function isClassified(x: Classifiable): boolean {
  return !!(x.level && x.type && x.subject && x.chapter.length > 0);
}

export function classificationStats(items: Classifiable[]): {
  classified: number;
  total: number;
  percent: number;
} {
  const total = items.length;
  const classified = items.filter(isClassified).length;
  const percent = total === 0 ? 0 : Math.round((classified / total) * 100);
  return { classified, total, percent };
}
