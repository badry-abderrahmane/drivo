# Menu Thématique — Design

**Date:** 2026-07-28
**Status:** Approved design, ready for implementation planning

## 1. Purpose

A per-level "Menu Thématique" — a structured matrix (like the teacher's printed
PDF) that organizes fully-tagged resources so students get a program-shaped table
of contents: rows = chapters, columns = document types, cells = numbered links to
the files.

## 2. Entry point & navigation

- New top-nav item **"Menu thématique"** → route `/#/menu`.
- `MenuView` shows a **card per level** that has ≥1 qualifying file (with a count).
- Clicking a level shows that level's matrix table inline, with a **"← Retour"**
  control back to the level cards (selected-level state, not a sub-route).

## 3. Qualifying files

Only files with **all five** filled are included:
`title`, `level`, `type`, `subject`, and `chapter.length > 0`.
Under-tagged files are silently excluded. Predicate: `isMenuReady(item)`.

## 4. The matrix (per level, fully dynamic)

- **Sections by Matière** — group by `subject`; order Physique, Chimie,
  "Physique & Chimie", then any others alphabetically. Only matières present appear.
- **Rows = Chapitres** — ordered by the official curriculum order from
  `src/data/chapters.ts` for `(level, subject)`; chapters not in that list come
  after, alphabetically. A file with multiple chapters appears in each row.
- **Columns = document types** — the distinct `type` values present in that level's
  qualifying files, ordered by the `TYPES` config order (unknown types after,
  alphabetically). Level-wide (unified across matières, like the PDF); empty cells
  where a chapter has no file of that type.
- **Cells = numbered links** `[1] [2] [3]` — one per file matching
  `(subject, chapter, type)`, sorted by admin `order` then `title`. Each link shows
  the file title on hover.

## 5. Link action — in-app preview

Clicking a number opens the file in an **in-app preview dialog** (Drive iframe),
the same mechanism as the admin preview. The admin's inline preview dialog is
**extracted into a shared `FilePreview.vue` component** and reused here (DRY);
`AdminView` is refactored to use it.

`FilePreview.vue` props: `modelValue` (open, v-model) + a minimal
`item: { fileId, name, mimeType, title? }`. Uses `drivePreviewUrl` / `driveOpenUrl`
/ `fileKind`.

## 6. Architecture

**Pure logic — `src/lib/menu.ts` (unit-tested):**
- `isMenuReady(item: LibraryItem): boolean`
- `levelsWithMenu(items: LibraryItem[]): string[]` — levels (in `LEVELS` order,
  others after) that have ≥1 qualifying file.
- `buildLevelMenu(items, level): LevelMenu` where
  ```
  interface MenuCell { type: string; files: LibraryItem[] }
  interface MenuRow { chapter: string; cells: MenuCell[] }   // aligned with types[]
  interface MenuSection { subject: string; rows: MenuRow[] }
  interface LevelMenu { level: string; types: string[]; sections: MenuSection[] }
  ```
  Row order uses `chaptersFor(level, subject)` as the index; column order uses
  `TYPES`. Only qualifying files for `level` are considered.

**Components / views:**
- `views/MenuView.vue` — level cards ↔ selected-level table; uses `useLibrary`
  (shared cache, no extra fetch), loading/stale/error states like BrowseView.
- `components/MenuTable.vue` — renders one `LevelMenu`: matière section headers, a
  `v-table` with type columns and chapter rows, numbered preview links per cell.
- `components/FilePreview.vue` — shared preview dialog (extracted from AdminView).
- `router.ts` — add `/menu` → MenuView. `App.vue` — add the nav item.

**No backend change.** Read-only over the already-cached manifest; qualifying files
are link-shared, so previews render for students.

## 7. Edge cases

- Level with no qualifying files → not shown as a card.
- Chapter present in data but not in curriculum list → still a row, ordered after
  curriculum chapters, alphabetically.
- A file tagged with several chapters → appears in each chapter row (counted per
  cell). Within a cell, deduped by fileId.
- Empty cell → rendered blank (no number).

## 8. Testing

- `menu.test.ts`: `isMenuReady` (each missing field excludes), `levelsWithMenu`
  (order + exclusion), `buildLevelMenu` (section/matière order, row curriculum
  order + extras, column type order, cell membership + multi-chapter placement,
  empty cells).
- `FilePreview.test.ts`: opens with the correct preview iframe src for a given item.
- `MenuView.test.ts`: shows a level card per qualifying level; selecting a level
  renders its table (theme names + a numbered link); clicking a number opens the
  preview.
- Existing AdminView tests keep passing after the preview refactor.

## 9. Out of scope (v1)

- Editing the menu layout / manual column config (columns are derived).
- Printing/PDF export of the menu.
- A "Vidéo" document type (columns are dynamic; add the type later if wanted).
