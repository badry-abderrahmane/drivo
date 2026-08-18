# Deep links, SEO, document pages and search normalization

Date: 2026-08-18
Status: approved

## Problem

PIPC is a client-rendered Vue SPA on GitHub Pages that fetches its entire
library from an Apps Script backend at runtime. Four consequences:

1. **No resource has a URL.** Routes are `/`, `/menu`, `/examen-national`,
   `/admin`. A student cannot link a friend to a specific document.
2. **No organic discovery.** A hash router plus a JS-rendered body means a
   crawler sees an empty shell. There are no per-page titles, no
   descriptions, no OG tags, no sitemap.
3. **Clicking a card ejects the student to Drive.** `FileCard` hardcodes
   `:href="item.webViewLink" target="_blank"`. The in-app viewer that exists
   (`FilePreview.vue`) is wired only into `MenuView`.
4. **Search misses how students type.** `search.ts` indexes only
   `displayTitle`, `meta.chapter`, `meta.tags`, `meta.subject`, with no
   accent folding and no Arabic or transliterated chapter names.

Classification is at 100%, so the whole library is publicly visible and these
are now the binding constraints on reach and usability.

## Non-goals

- Analytics, favorites, "nouveautés", PWA/offline. Deferred deliberately.
- Arabic UI translation. Only search aliases are in scope.
- Backend (`apps-script/`) changes. Nothing here requires a redeploy.
- Backwards compatibility with existing `#/` URLs. The app is not in
  production, so no redirect shim is built.

## Approach

Build-time prerendering (chosen over runtime SSR and over meta-tags-only).
`npm run build` runs Vite as today, then a Node script fetches the manifest
once and emits a static HTML file per URL: the built shell with per-page
`<head>` metadata and a semantic content block injected. Crawlers get real
HTML and real internal links with no JS execution; users get the SPA exactly
as today.

Rejected: `vite-ssg`-style true SSR — Vuetify's SSR setup is fiddly and every
view fetches its data in `onMounted`, so each would need a build-time
injection path plus hydration-mismatch handling. That is substantially more
machinery than a crawler that needs text and links justifies.

Freshness: prerendered HTML is a snapshot refreshed by every deploy, since
`deploy.yml` already runs on push to `main` and offers `workflow_dispatch`.
No cron and no repository-dispatch token. Content classified in Drive without
a subsequent push stays out of the crawler-facing snapshot until the next
deploy; live visitors are unaffected because the SPA still fetches at runtime.

## URL scheme

History mode: `createWebHashHistory()` becomes `createWebHistory("/drivo/")`,
matching `base` in `vite.config.ts`.

Navigation state lives in path segments. Only transient state stays a query
parameter.

| Path | View | Prerendered |
|---|---|---|
| `/` | BrowseView | yes |
| `/niveau/:level` | BrowseView, level preset | one per level |
| `/niveau/:level/chapitre/:chapter` | BrowseView, level+chapter preset | one per level x chapter in use |
| `/menu`, `/menu/:level` | MenuView | yes |
| `/examen-national`, `/examen-national/:level` | ExamenNationalView | yes |
| `/doc/:fileId/:slug?` | DocView (new) | one per classified file |
| `/admin` | AdminView | no; `noindex`, absent from sitemap |
| `/?search=...` | BrowseView | no; `noindex` |

`?level=` and `?chapter=` are removed. `?search=` remains a query parameter
because a result set is not a page worth indexing.

`:slug` on a document route is decorative. `fileId` alone resolves the
document; every page emits `<link rel="canonical">` pointing at the slugged
form so the two spellings do not compete in the index.

`UnfoldingCards.vue`, `MenuView.vue` and `ExamenNationalView.vue` each already
funnel this state through a single computed get/set pair, so each changes from
`route.query` to `route.params` in one place.

### Slugs

`src/lib/slug.ts`, built on `foldText` from `src/lib/normalize.ts`:
`slugify("2ème Bac SM")` -> `2eme-bac-sm` (NFD-decompose, strip
`\p{Diacritic}`, lowercase, non-alphanumeric runs -> `-`, trim leading and
trailing `-`).

Resolution never un-slugifies. It looks up a map built from real data —
`LEVELS` from `config.ts` for levels, the manifest's in-use chapters for
chapters — so an unrecognised slug produces a clean not-found rather than a
guess. Chapters are scoped under their level path, so identically named
chapters in different levels do not collide.

## Document page

`src/views/DocView.vue` resolves `route.params.fileId` against `useLibrary()`.

States: skeleton while loading; the page; or "Ressource introuvable" with a
link home. Both an unknown id and a file failing `isClassified` resolve to
not-found, preserving the public-visibility invariant `isClassified` already
enforces in every other view.

Layout, top to bottom:

- breadcrumb: Niveau -> Chapitre -> document
- `<h1>` = `displayTitle`
- chips: type, matière, niveau; chapter tags
- description (`meta.description`) when present
- the Drive preview embedded via the existing `drivePreviewUrl()`
- action row: Ouvrir dans Drive, Télécharger, Partager
- "Dans le même chapitre": up to 8 siblings sharing level and chapter,
  excluding self, plus a link up to the chapter page

The related-documents block is also the internal link graph crawlers walk to
discover the library from any entry point.

### Actions

- **Ouvrir dans Drive** — existing `driveOpenUrl()`.
- **Télécharger** — new `driveDownloadUrl()` in `src/lib/drivePreview.ts`.
  Google-native types export as
  `https://docs.google.com/{host}/d/{id}/export?format=pdf`; everything else
  uses `https://drive.google.com/uc?export=download&id={id}`. It reuses the
  same mime-type split `docHost()` already makes.
- **Partager** — `navigator.share` where available, with a
  copy-to-clipboard fallback and a confirmation snackbar.

### Rewiring

- `FileCard.vue`: both grid and list modes change from
  `:href="item.webViewLink" target="_blank"` to a `:to` router-link to the
  document page.
- `SearchPalette.vue` results and `MenuTable.vue`'s `@preview` navigate to the
  document page.
- `FilePreview.vue` becomes **admin-only** (implementation deviation from the
  original plan to delete it). `AdminView` uses it to preview files while
  classifying them, and an unclassified file has no public document page by
  design, so the document page cannot replace it there. Every student-facing
  use is removed; DocView embeds the iframe directly from `drivePreview.ts`.

### Share previews

`DriveNode.thumbnailLink` becomes `og:image` when present, so a WhatsApp share
shows the document's first page. Best-effort with a static fallback image,
since Drive thumbnail URLs can expire.

## Prerendering

`scripts/prerender.ts`, run by `vite-node` (already present via vitest at
2.1.9 — no new dependency):

```
"build": "vue-tsc --noEmit && vite build && vite-node scripts/prerender.ts"
```

Sequence: read `dist/index.html` as the shell -> `fetchManifest()` (api.ts) ->
`buildLibrary()` (manifest.ts) -> keep `isClassified` items -> enumerate
routes -> write `dist/<path>/index.html` for each.

Reusing `fetchManifest` and `buildLibrary` means the prerender shares the
tested join logic rather than reimplementing it. Neither touches browser APIs,
and Node 20 provides global `fetch`.

Each emitted file is the shell with two injections:

1. **`<head>`**: `<title>`, `<meta name="description">`,
   `<link rel="canonical">`, OG and Twitter tags. Per page type:
   - document: `"{titre} — {type}, {niveau} | PIPC"`
   - chapter: `"{chapitre} — {niveau} : cours, exercices et examens | PIPC"`
   - level: `"Physique-Chimie {niveau} : cours, exercices et examens | PIPC"`

   Descriptions use `meta.description` when the admin wrote one, otherwise a
   sentence generated from level, type, subject and chapter.
2. **A semantic content block inside `<div id="app">`**: heading, metadata as
   text, description, and real `<a href>` links to related documents and to
   parent chapter and level pages. Vue's `mount()` clears the container before
   mounting, so users never see it flash. It carries the same information the
   rendered page shows, so there is no cloaking risk.

Also emitted:

- `sitemap.xml` — absolute URLs, `<lastmod>` from `modifiedTime` for documents
- `robots.txt` — disallow `/admin`, reference the sitemap
- `404.html` — a copy of the plain shell. Because every real URL exists as a
  file, this catches only genuine typos and correctly returns 404 rather than
  masking broken links as soft-200s.

`/admin` carries `noindex` but IS still emitted as a file: GitHub Pages serves
`404.html` for any unmatched path, so a route without a file would 404 instead
of loading the SPA. The same applies to `/menu/:level` and
`/examen-national/:level`. All are excluded from the sitemap.

Canonicals, `og:url`, sitemap entries and prerendered internal links use the
**trailing-slash** form (`/doc/<id>/<slug>/`). Each page is written as
`<path>/index.html`, which a static host serves only at the trailing-slash URL,
301-redirecting the bare path to it — so the bare form would cost a redirect on
every crawl. Vue Router matches either form (default `strict: false`), so
in-app navigation is unaffected.

**Failure handling:** if the manifest fetch fails, the script logs a loud
warning, emits the plain shell plus `404.html`, and exits 0. A backend hiccup
degrades SEO for one deploy instead of breaking the deploy.

**New constant:** `SITE_URL = "https://badry-abderrahmane.github.io/drivo/"`
in `config.ts`, used for canonicals and the sitemap. It and Vite's `base` are
the only two values to change if the site moves to a custom domain.

## Search

`src/lib/normalize.ts` exports `foldText()`: NFD-decompose, strip
`\p{Diacritic}`, lowercase, collapse whitespace. `slug.ts` builds on it so
slugs and search share one definition of equal text.

In `search.ts`: Fuse receives a `getFn` that folds indexed values, and
`searchItems()` folds the query. "electricite" then matches "Électricité"
deterministically rather than relying on fuzzy luck at `threshold: 0.35`.

Two new keys: `name` (the raw Drive filename, currently unsearchable, so a
student typing a filename they were sent gets nothing) and `meta.description`.
Weights become approximately: `displayTitle` 0.45, `meta.chapter` 0.3,
`meta.tags` 0.1, `name` 0.1, `meta.subject` and `meta.description` 0.05.

`src/data/chapterAliases.ts`: `Record<canonicalChapter, string[]>` holding
Arabic names, transliterations and shorthand, e.g. `"Ondes mécaniques"` ->
`["الموجات الميكانيكية", "ondes", "mawjat"]`. Exposed to Fuse as a virtual key
through the same `getFn`, so `searchItems()` keeps returning `LibraryItem` and
nothing downstream changes. High-traffic chapters are seeded; extending the
map later is content editing, not code.

`src/data/chapters.ts` is deliberately untouched — reshaping it into objects
would ripple into the admin chapter picker for no gain.

## Structure and testing

`scripts/prerender.ts` stays a thin I/O shell of roughly 50 lines: fetch plus
`fs.writeFile`. All logic — route enumeration, per-page-type metadata, the
content block, sitemap XML, HTML injection — lives in `src/lib/seo.ts` as pure
functions. Otherwise the entire SEO surface would be untestable build-script
code, which is where silent breakage hides.

New test files: `slug.test.ts`, `normalize.test.ts`, `seo.test.ts`,
`DocView.test.ts`. Expanded: `search.test.ts`.

`DocView.test.ts` covers: loading state; found (title, chips, preview src,
action URLs); unknown id -> not found; unclassified id -> not found; related
items exclude self and cap at 8.

`seo.test.ts` covers: route enumeration from a fixture library; title and
description per page type; canonical URL construction; sitemap XML shape and
`lastmod`; head and body injection into a shell; `noindex` on admin and search
pages.

Updated tests: `FileCard` (href -> router-link), `MenuView`,
`ExamenNationalView`, `UnfoldingCards` (query -> params), `SearchPalette`.
Deleted: `FilePreview.test.ts`.

Test-driven throughout.

## Done means

- All existing tests still green, plus the new ones.
- `npm run build` emits the expected `dist` tree: per-level, per-chapter and
  per-document `index.html` files, `sitemap.xml`, `robots.txt`, `404.html`.
- `sitemap.xml` lists every classified document.
- A document page is reachable, shareable and shows its preview, download and
  share actions.
- Accent-insensitive, filename and alias searches return the expected hits.
