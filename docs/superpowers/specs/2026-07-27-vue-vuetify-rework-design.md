# Vue 3 + Vuetify Frontend Rework — Design

**Date:** 2026-07-27
**Status:** Approved design, ready for implementation planning
**Supersedes:** the vanilla-DOM view layer of `2026-07-27-drive-course-library-design.md` (frontend view layer only; backend and core logic unchanged).

## 1. Purpose

The initial frontend was intentionally minimal vanilla TypeScript. With ~460 real
files it renders the whole list at once (slow) and looks unpolished. This rework
replaces the **view layer only** with a Vue 3 + Vuetify single-page app that
provides pagination, a real editable data table for the admin, and a polished,
themed UI. The owner has Vue experience, so Vue is also the right long-term
maintenance choice.

## 2. Scope boundary (what changes, what does not)

**Unchanged (reused verbatim, keeps the rework low-risk):**

- `src/lib/types.ts`, `src/lib/manifest.ts`, `src/lib/filter.ts`,
  `src/lib/cache.ts`, `src/lib/loadLibrary.ts` and all their Vitest tests.
- `src/api.ts` (+ tests) and `src/config.ts`.
- The Apps Script backend (`apps-script/`) and the Google Sheet.
- The deploy pipeline (`.github/workflows/deploy.yml`), `base: /drivo/`.

**Replaced / removed:**

- `src/components/browse.ts`, `src/components/admin.ts` (vanilla DOM) and their
  tests `src/components/browse.test.ts`, `src/components/admin.test.ts` — deleted.
- `admin.html` and the second Vite input — removed (single-page app now).
- `src/main.ts`, `src/admin.ts` entry points — replaced by one SPA entry.
- `src/styles.css` — mostly superseded by Vuetify theming (kept only if a small
  global tweak is needed).

## 3. Tech stack

- **Vue 3** (Composition API, `<script setup lang="ts">`).
- **Vuetify 3** via **`vite-plugin-vuetify`** (auto-import + tree-shaking).
- **vue-router 4** in **hash mode** (`createWebHashHistory`) — deep links like
  `/drivo/#/admin` work on GitHub Pages with no server config.
- **Vite** build, **Vitest** + **@vue/test-utils** + **jsdom** tests.
- Node 20+ toolchain (unchanged).

## 4. Architecture

Single SPA mounted from one `index.html`.

```
src/
  main.ts                 # createApp(App) + Vuetify + router, mount('#app')
  App.vue                 # v-app shell: app bar (title + nav Parcourir/Admin) + <router-view>
  router.ts               # createWebHashHistory; routes: '/' -> BrowseView, '/admin' -> AdminView
  plugins/vuetify.ts      # createVuetify: theme, fr locale defaults
  composables/useLibrary.ts   # module-level reactive state: loads manifest once, exposes items/loading/stale/error + reload()
  views/
    BrowseView.vue        # FilterBar + search + v-data-iterator of FileCard (paginated)
    AdminView.vue         # PasswordGate -> editable v-data-table (paginated) + save/reindex toolbar + snackbar
  components/
    FileCard.vue          # one course card (title, type chip, level·chapter, description, Ouvrir)
    FilterBar.vue         # v-select x4 (Niveau/Type/Matière/Chapitre) + search field; v-model:filters
    PasswordGate.vue      # password field + unlock; emits unlocked(password)
  lib/…, api.ts, config.ts   # UNCHANGED
```

**State (`useLibrary` composable):** module-level `ref`s (`items`, `loading`,
`stale`, `error`) plus `ensureLoaded()`/`reload()`. Calls the existing
`loadLibrary()` (which fetches + caches + builds `LibraryItem[]`). Shared by both
views without Pinia (YAGNI for a single shared fetch).

## 5. Browse view (students)

- **FilterBar:** four `v-select`s populated from `distinctValues(items, key)` for
  `level`, `type`, `subject`, `chapter`, each with an "Tous" (empty) option, plus
  a `v-text-field` search. Two-way binds a `Filters` object (from `lib/filter.ts`).
- **List:** `v-data-iterator` with `:items` set to
  `sortItems(applyFilters(items, filters))`, `:items-per-page="24"`, built-in
  pagination footer. Each item renders a `FileCard`. Only the current page's cards
  mount → fixes the "460 at once" slowness.
- **FileCard:** displays `displayTitle`, a `v-chip` for `meta.type`, a subtitle of
  `[meta.level, meta.chapter]` joined by "·", `meta.description` if present, and an
  **Ouvrir** button linking to `webViewLink` (`target="_blank" rel="noopener"`).
- **States:** loading → `v-progress-circular`; error with no cache → alert; stale
  (served from cache) → a `v-alert`/banner "Hors ligne — données en cache".

## 6. Admin view (owner)

- **PasswordGate:** `v-text-field` (type password) + **Déverrouiller**. On submit,
  validate via the existing no-op authenticated save (`saveMeta(password, [])`);
  on `{ok:true}` emit `unlocked(password)`, else show the error and stay gated.
- **Editor:** `v-data-table` over all items with:
  - Pagination (`items-per-page` default 25; 10/25/50/100 options), sorting, and a
    global search `v-text-field`.
  - Columns: `name` (read-only filename), `title`, `level`, `type`, `subject`,
    `chapter`, `tags`, `description`, `order`.
  - **Inline editing** via item slots: text fields for `title/chapter/tags/
    description`, `v-select` for `level/type/subject` (options from `config.ts`),
    number field for `order`. Edits mutate a local working copy keyed by `fileId`.
  - **Toolbar (sticky):** **Enregistrer** → collects the working rows as
    `SaveInput[]` (tags joined with commas, via the existing `toSaveInput` shape)
    and calls `saveMeta(password, rows)`; **Réindexer Drive** → `reindex(password)`.
    A `v-snackbar` reports "Enregistré ✓" / "Réindexé (N) ✓" / errors.
  - Only changed rows need saving; sending all working rows is acceptable and
    simplest (backend upserts by `fileId`). v1 sends all rows.

## 7. Serialization detail

The admin editor holds `tags` as an editable comma string in the field but the
in-memory `LibraryItem.meta.tags` is `string[]`. Reuse the existing contract:
`SaveInput.tags` is a comma string; on save, map each working row to `SaveInput`
(join array → comma string, `order` → number). This matches `api.ts` and the
Sheet exactly — no backend change.

## 8. Testing

- **Core (unchanged):** all existing Vitest tests for `lib/*` and `api.ts` stay
  and must keep passing.
- **Composable:** unit-test `useLibrary` (mock `loadLibrary`): loads once, exposes
  stale/error correctly, `reload()` refetches.
- **Components (Vue Test Utils, Vuetify plugin in setup):**
  - `FileCard`: renders title/type/link with correct `href` + `target`.
  - `FilterBar`: changing a select / typing search emits the updated `Filters`.
  - `BrowseView`: filtering reduces visible cards; pagination limits rendered
    cards to items-per-page.
  - `PasswordGate`: wrong password (save→`{ok:false}`) stays gated + shows error;
    correct password emits `unlocked`.
- A Vitest setup file registers Vuetify and a `ResizeObserver` stub (Vuetify needs
  it under jsdom).

## 9. Build & deploy

- `vite.config.ts`: add `@vitejs/plugin-vue` and `vite-plugin-vuetify`; revert to a
  single entry (default `index.html`); keep `base: '/drivo/'`.
- `index.html`: single `<div id="app">` + `src/main.ts`; remove the stylesheet link
  (Vuetify styles imported in `plugins/vuetify.ts`).
- No workflow change. Hash routing → no 404 fallback needed.
- Vuetify increases bundle size; acceptable and tree-shaken.

## 10. Out of scope for v1 (unchanged from prior spec)

- Editing Drive native fields, Arabic UI, user accounts, uploads through the app.
- Server-side pagination (client-side over the single cached manifest is enough at
  hundreds–low-thousands of files).
- Pinia (revisit only if global state grows beyond the single library fetch).

## 11. Risks / notes

- **Vuetify under jsdom** needs a `ResizeObserver` stub and the plugin registered
  in test setup; captured in Task setup so component tests don't flake.
- **Bundle size** grows with Vuetify; mitigated by `vite-plugin-vuetify`
  tree-shaking. Acceptable for this app.
- The backend caching/performance fix (chunked cache, share-on-reindex) is a
  **separate, already-authored** change in `apps-script/Code.gs`; this rework does
  not depend on it, but load latency stays until that backend version is deployed.
