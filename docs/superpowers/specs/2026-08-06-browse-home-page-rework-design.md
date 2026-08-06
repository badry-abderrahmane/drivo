# Home page rework: slim hero + consolidated filters

## Context

The landing route (`/`, `BrowseView.vue`) is the student-facing home page: a
decorative hero (badge pill + gradient title + subtitle + quick level pills,
all inside its own bordered/gradient-background card), then `FilterBar.vue`
(search + quick type pills + a collapsible "Filtres avancés" panel with
Niveau/Type/Matière/Chapitre selects) in its own bordered card, then a results
counter + view-mode switcher row, then the course content.

Two problems drove this rework:

1. **Visual clutter.** Two stacked bordered/backgrounded cards (hero, then
   filter bar) sit at the top of the page before any real content is visible.
2. **Duplicate, inconsistent level control.** Level can be set from the hero's
   quick pills (click again to toggle off) *or* from the "Niveau" select
   inside "Filtres avancés" (select/clear, no toggle) — two controls for the
   same filter, with different interaction models.

The two most common student tasks on this page (confirmed with the user) are
jumping straight to their level, and searching for one specific chapter/doc.
Discovery/browsing is secondary. The redesign optimizes for those two tasks
and removes the duplication, without changing scope beyond `BrowseView.vue`
and `FilterBar.vue` — `MenuView.vue` and the top nav in `App.vue` are
unchanged.

## Goal

Reduce the page to one filter surface, remove the duplicate level control,
and put search + level in front of the student immediately, while keeping
the existing visual identity (gradient title) for polish.

## Hero changes — `src/views/BrowseView.vue`

- Remove the hero's card chrome: no bordered/gradient-background container,
  no padding block, no resource-count badge pill, no quick level pill row.
- Keep the gradient `<h1>` title ("Bibliothèque de Cours").
- Replace the badge pill + subtitle paragraph with a single short line
  combining both, e.g. `"{{ published.length }} ressource(s) disponible(s) —
  organisées par niveau et chapitre."`, styled as plain `text-body-2
  text-medium-emphasis` text directly under the title (centered, no card).
- Delete `toggleLevel()` and the `allLevels` computed from `BrowseView.vue` —
  level selection moves entirely into `FilterBar` (see below), which already
  computes its own `levels` list from `props.items`.
- `.hero-section`, `.bg-primary-subtle`, `.level-pill` styles and the
  `max-w-600` class are removed as dead code; `.text-gradient` and
  `.tracking-tight` are kept (still used by the title).

## Filter bar changes — `src/components/FilterBar.vue`

- Add a **Niveau quick-pill row**, positioned between the search input and
  the existing Type pill row, built the exact same way as the Type row: a
  "Tous" chip plus one chip per level from `levels` (already computed here),
  using `local.level` / a new `selectLevel()` function mirroring the existing
  `selectType()` — i.e. clicking "Tous" clears the level, clicking a level
  chip sets it (no toggle-off-by-reclicking), so level and type pills behave
  identically.
- Remove the **Niveau** and **Type** `v-select` columns from the "Filtres
  avancés" expansion panel — both are now fully covered by their quick-pill
  rows. The panel keeps only **Matière** and **Chapitre**, each widened from
  `md="3"` to `md="6"` to fill the row.
- `emitChange` / `clearFilters` / `activeCount` logic is unchanged — they
  already read `local.level` generically, so no behavior changes there
  beyond the UI that sets it.
- `hasActiveFilters`/reset button behavior unaffected.
- **Chapitre options depend on the selected Niveau.** The `chapters` computed
  currently runs `distinctChapters(props.items)` over the full item set; it
  changes to filter `props.items` down to items whose `meta.level` includes
  `local.level` first when a level is selected (unfiltered when no level is
  selected), so the Chapitre dropdown only lists chapters that actually exist
  for that level. If the currently-selected `local.chapter` is no longer in
  the recomputed list after a level change, it's cleared (via `emitChange`)
  so the filter state never points at a chapter invisible in its own
  dropdown. Matière is unaffected by level (no such dependency requested).

## Unaffected

- Results counter + view-mode switcher row (grouped/grid/list toggle):
  no changes — not identified as a clutter source, stays as-is.
- Empty states ("Bibliothèque en préparation", "Aucun résultat trouvé"),
  `CourseGroups`, paginated grid/list rendering: unchanged.
- `MenuView.vue`, `App.vue` navigation: unchanged (explicitly out of scope).
- `useLibrary`, `applyFilters`, `sortItems`, `groupCourses`, classification
  logic: unchanged.

## Out of scope

- Merging or restructuring the Browse/Menu thématique split (deferred —
  discussed and explicitly deferred during design).
- Any change to filtering logic/semantics — this is a UI consolidation of
  existing controls, not a new filter capability.
- Mobile-specific layout changes beyond what falls out naturally from
  removing the hero card (existing responsive breakpoints on pills/selects
  are kept as-is).

## Testing

- Extend `FilterBar` component tests: clicking a level quick-pill sets
  `local.level`/emits it the same way the type pills already are tested;
  clicking "Tous" for level clears it; advanced panel no longer renders
  Niveau/Type selects; selecting a level narrows the Chapitre options to
  that level's chapters; selecting a level that invalidates the currently
  chosen chapter clears `local.chapter`.
- `BrowseView.test.ts` has no existing coverage of the hero level pills
  (verified — no test references `toggleLevel`/`.level-pill`), so no test
  needs to move; removing `toggleLevel`/`allLevels` from `BrowseView.vue`
  requires no test changes there.
