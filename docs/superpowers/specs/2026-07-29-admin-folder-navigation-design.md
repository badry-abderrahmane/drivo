# Admin — Folder navigation & bulk classification

**Date:** 2026-07-29
**Status:** approved, ready for implementation plan

## Problem

The admin classifies files one at a time through a per-row modal, over a flat table of
every file in the Drive. With 400+ files to classify against four fields (Niveau, Type,
Matière, Chapitre), that is 400 modals with no sense of where work remains.

The Drive itself is *mixed*: part of it is tidily organised (`2BAC-SM / PHYSIQUE /
Mécanique`), where every file in a folder shares the same Niveau and Matière; the rest is
dumped into loosely-named folders that genuinely need per-file attention.

The folder structure is therefore the most useful lever available. This design adds folder
navigation, per-folder progress, and bulk classification of a selection.

## Decisions

| Question | Decision |
| --- | --- |
| Navigation model | Sidebar tree, table always visible |
| Folder scope | Recursive by default (all files beneath), toggle for direct children only |
| Bulk editing | Apply to selected rows, untouched fields left alone |
| Safety net | Confirmation dialog before applying; no undo |
| Remaining work | `À classer / Classés / Tous` filter + per-row missing-field chips |

## Architecture

A pure tree module plus two extracted components. `AdminView.vue` is already 618 lines —
the largest file in the repo — so the tree and the bulk dialog live outside it, following
the existing split where `filter.ts`, `group.ts`, `menu.ts` and `classification.ts` sit
apart from their views and carry the unit tests.

No backend change. `DriveIndex.gs` already emits each file's `path`, so the tree is derived
client-side from data `doGet` returns today. No Apps Script redeploy, no new endpoint, no
manifest growth.

### `src/lib/folderTree.ts` (new, pure)

```ts
export interface FolderNode {
  name: string;          // "PHYSIQUE"
  path: string[];        // ["2BAC-SM", "PHYSIQUE"] — identity, from root
  children: FolderNode[];
  fileCount: number;     // recursive: files anywhere beneath
  classified: number;    // recursive: files passing isClassified
  percent: number;       // rounded; 0 when fileCount is 0
}

/** Everything the tree needs from a file: where it sits, and its four fields. */
export type FolderFile = Classifiable & { path: string[] };

export function buildFolderTree(files: FolderFile[]): FolderNode;   // synthetic "Tout" root
export function filesUnder<T extends { path: string[] }>(
  files: T[], path: string[], recursive: boolean
): T[];
```

The module is deliberately structural rather than tied to `LibraryItem`. `EditRow` already
carries `path` plus the four classification fields, so it satisfies `FolderFile` as-is —
which is what lets the tree be built from the live edit rows (see below) without converting
back to `LibraryItem`. `filesUnder` is generic so it returns whatever it was given.

Folders are derived only from file paths. `buildLibrary` drops `isFolder` nodes, so a Drive
folder with no files anywhere beneath it never appears in the tree — correct here, since an
empty folder has nothing to classify.

Counts are computed bottom-up in a single pass and are recursive: `PHYSIQUE` reports 40
files and the aggregate progress of all of them, matching the scope decision below.

`classified` reuses `isClassified` from `classification.ts`, so the tree, the per-folder
bars and the global progress bar share one definition of "classé" and cannot drift.

Stats are computed from `rows` (the edit rows), not from `items`, so percentages move live
as fields are filled in and before anything is saved — the behaviour the existing global
progress bar already has.

### `src/components/FolderTree.vue` (new)

Recursive presentational component. One row per node: chevron, folder icon, name, file
count, and a thin progress bar with its percentage. The selected node is highlighted.

- Ancestors of the selected node auto-expand; everything else starts collapsed (99 folders
  fully expanded is unusable).
- Colour carries state at a glance: grey at 0%, primary in between, success at 100%, so the
  tree can be scanned for where work remains rather than read number by number.
- Props in, events out — `:tree`, `:selected`, `@select`. No store access and no
  `useLibrary`; it renders what it is handed, which keeps it independently testable.

### `src/components/BulkClassifyDialog.vue` (new)

Takes `:count`, emits `apply` with a partial patch. Four controls mirroring the per-file
modal — Niveau (multi-select), Type, Matière, Chapitre — each starting at an explicit
**« — ne pas changer — »** state.

**Empty is not the same as untouched.** Clearing a field to blank is a real instruction
("wipe the Type on these 12 files"), distinct from never having touched it. The patch is
therefore built from a per-field `touched` flag, never from emptiness, and each control
offers an explicit *Vider ce champ* affordance so destructive intent is deliberate.

**List fields replace, they do not merge.** Applying Niveau or Chapitre overwrites each
row's existing list with the dialog's value rather than appending to it. Merging would make
the result depend on each row's prior state, so the same action would produce different
outcomes per file and could never be reversed by repeating it. "Ne pas changer" already
covers the case where existing values should survive.

Chapitre suggestions come from `chaptersFor` over the union of the Niveau values selected in
the dialog — the same union logic already used by the per-file modal.

### `AdminView.vue` (modified)

Holds the new state and wires the pieces together:

- `selectedPath: string[]` — empty means the synthetic "Tout" root.
- `recursive: boolean` — defaults to `true`.
- `statusFilter: "todo" | "done" | "all"` — defaults to `"todo"`.
- `selectedIds` — bound to the table's `show-select`, keyed by `fileId`.

Table items become `filesUnder(rows, selectedPath, recursive)` piped through the status
filter, then through the existing `search`.

## Layout

Two columns: a 280px sidebar and the existing table card. On narrow screens the sidebar
collapses into a `v-navigation-drawer` opened from a "Dossiers" button in the toolbar, so
the existing responsive-table work is preserved.

```
┌─ Dossiers ────────┐┌─ Fichiers ──────────────────────┐
│ 📁 Tout      38% ││ 2BAC-SM / PHYSIQUE / Mécanique  │
│ ▾ 2BAC-SM    60% ││ [À classer (28)][Classés][Tous] │
│   ▾ PHYSIQUE     ││ ☑ 📄 exam1.pdf   2·Bac·SM·Phys  │
│      Mécanique 0%││        ⚠ manque : Type, Chapitre│
│      Ondes   100%││ ☐ 📄 serie3.pdf  —              │
│   ▸ CHIMIE   20% ││                                 │
│ ▸ TELECHARG   0% ││                                 │
└──────────────────┘└─────────────────────────────────┘
```

Above the table: a breadcrumb of the current path with clickable segments, the "inclure les
sous-dossiers" toggle, and the status filter buttons. Their counts are scoped to the current
folder and recursion setting, and ignore the search box — they answer "how much is left in
this folder", so they must not shift as you type a search term.

## Interaction rules

- **Selecting a folder scopes the table** to the files beneath it (recursive by default).
- **Changing folder clears the row selection**, so a stale selection can never be
  bulk-applied to files that are no longer visible.
- **The status filter is sticky across folder changes.** The workflow is moving through
  folders hunting unclassified files; resetting the filter each time would fight that.
- **The header checkbox selects every file in the current filtered scope, across all
  pages** — not just the visible page. Vuetify's default `show-select` behaviour is
  page-only, so this is an explicit override: with 25 rows per page, selecting a 40-file
  folder must not silently mean "the first 25". The selection bar always states the count,
  so the scope is visible.
- A sticky bar appears above the table whenever the selection is non-empty: *"12 fichiers
  sélectionnés"*, *Classer la sélection*, *Désélectionner*.

### Missing-field hints

`missingFields(row: Classifiable): string[]` is added to `classification.ts`, returning the
French labels of the absent fields, always in the canonical order **Niveau, Type, Matière,
Chapitre** — the order the four fields are named in throughout the UI. It returns `[]`
exactly when `isClassified` returns `true`. Incomplete rows render the labels as warning
chips beneath the file name. It lives beside `isClassified` so the two cannot drift.

### Bulk apply flow

1. Select rows → *Classer la sélection* → dialog.
2. Set only the fields to change; the rest stay at « ne pas changer ».
3. *Appliquer* → confirmation summarising each touched field, its new value, and the file
   count.
4. On confirm, the patch is written into the local `rows`, exactly as the per-file modal
   does.

Because bulk apply mutates the same local rows, the existing `changedRows` / `baseline`
machinery picks the changes up unchanged: the unsaved-changes badge jumps by the count, and
`save` still transmits only the diff.

## Data flow and errors

Nothing changes on the wire. Bulk apply produces ordinary changed rows for the existing
`save`; the read path is untouched.

A 40-row save is a larger `doPost` payload than the admin has sent before. The backend
writes row by row into the sheet, so this is slower but not different in kind. If it proves
slow in practice that is a follow-up, not part of this design.

Error handling is inherited: save failures surface in the snackbar and leave `rows` dirty,
so nothing is lost. The one genuinely new failure mode is a selection that no longer matches
what is on screen — addressed by clearing the selection on folder change and by restating
the count in the confirmation.

## Testing

- **`folderTree.test.ts`** (new, pure): nesting from paths; recursive counts; percent
  rounding; `filesUnder` with recursive on and off; deep paths and single-segment paths; the
  mixed-drive case where a flat dump folder sits beside a tidy nested branch; a file at the
  root with an empty path.
- **`classification.test.ts`** (extended): `missingFields` returns the right labels in the
  canonical order, and `[]` exactly when `isClassified` is `true`.
- **`AdminView.test.ts`** (extended, mount-level): selecting a folder scopes the table; the
  status filter narrows rows and its counts ignore the search box; bulk apply patches only
  touched fields across the selected rows and bumps the pending-changes count; a
  touched-but-emptied field clears its value while untouched fields are left alone; applying
  Niveau replaces rather than merges an existing list; select-all covers the whole filtered
  scope rather than the first page; switching folders clears the selection.

`FolderTree.vue` is covered through `AdminView`'s mount tests rather than its own file: it is
a presentational recursive component, and the assertions worth making are about scoping
behaviour rather than about its markup.

## Out of scope

Deliberately excluded, to keep this to one implementation plan:

- Drag-and-drop of files between folders; renaming or moving anything in Drive.
- Per-folder saved rules, or auto-classification inferred from folder names.
- Undo of a bulk apply (the confirmation dialog is the chosen safety net).
- Any change to the student-facing Browse or Menu views.
