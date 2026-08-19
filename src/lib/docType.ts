import { foldText } from "./normalize";

/**
 * A colour per document type, so a card's type is readable at a glance instead of every
 * badge looking alike.
 *
 * None of these is the brand orange: orange means "you can act on this" (download, open,
 * active filter), and a type badge is a label, not an action. The theme defines each of
 * these names in both modes — see src/plugins/vuetify.ts.
 */
export const TYPE_COLORS = [
  "type-cours",
  "type-exercices",
  "type-devoir",
  "type-examen",
  "type-video",
  "type-autre",
] as const;

export type TypeColor = (typeof TYPE_COLORS)[number];

const BY_TYPE: ReadonlyArray<readonly [string, TypeColor]> = [
  ["cours", "type-cours"],
  ["exercices", "type-exercices"],
  ["devoir surveille", "type-devoir"],
  ["examen national", "type-examen"],
  ["video", "type-video"],
];

/**
 * The theme colour for a document type. Matching folds case and accents, so a type typed
 * as "devoir surveille" in the Sheet still lands on the right colour. Anything unknown —
 * the field is free text — gets the neutral one rather than no colour at all.
 */
export function typeColor(type: string): TypeColor {
  const target = foldText(type);
  const hit = BY_TYPE.find(([key]) => key === target);
  return hit ? hit[1] : "type-autre";
}
