# Brand, intro animation and cold start — design

**Date:** 2026-08-19
**Status:** approved for planning

## Context

PIPC is a prerendered Vue 3 + Vuetify app over a Google Drive library of
physique-chimie material. Two problems motivate this work:

1. **A first-time visitor waits.** With empty `localStorage`, `useLibrary` blocks on
   the Apps Script backend, which serves in ~0.5s warm but takes **up to ~50s** on a
   cache miss. The visitor sees skeletons for that whole time.
2. **The site looks like a file list.** It should read as a deliberate application,
   and it should say whose work it holds — Hassan Badry gathered and edited every
   document in it.

This design covers four changes that share one release: a build-time data seed, an
intro animation, a new brand system, and attribution — plus two supporting UI changes
(a chapter spine and a motion system) that make the rebrand cohere.

## Goals

- A first-time visitor sees real content in well under a second.
- The app opens with a brand moment that never blocks on the network.
- One coherent visual system: mark, palette, type.
- Hassan Badry's contribution is visible to readers and to crawlers, described
  accurately.

## Non-goals

Explicitly considered and deferred to their own project: document thumbnails from
`thumbnailLink`, a "Reprendre" recently-opened list, "Nouveau" badges from
`modifiedTime`, and PWA install / service worker. The first three are cheap and
worth doing; they are deferred only to keep this change reviewable. The PWA is
deferred because a service worker interacting with the seed and the localStorage
cache is where subtle staleness bugs live, and that should not be debugged in the
same change as a palette swap.

---

## 1. Cold start — a build-time seed

### The file

`scripts/prerender.ts` already fetches the raw `{files, meta}` manifest to enumerate
pages. It writes one additional artifact:

```
dist/library-seed.json    →    { files: DriveNode[], meta: RawRow[] }
```

Named `library-seed.json`, **not** `manifest.json`, so it cannot be confused with a
future web-app manifest.

No second fetch and no backend change. If the build-time fetch fails, the script
already logs a warning and returns early — it then emits no seed, and the client
falls back to today's behaviour exactly.

Size: ~460 files serialise to roughly 260KB raw, ~50–60KB gzipped over the CDN. If
the library grows past ~500KB raw this decision should be revisited.

### The third tier

`src/lib/loadLibrary.ts` gains a seed fetch between the cache and the network.
Resolution order in `useLibrary.run()`:

| Order | Source | Behaviour |
|---|---|---|
| 1 | `readFreshCache()` — localStorage under 6h | Paint immediately, refresh behind it. **Unchanged.** |
| 2 | **New:** `GET ${import.meta.env.BASE_URL}library-seed.json` | Paint immediately, refresh from the backend behind it. |
| 3 | Backend | Today's blocking load. |

The URL is built from `import.meta.env.BASE_URL` rather than hardcoded, so it
survives another base-path change like the recent `/drivo/` → `/` migration.

### Invariant: the seed is never persisted

`localStorage` holds **only** backend responses. The seed is as old as the last
deploy; persisting it would let deploy-time data masquerade as a genuine cached copy
for the full 6h TTL. It is good enough to paint with for one second while the truth
arrives, and not good enough to store.

### Staleness

When the app is showing seed data and the background refresh fails, `stale` is set,
which surfaces the existing "Hors ligne — données en cache" banner. That is honest:
the visitor is looking at data from the last deploy, not from now.

### Tests

In `loadLibrary.test.ts`, with `fetch` mocked:

- Empty cache → seed is fetched and its items are returned.
- Seed path does **not** write `localStorage`.
- A successful background refresh **does** write `localStorage`.
- Seed 404 or malformed JSON → falls through to the network path.
- Fresh cache present → seed is never fetched.

---

## 2. The intro animation

### Concept

The three strokes of the π mark draw themselves as if written, the tile fills in
behind them, and the wordmark rises. Two ambient formulas drift past.

Timing: **1400ms measured from injection** — draw 0–1000ms, tile fill 850–1300ms,
wordmark 1000–1400ms — then the exit begins. The exit (fade + FLIP handoff) is a
further 380ms, so the app is fully clear at ~1780ms.

### Implementation: shell markup, injected by an inline script

The splash is **not** a Vue component. A small inline script in `index.html`'s
`<head>` runs before the bundle loads and:

1. Returns immediately if `sessionStorage` already has the seen-flag, or if
   `matchMedia("(prefers-reduced-motion: reduce)")` matches.
2. Reads the persisted theme (see §3) and picks the matching splash background.
3. Injects the splash node and sets the seen-flag.

Consequences, each of which is the reason for this choice:

- It paints in ~50ms, **before** the JS bundle has downloaded — a Vue component
  could only appear after mount, showing a blank page first on a slow connection.
- Crawlers and no-JS visitors never receive a splash at all, so the ~653 prerendered
  pages keep serving clean content. This is why the markup is script-injected rather
  than sitting statically in the shell.
- Returning visitors get no flash, because the session check happens before the
  first paint rather than after hydration.

`App.vue`'s `onMounted` owns the exit: fade the wordmark, fly the π tile to the
header mark's measured position (FLIP), remove the node.

**The splash never waits on the network.** It runs its fixed duration and exits
regardless of loading state. This is the defence against the ~50s worst case: if the
backend is slow, the curtain still lifts on time and the visitor gets the app's
normal, interruptible skeletons rather than an animation that has quietly become a
hostage situation.

### Trigger

Once per session (`sessionStorage`). In-session navigation and reloads skip it.

### Split of responsibilities

- `index.html` — the splash markup and its keyframes, in one commented block.
- `src/lib/intro.ts` — pure and tested: the session-flag read/write, the
  reduced-motion decision, the duration constant.
- `src/App.vue` — the exit transition and the FLIP handoff.

### Tests

`intro.test.ts` covers `shouldPlayIntro()` against: fresh session, flag already set,
reduced-motion preferred. The markup and keyframes are not unit-tested — they are
verified in the browser.

---

## 3. Brand system

### The mark

The geometric π in a rounded tile: a bar and two legs, every edge on a multiple of
4 so it rasterises cleanly at 16px.

Today the header mark is the **character** π set in Space Grotesk (`App.vue`,
`.brand-pi`). Since that font is being dropped, the mark becomes
`src/components/BrandMark.vue` — one inline SVG, no webfont dependency — used by the
header, the splash, and the flying handoff between them.

Icon files to regenerate in `public/`: `favicon.svg` (the same path, `#E2610A`),
`favicon.ico`, `apple-touch-icon.png`. **Implementation must first confirm a
rasteriser is available** (`rsvg-convert`, ImageMagick, or headless Chrome); if none
is, raise it rather than shipping a teal icon beside an orange app.

### Palette — Orange & Marine

Orange carries the brand and marks what you can act on; marine carries structure and
authorship. Warm paper in light, warm brown-black in dark, so the orange sits inside
the palette rather than glowing on a neutral grey.

**Contrast split — important.** `#E2610A` against white is **3.53:1**. That is fine
for the logo tile and large display text (a graphical object needs 3:1) and short of
the 4.5:1 that white text on a filled button needs. So:

- `#E2610A` — the mark, and large/display use only.
- `#C2540A` — every filled button, active pill and badge (**4.60:1** with white).

They read as one colour; only the contrast differs.

`src/plugins/vuetify.ts`, both themes rewritten:

| Token | Light | Dark |
|---|---|---|
| `primary` | `#C2540A` | `#FB923C` |
| `on-primary` | `#FFFFFF` | `#2B1002` |
| `primary-container` | `#FCEBDB` | `#7A3405` |
| `on-primary-container` | `#7A3405` | `#FFD9B8` |
| `secondary` | `#14528C` | `#7FB6E8` |
| `secondary-container` | `#E7EFF7` | `#14395E` |
| `on-secondary-container` | `#0E3A66` | `#D5E6F5` |
| `background` | `#FFF9F4` | `#171009` |
| `surface` | `#FFFFFF` | `#201710` |
| `surface-variant` | `#F7EFE7` | `#2B2018` |
| `on-surface` | `#1A1207` | `#F5EDE4` |
| `on-surface-variant` | `#6B5B4A` | `#B9A895` |
| `outline-variant` | `#EFE2D5` | `#3A2C21` |

Role mapping: `primary` = download / active nav / chosen filter / "Exercices" badge
(via its container); `secondary` = authorship credit, secondary links, "Cours" badge.

### Type

The Google Fonts link in `index.html` **drops Orbitron and Space Grotesk** and
**adds Plus Jakarta Sans** (600/700/800). Inter stays for body text. Three families
become two, so the rebrand ships lighter than the current page.

Headings, the wordmark and level names use Plus Jakarta Sans via the existing
`h1, h2, h3, .font-heading` rule.

### Theme persistence

`App.vue`'s `toggleTheme` persists the choice to `localStorage`, and the inline
splash script reads it to pick the splash background. Without this a dark-mode
visitor gets a cream-white splash for 1.4s before the app corrects itself. Small,
and inseparable from doing the intro properly.

---

## 4. Attribution — Hassan Badry

### Wording

**"Documents rassemblés et édités par M. Hassan Badry"**, site-wide.

This is the accurate framing and it needs no per-type branching in the UI. He wrote
and edited the cours and exercices; he gathered the Examen National papers, which
are written by the ministry. "Rassemblés et édités" is true of all of it.

### Placements

Three weights, four places:

1. An "HB" pill in `secondary-container` under the page title on Browse, Menu and
   Examen National.
2. A footer line reading the full wording, placed above the existing
   "PIPC — Portail Interactif de Physique-Chimie © YYYY" line, which stays.
3. A row in the `DocView` metadata block.
4. `<meta name="author" content="Hassan Badry">` on every prerendered page, via
   `src/lib/seo.ts`.

Deliberately **not** on every card — repetition turns a credit into noise.

### JSON-LD

`seo.ts` gains a pure `jsonLd(page)` builder emitting schema.org for document pages,
where the author/editor distinction is machine-readable and free:

- Examen National documents (`meta.type === EXAMEN_NATIONAL_TYPE`) → Hassan Badry as
  **`editor`**.
- Everything else → Hassan Badry as **`author`**.

Derived automatically from `meta.type`; no manual tagging. Tested alongside the
existing `seo.ts` tests.

---

## 5. Chapter spine

Chapter numerals hung in a left margin against a rule — the visual language of a
printed table of contents.

### Numbering is real data

`CHAPTERS_BY_LEVEL[level][subject]` (`src/data/chapters.ts`) is an ordered array, so
a chapter's number is its index within its matière, +1.

New pure module `src/lib/chapterNumber.ts`:

```ts
chapterNumber(level: string, subject: string, chapter: string): number | null
```

Chapters an admin typed freely are not in the official program and return `null` —
they render **no numeral rather than a wrong one**. This is the whole correctness
risk of the feature and the tests cover it directly: in-program chapters number
correctly per matière, off-program chapters return `null`, an unknown level returns
`null`.

### Where it applies

- `UnfoldingCards.vue`, chapter step: the chapter cards become a contents list —
  numeral in the margin, name, resource counts, hung on a rule. Level selection
  stays as cards.
- `MenuTable.vue`: the numeral joins the chapter column.

On mobile the numeral shrinks; the rule stays.

---

## 6. Motion system

Three durations (120 / 220 / 380ms) and one easing curve
(`cubic-bezier(.2, .8, .2, 1)`), defined once as CSS custom properties and used
everywhere.

- **Splash → header**: the π flies to the header mark's measured position (FLIP).
- **Route change**: content fades up 8px, 220ms.
- **Skeletons**: rebuilt to match `FileCard`'s actual geometry, replacing Vuetify's
  generic `type="card, article"`. A skeleton should be the shape of the thing it
  becomes.
- **Card hover**: a 1px lift and a border-colour change.
- **Removed**: the header avatar's 180° rotate-on-hover. It is the loudest motion in
  the app and fights everything else in this design.
- The existing capped entrance stagger in `UnfoldingCards` stays, retuned to the new
  curve.

### Reduced motion

Under `prefers-reduced-motion: reduce`, all of the above collapses to opacity-only
or nothing, and the inline script skips the splash entirely.

---

## Testing

New pure modules with unit tests: `intro.ts`, `chapterNumber.ts`, the `jsonLd`
builder in `seo.ts`, the seed tier in `loadLibrary.ts`.

Component tests updated where structure changes: `UnfoldingCards.test.ts` (contents
list), `MenuTable` numerals, `BrowseView.test.ts` (skeleton shape), `DocView.test.ts`
(attribution row).

CSS, keyframes and the splash markup are verified in the browser, not unit-tested.

Manual verification before merge: first visit with cleared storage in both themes;
reduced-motion on; a prerendered deep link with the trailing slash (per the known
`vite preview` gotcha); the favicon at 16px in a real tab.

## Risks

- **Icon rasterisation** may need a tool that is not installed. Confirm before
  starting, not at the end.
- **The seed grows with the library.** Fine at ~260KB raw; revisit past ~500KB.
- **The palette swap touches every component.** Because the theme is token-based,
  most components need no edit — but anything with a hardcoded colour must be found
  and fixed. Grep for hex literals in `src/` as an explicit implementation step.
