# Drive-Backed Course Library — Design

**Date:** 2026-07-27
**Status:** Approved design, ready for implementation planning

## 1. Purpose

A static web app, deployed on GitHub Pages, that presents the contents of a
Google Drive folder (and its subfolders) as a well-organized, browsable library.
The concrete use case is the Moroccan physics program: **courses, exercises, and
exams** (cours, exercices, examens).

Two audiences:

- **Students (public):** browse, filter, search, and open files.
- **Admin (the owner, password-gated):** edit custom organizing metadata per file.

Drive remains the source of truth for the *files*. The app maintains its own
*custom metadata layer* — it never edits Drive's native fields.

## 2. Architecture

Two pieces, both on free tiers:

### 2.1 Static frontend (GitHub Pages)

- Built with **Vite** (vanilla or a lightweight framework — decided at planning
  time; kept dependency-light), output is static files.
- Deployed via a **GitHub Action** to GitHub Pages.
- Two views sharing one data layer:
  - **Browse view** — public, for students.
  - **Admin view** — password-gated, for metadata editing.
- No Google API key is ever shipped to the browser.

### 2.2 Google Apps Script backend

- A **Google Apps Script web app** (`doGet` / `doPost`), bound to a **Google
  Sheet**.
- Runs as the folder owner, so it can walk the Drive folder without the folder
  being publicly discoverable.
- Responsibilities:
  - Recursively walk the Drive folder tree (folders + files).
  - Store and retrieve custom metadata from the bound Google Sheet.
  - Check the admin password server-side (stored in Script Properties, never in
    source).
  - Ensure each indexed file is link-shared so students can open it (see §5).

## 3. Data model

### 3.1 Drive (source of truth for files)

Read-only from the app's perspective. Per file we read: `fileId`, `name`,
`mimeType`, folder path, `thumbnailLink`, an open/preview link (`webViewLink`),
`modifiedTime`.

### 3.2 Google Sheet (source of truth for custom metadata)

One row per file, keyed by Drive `fileId`. Columns:

| Column        | Meaning                                                        |
|---------------|----------------------------------------------------------------|
| `fileId`      | Drive file id (join key)                                        |
| `level`       | Niveau — e.g. Tronc Commun, 1ère Bac, 2ème Bac SM / PC / SVT    |
| `type`        | Cours, Exercices, Examen/Contrôle, TP, Résumé                  |
| `subject`     | Matière — Physique / Chimie                                     |
| `chapter`     | Chapitre / unit — e.g. Mécanique, Électricité, Ondes           |
| `title`       | Clean display title (overrides raw filename)                   |
| `description` | Short description                                               |
| `tags`        | Free tags (comma-separated)                                    |
| `order`       | Manual sort order within a group (integer)                     |

Rules:

- A new Drive file appears in the manifest with **blank** metadata, ready to fill.
- A file deleted from Drive simply drops out of the manifest; its stale Sheet row
  is ignored (and may be pruned during reindex).
- The join is always Drive tree ⟕ Sheet on `fileId`.

## 4. Backend API

The web app exposes two HTTP methods. Responses are JSON via `ContentService`.
To avoid CORS preflight from the browser, `POST` bodies are sent as
`text/plain` and parsed server-side.

### 4.1 `GET` — public manifest

Returns the merged manifest: the Drive tree joined with Sheet metadata. Each
node carries Drive fields + custom metadata. **Cached ~10 minutes** (see §7) so
the expensive Drive walk runs rarely; normal requests return cached JSON in well
under a second. No authentication.

### 4.2 `POST` — admin actions (password required)

Every `POST` includes the admin password, compared server-side against the value
in Script Properties. Actions:

- `save` — write metadata edits (one or many rows) to the Sheet, then invalidate
  the cache.
- `reindex` — force a fresh Drive walk (bypass cache), re-ensure file sharing,
  optionally prune stale Sheet rows.

Wrong password → error response, no write.

## 5. File access & sharing

**Design correction captured during brainstorming:** for a student to *open* a
file, the file itself must be link-shared ("anyone with link — viewer"). A fully
private folder only lets the app *list* files, not open them.

Therefore, when the backend indexes a file, it **automatically sets the file to
anyone-with-link viewer** and records the open/preview link. The owner just drops
files into Drive; the app handles sharing. This behavior is **toggleable** — the
owner can disable auto-sharing and manage sharing manually.

Consequence, stated plainly: anyone who obtains a file link can view that file.
For public course material this is the intended trade-off. The folder itself is
not publicly discoverable; students reach files only through the app.

## 6. Key flows

**Admin (owner):**
1. Drop files into the Drive folder (organized however they like).
2. Open the Admin view, enter the password.
3. Fill in Niveau / Type / Matière / Chapitre / titre / description / tags /
   ordre per file.
4. Save → `POST save` → Sheet updated, cache invalidated.

**Student:**
1. Open the site → frontend fetches the manifest.
2. Filter by **Niveau**, **Type**, **Matière/Chapitre**; search titles + tags.
3. Click a card → file opens in Drive's viewer.

## 7. Caching & quotas

Rationale: keep well inside the free-tier Apps Script limits.

- The Drive folder walk is **cached ~10 minutes** (CacheService, with a
  PropertiesService fallback for larger payloads). Cache is invalidated on
  `save`/`reindex`.
- Relevant Apps Script limits (free `@gmail.com`): 6 min per execution, 30
  simultaneous executions. Caching keeps per-request work tiny, so these are not
  reached at course-library scale.
- **Scale note / future path:** the genuinely bounded resource is Drive's
  per-user request rate during a *full reindex* (walking + sharing every file in
  a burst). At a few hundred files this is a couple of seconds. If the library
  ever grows to *many thousands* of files, reindex should be done in **batches**
  (process N files per execution, continue via a follow-up call/trigger). Noted
  here so it can be added when needed rather than retrofitted under pressure.

## 8. Error handling

- **Backend unreachable / over quota:** frontend serves the last manifest from
  `localStorage` and shows a warning banner.
- **Wrong password:** clear message, no write performed.
- **Missing thumbnail:** fall back to a type icon (by `type`).
- **File deleted from Drive:** omitted from manifest; stale Sheet row ignored or
  pruned on reindex.

## 9. Interface

- Clean, responsive card/grid layout, grouped and filterable.
- Filters: Niveau, Type, Matière/Chapitre; plus a search box over title + tags.
- File cards: display title, type badge, thumbnail (type-icon fallback), open
  button, optional description.
- **French labels** (Niveau, Type, Matière, Chapitre) — the program is taught in
  French. Arabic is out of scope for v1 (can be added later).
- Admin view reuses the same list with an inline editor per file behind the
  password gate.

## 10. Component boundaries

**Backend (`apps-script/`):**
- `DriveIndex` — recursive tree walk, sharing enforcement.
- `MetadataStore` — Sheet read/write, join by `fileId`.
- `Api` — `doGet` / `doPost` routing, password check, cache management.

**Frontend (`src/`):**
- `api` — fetch manifest, save metadata (data layer; the only thing that knows
  the backend URL).
- `store` — client state (manifest, filters, auth).
- Components: `FilterBar`, `FileGrid`, `FileCard`, `AdminPanel` (editor),
  `PasswordGate`.
- `config` — backend web-app URL, field/enum definitions (levels, types,
  subjects).

## 11. Security expectations (explicit)

- The "simple password" is a server-side check gating **who can edit metadata**.
  It is not high-security auth; it is appropriate for this scope.
- Because files are link-shared, anyone with a file link can view that file. This
  matches the intent of publishing course material.

## 12. Out of scope for v1

- Arabic UI.
- Editing Drive's native fields (name, description).
- User accounts / per-student state.
- Uploading files through the app (files are added directly in Drive).
- Reindex batching (documented path in §7; implement only if scale demands).

## 13. Testing approach

- Pure logic (Drive-tree ⟕ metadata join, filtering, sorting) extracted into
  testable functions with unit tests.
- Frontend filter/search/sort logic unit-tested.
- A manual end-to-end checklist for the Drive → Admin → Sheet → Browse loop
  (Apps Script itself is awkward to unit-test; keep its logic thin over testable
  pure functions).
