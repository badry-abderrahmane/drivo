# Admin edit modal: collapse advanced fields

## Problem
The edit-row modal in `AdminView.vue` shows every field (title, level, type,
subject, chapter, tags, order, description) at once. Tags, order, and
description are rarely edited and add visual noise.

## Design
- Hide the Tags, Order, and Description fields behind a "Paramètres avancés"
  toggle, collapsed by default.
- Reuse the existing toggle pattern already implemented in
  `src/components/FilterBar.vue` (lines 53-137): a `ref(false)` boolean, a
  `v-btn` with `mdi-tune-variant` prepend icon and a chevron
  up/down append icon that flips with state, and a
  `<v-expand-transition><div v-show="...">` wrapper around the collapsible
  content.
- New `showAdvanced` ref lives in `AdminView.vue`, scoped to the edit modal.
  It resets to `false` every time `openEditModal(row)` runs, so the modal
  always opens collapsed regardless of prior state.
- The toggle button sits after the chapter field and before the (now
  conditionally rendered) tags/order/description fields, inside the same
  `v-row`.
- No changes to `editForm` data shape, validation, or `applyModalEdits` save
  logic — this is a visibility/layout-only change.

## Out of scope
- No change to which fields exist or how they're saved.
- No change to the filters' own advanced toggle in `FilterBar.vue`.
