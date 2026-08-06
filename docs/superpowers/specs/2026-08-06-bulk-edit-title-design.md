# Bulk edit: add "titre d'affichage" to BulkClassifyDialog

## Context

The admin bulk edit modal (`BulkClassifyDialog.vue`) lets an admin apply the same
value to `level`, `type`, `subject`, and `chapter` across every selected file, via
the `BulkPatch` / `applyBulkPatch` "touched field" pattern in `src/views/adminRows.ts`.

The display title (`meta.title`) currently can only be edited per-file, in the
single-item edit modal in `AdminView.vue`, where it's a combobox seeded by
`titleSuggestions()` (original file name, then chapter names, then the level's
programme).

Duplicate titles across files are acceptable in this app (confirmed with the
user — no uniqueness constraint exists anywhere in the codebase), so bulk-setting
one title across many selected files is an intentional, supported operation, not
a footgun to guard against.

## Goal

Add `title` as a fifth bulk-editable field, following the exact same "touched"
pattern already used for the other four fields, with suggestions adapted for the
multi-file context.

## Data model changes — `src/views/adminRows.ts`

- `BulkPatch` gains `title?: string`.
- `applyBulkPatch` gains: `if (patch.title !== undefined) r.title = patch.title;`
  — same contract as the other fields: an absent key means "don't touch," a
  present key (even `""`) is applied, which is how "clear this field" is expressed.
- No changes needed to `titleSuggestions()` — it's reused as-is (see below).

## UI changes — `src/components/BulkClassifyDialog.vue`

- New `v-combobox` for title, full width (`cols="12"`), placed first in the form
  (before level/type/subject/chapter), mirroring the single-item modal's layout.
- `form.title: string` and `touched.title: boolean` added to the existing
  reactive objects. Same placeholder (`— ne pas changer —`) and reset-button
  pattern as the other fields.
- Suggestions: `titleSuggestions("", form.chapter, form.type, chapterOptions.value)`.
  Passing an empty name means the file-name suggestion is never emitted (a bulk
  selection can span files with unrelated names, so no single name applies).
  Suggestions instead come entirely from whatever chapter(s)/type are chosen in
  *this same bulk dialog*, falling back to the level's programme when no chapter
  is chosen yet — exactly the non-name half of the algorithm the single-item
  modal already uses.
- Hint text adapted for the bulk context: "Suggestions d'après le(s) chapitre(s)
  choisi(s) — ou saisissez le vôtre" / "Choisissez un chapitre pour voir des
  suggestions" (same two-state hint as the single-item modal, reworded).

## Confirmation summary

- Add a line: `Titre → <value>` or `Titre → (vidé)` when cleared, using the
  existing `show()` helper — same pattern as the `type`/`subject` lines.

## Out of scope

- No uniqueness/dedupe check on title (intentionally — duplicates are accepted).
- No per-row/per-file title values in bulk edit; this stays a single uniform
  value applied to every selected row, consistent with the other four fields.
- No changes to the single-item modal or its `titleSuggestions()` signature.

## Testing

- Extend existing `adminRows` unit tests: `applyBulkPatch` touches `title` when
  present, leaves it alone when absent, and can clear it with `""`.
- Extend `BulkClassifyDialog` component tests: title field participates in
  `touched`/`anyTouched`/`summary`/`confirm` the same way the other fields are
  already tested.
