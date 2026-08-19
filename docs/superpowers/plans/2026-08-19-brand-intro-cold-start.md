# Brand, Intro Animation and Cold Start — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a first visit paint real content in under a second, open the app with a
branded intro that never blocks on the network, and re-skin PIPC around a geometric π
mark, an Orange & Marine palette and Hassan Badry's attribution.

**Architecture:** The build-time prerender already fetches the whole manifest, so it
writes it to `dist/library-seed.json`; the client gains a third loading tier that paints
from that CDN file when localStorage is empty. The intro splash is plain HTML injected by
an inline script in `index.html` *before* the JS bundle loads, and removed by Vue on
mount — so it appears in ~50ms, never reaches crawlers, and runs a fixed duration
regardless of loading state. The rebrand is almost entirely Vuetify theme tokens, plus one
new `BrandMark.vue` that replaces a webfont-dependent glyph.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript), Vuetify 3, Vite 5, Vue Router 4
(history mode), Vitest + @vue/test-utils (jsdom), vite-node for the prerender.

**Spec:** `docs/superpowers/specs/2026-08-19-brand-intro-cold-start-design.md`

## Global Constraints

- **Language:** all user-facing copy is French. No English strings in the UI.
- **Attribution wording, verbatim:** `Documents rassemblés et édités par M. Hassan Badry`
- **Brand orange split — do not collapse these into one value:**
  - `#E2610A` — the logo tile and large/display use ONLY (3.53:1 on white).
  - `#C2540A` — every filled button, active pill, badge (4.60:1 on white, passes AA).
- **Intro timing:** 1400ms from injection, then a 380ms exit.
- **Motion tokens:** durations `120ms` / `220ms` / `380ms`, easing
  `cubic-bezier(.2, .8, .2, 1)`. No other values.
- **Seed file name:** `library-seed.json` (never `manifest.json` — that name is reserved
  for a future web-app manifest).
- **`localStorage` stores backend responses only.** Never persist the seed.
- **Icon geometry is rect-based, not stroked.** Verified: ImageMagick silently drops a
  stroked `<path>` and renders a blank tile. See Task 4.
- **Tests:** `npm test` runs all; `npx vitest run <path>` runs one file. `globals: true`
  is set but existing tests import from `vitest` explicitly — follow that.
- Every task ends with a commit. Commit messages: `feat:` / `refactor:` / `docs:` prefix.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/lib/intro.ts` | Pure: should the intro play, how long does it run |
| `src/lib/intro.test.ts` | Tests for the above |
| `src/lib/chapterNumber.ts` | Pure: a chapter's index within the official program |
| `src/lib/chapterNumber.test.ts` | Tests for the above |
| `src/components/BrandMark.vue` | The π mark as inline SVG, one geometry everywhere |
| `src/components/AuthorCredit.vue` | The "HB" attribution pill |

**Modified:**

| File | Change |
|---|---|
| `scripts/prerender.ts` | Also write `dist/library-seed.json` |
| `src/lib/loadLibrary.ts` | Seed tier between cache and network |
| `src/lib/loadLibrary.test.ts` | Seed tier tests |
| `src/composables/useLibrary.ts` | Use the seed tier in `run()` |
| `src/plugins/vuetify.ts` | Orange & Marine tokens, both themes |
| `index.html` | Fonts, splash markup, inline script |
| `src/App.vue` | BrandMark, splash exit + FLIP, theme persistence, footer credit |
| `src/lib/seo.ts` | `<meta name="author">` + `jsonLd()` |
| `src/lib/seo.test.ts` | Tests for the above |
| `src/views/DocView.vue` | Attribution row |
| `src/views/BrowseView.vue` | Credit pill, card-shaped skeletons |
| `src/views/MenuView.vue`, `src/views/ExamenNationalView.vue` | Credit pill |
| `src/components/UnfoldingCards.vue` | Chapter step becomes a contents list |
| `src/components/MenuTable.vue` | Chapter numerals |
| `src/components/FileCard.vue` | Hover motion retune |
| `public/favicon.svg`, `public/favicon.ico`, `public/apple-touch-icon.png` | Orange mark |

**Task order rationale:** data first (1), then pure logic the UI needs (2, 8), then the
theme every later task renders against (3), then the mark (4), then the intro that
consumes both (5), then content (6, 7), then layout (9), then motion last (10) so it
tunes finished surfaces rather than moving targets.

---

## Task 1: Cold-start seed

**Files:**
- Modify: `scripts/prerender.ts` (inside `main()`, after `buildLibrary`)
- Modify: `src/lib/loadLibrary.ts`
- Modify: `src/composables/useLibrary.ts:39-56` (the `run()` function)
- Test: `src/lib/loadLibrary.test.ts`

**Interfaces:**
- Consumes: `fetchManifest()` from `src/api.ts`, `buildLibrary(files, meta)` from
  `src/lib/manifest.ts`, `RawManifest` from `src/lib/cache.ts`.
- Produces: `fetchSeed(): Promise<LibraryItem[] | null>` and
  `SEED_URL: string` from `src/lib/loadLibrary.ts`, both used by `useLibrary`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/loadLibrary.test.ts`:

```ts
describe("fetchSeed", () => {
  it("returns items from the static seed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => manifest,
    }));
    const items = await fetchSeed();
    expect(items).not.toBeNull();
    expect(items![0].displayTitle).toBe("Cours 1");
  });

  it("does not write localStorage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => manifest,
    }));
    await fetchSeed();
    expect(localStorage.getItem("drivo:manifest")).toBeNull();
  });

  it("returns null on a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await fetchSeed()).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nope: true }),
    }));
    expect(await fetchSeed()).toBeNull();
  });

  it("returns null when the network throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchSeed()).toBeNull();
  });
});
```

Add `fetchSeed` to the existing import at the top of the file:

```ts
import { loadLibrary, readFreshCache, fetchSeed, CACHE_MAX_AGE_MS } from "./loadLibrary";
```

Add `vi.unstubAllGlobals();` to the existing `afterEach` block.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/loadLibrary.test.ts`
Expected: FAIL — `fetchSeed is not a function` / no export named `fetchSeed`.

- [ ] **Step 3: Implement `fetchSeed`**

Append to `src/lib/loadLibrary.ts`:

```ts
/**
 * The build-time copy of the manifest, emitted next to the app by scripts/prerender.ts.
 * Built from BASE_URL rather than hardcoded so it survives a base-path change.
 */
export const SEED_URL = `${import.meta.env.BASE_URL}library-seed.json`;

/**
 * The seeded library, or null if it is missing or unusable. Deliberately NOT written to
 * localStorage: the seed is as old as the last deploy, and persisting it would let
 * deploy-time data masquerade as a real cached copy for the full 6h TTL. It is good
 * enough to paint with for one second while the backend answers, and no longer.
 */
export async function fetchSeed(): Promise<LibraryItem[] | null> {
  try {
    const res = await fetch(SEED_URL);
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<RawManifest>;
    if (!Array.isArray(raw.files) || !Array.isArray(raw.meta)) return null;
    return buildLibrary(raw.files, raw.meta);
  } catch {
    return null;
  }
}
```

Extend the existing imports at the top of the file:

```ts
import type { RawManifest } from "./cache";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/loadLibrary.test.ts`
Expected: PASS, all five new tests plus the existing ones.

- [ ] **Step 5: Wire the seed into `useLibrary.run()`**

In `src/composables/useLibrary.ts`, import `fetchSeed`:

```ts
import { loadLibrary, readFreshCache, fetchSeed } from "../lib/loadLibrary";
```

Replace the body of `run()` (currently lines 39-56) with:

```ts
async function run(): Promise<void> {
  const cached = readFreshCache();
  if (cached) {
    items.value = cached;
    stale.value = false;
    loadedOnce = true;
    refreshing.value = true;
    void networkLoad().finally(() => {
      refreshing.value = false;
    });
    return;
  }

  // No cache: paint from the build-time seed (a static CDN file, ~100ms) rather than
  // blocking on the backend, which is ~0.5s warm but can take ~50s on a cache miss.
  const seeded = await fetchSeed();
  if (seeded) {
    items.value = seeded;
    stale.value = false;
    loadedOnce = true;
    refreshing.value = true;
    void networkLoad().finally(() => {
      refreshing.value = false;
    });
    return;
  }

  loading.value = true;
  try {
    await networkLoad();
  } finally {
    loading.value = false;
  }
}
```

- [ ] **Step 6: Emit the seed from the prerender**

In `scripts/prerender.ts`, inside `main()`, the `try` block currently reads:

```ts
    const raw = await fetchManifest();
    const items = buildLibrary(raw.files, raw.meta);
    pages = enumeratePages(items);
```

Add the seed write immediately after `enumeratePages`:

```ts
    const raw = await fetchManifest();
    const items = buildLibrary(raw.files, raw.meta);
    pages = enumeratePages(items);

    // The same manifest, emitted as a static file so a first-time visitor with empty
    // localStorage paints from the CDN instead of waiting on the backend. No second
    // fetch: this is the payload we already have in hand.
    await write("library-seed.json", JSON.stringify({ files: raw.files, meta: raw.meta }));
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS. Existing `useLibrary` tests still pass — with no cache and `fetch`
unstubbed in jsdom, `fetchSeed` returns null and the old blocking path runs unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/lib/loadLibrary.ts src/lib/loadLibrary.test.ts src/composables/useLibrary.ts scripts/prerender.ts
git commit -m "feat: paint a first visit from a build-time library seed"
```

---

## Task 2: Intro logic

**Files:**
- Create: `src/lib/intro.ts`
- Test: `src/lib/intro.test.ts`

**Interfaces:**
- Produces: `shouldPlayIntro(): boolean`, `markIntroPlayed(): void`,
  `INTRO_DURATION_MS = 1400`, `INTRO_EXIT_MS = 380`, `INTRO_SESSION_KEY`.
  Task 5 consumes all of these from `App.vue` and mirrors the logic in the inline script.

- [ ] **Step 1: Write the failing test**

Create `src/lib/intro.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { shouldPlayIntro, markIntroPlayed, INTRO_SESSION_KEY, INTRO_DURATION_MS } from "./intro";

function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: reduce, media: "", addEventListener() {}, removeEventListener() {} })
  );
}

beforeEach(() => {
  sessionStorage.clear();
  mockReducedMotion(false);
});
afterEach(() => vi.unstubAllGlobals());

describe("shouldPlayIntro", () => {
  it("plays on a fresh session", () => {
    expect(shouldPlayIntro()).toBe(true);
  });

  it("does not play once the session flag is set", () => {
    markIntroPlayed();
    expect(shouldPlayIntro()).toBe(false);
  });

  it("does not play when reduced motion is preferred", () => {
    mockReducedMotion(true);
    expect(shouldPlayIntro()).toBe(false);
  });

  it("runs for 1400ms", () => {
    expect(INTRO_DURATION_MS).toBe(1400);
  });
});

describe("markIntroPlayed", () => {
  it("writes the session flag", () => {
    markIntroPlayed();
    expect(sessionStorage.getItem(INTRO_SESSION_KEY)).toBe("1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/intro.test.ts`
Expected: FAIL — cannot resolve `./intro`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/intro.ts`:

```ts
/**
 * The opening animation: shown once per browsing session, never to a visitor who asked
 * for reduced motion. The same three conditions are duplicated in the inline script in
 * index.html — that copy has to run before the bundle loads, which is the whole point of
 * the splash. Keep the two in step.
 */

export const INTRO_SESSION_KEY = "pipc:intro-played";

/** How long the splash holds before its exit begins. */
export const INTRO_DURATION_MS = 1400;

/** The exit itself: fade plus the flight into the header mark. */
export const INTRO_EXIT_MS = 380;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldPlayIntro(): boolean {
  if (prefersReducedMotion()) return false;
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === null;
  } catch {
    // Private-mode storage failures must never cost the visitor the app.
    return false;
  }
}

export function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
  } catch {
    /* unavailable — the intro simply replays next load */
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/intro.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/intro.ts src/lib/intro.test.ts
git commit -m "feat: add intro session and reduced-motion logic"
```

---

## Task 3: Theme tokens and fonts

**Files:**
- Modify: `src/plugins/vuetify.ts` (both `light` and `dark` colour blocks)
- Modify: `index.html` (the Google Fonts `<link>` and the inline `<style>`)

**Interfaces:**
- Produces: the Vuetify token names every later task styles against. No new code exports.

- [ ] **Step 1: Replace the light theme colours**

In `src/plugins/vuetify.ts`, replace the entire `light.colors` object with:

```ts
        colors: {
          // #C2540A, not the #E2610A of the logo tile: white text on the brand orange
          // needs 4.5:1 and #E2610A gives 3.53:1. The tile is a graphical object and
          // only needs 3:1, so the mark keeps the brighter value.
          primary: "#C2540A",
          "on-primary": "#FFFFFF",
          "primary-container": "#FCEBDB",
          "on-primary-container": "#7A3405",
          secondary: "#14528C",
          "on-secondary": "#FFFFFF",
          "secondary-container": "#E7EFF7",
          "on-secondary-container": "#0E3A66",
          tertiary: "#8A6A3F",
          "on-tertiary": "#FFFFFF",
          "tertiary-container": "#F3E7D6",
          "on-tertiary-container": "#3D2A12",
          background: "#FFF9F4",
          "on-background": "#1A1207",
          surface: "#FFFFFF",
          "on-surface": "#1A1207",
          "surface-variant": "#F7EFE7",
          "on-surface-variant": "#6B5B4A",
          outline: "#9C8D7C",
          "outline-variant": "#EFE2D5",
          "surface-tint": "#C2540A",
          error: "#BA1A1A",
          "on-error": "#FFFFFF",
          "error-container": "#FFDAD6",
          "on-error-container": "#410002",
          warning: "#B45309",
          success: "#166534",
        },
```

- [ ] **Step 2: Replace the dark theme colours**

Replace the entire `dark.colors` object with:

```ts
        colors: {
          primary: "#FB923C",
          "on-primary": "#2B1002",
          "primary-container": "#7A3405",
          "on-primary-container": "#FFD9B8",
          secondary: "#7FB6E8",
          "on-secondary": "#0E2A47",
          "secondary-container": "#14395E",
          "on-secondary-container": "#D5E6F5",
          tertiary: "#D9BE96",
          "on-tertiary": "#3D2A12",
          "tertiary-container": "#574127",
          "on-tertiary-container": "#F3E7D6",
          // A brown-black, not a neutral grey: the orange has to sit inside the palette
          // rather than glow on top of it.
          background: "#171009",
          "on-background": "#F5EDE4",
          surface: "#201710",
          "on-surface": "#F5EDE4",
          "surface-variant": "#2B2018",
          "on-surface-variant": "#B9A895",
          outline: "#8A7864",
          "outline-variant": "#3A2C21",
          "surface-tint": "#FB923C",
          error: "#FFB4AB",
          "on-error": "#690005",
          "error-container": "#93000A",
          "on-error-container": "#FFDAD6",
          warning: "#FBBF24",
          success: "#4ADE80",
        },
```

- [ ] **Step 3: Swap the fonts**

In `index.html`, replace the Google Fonts `<link href=...>` with:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
      rel="stylesheet"
    />
```

and replace the inline `<style>` block's contents with:

```css
      body {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }
      h1, h2, h3, h4, .font-heading {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
      }
```

Orbitron and Space Grotesk are gone: three families become two.

- [ ] **Step 4: Find every hardcoded colour the tokens cannot reach**

Run:

```bash
grep -rnE "#[0-9A-Fa-f]{6}\b" src/ --include=*.vue --include=*.ts | grep -v "plugins/vuetify.ts"
```

Fix each hit to use a theme token (`rgb(var(--v-theme-primary))`, `color="primary"`, …).
`src/App.vue`'s `.brand-pi` is expected here and is deleted in Task 4 — leave it for now.
If a hit is genuinely non-themeable, leave it and note it in the commit body.

- [ ] **Step 5: Verify the app renders**

Run: `npm run dev` and open `http://localhost:5173/`. Check both themes with the header
toggle. Expected: warm paper light theme, warm brown-black dark theme, orange actions,
marine secondary. The header π will look wrong until Task 4 — that is expected.

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS. Tests assert structure and data, not colour.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/vuetify.ts index.html src/
git commit -m "feat: adopt the Orange & Marine palette and Plus Jakarta Sans"
```

---

## Task 4: The brand mark and icons

**Files:**
- Create: `src/components/BrandMark.vue`
- Modify: `src/App.vue` (header mark markup + `.quantum-avatar` / `.brand-pi` styles)
- Modify: `public/favicon.svg`
- Regenerate: `public/favicon.ico`, `public/apple-touch-icon.png`

**Interfaces:**
- Produces: `<BrandMark :size="number" />` — renders the π tile as inline SVG.
  Task 5 reuses it inside the splash and measures the header instance for the FLIP.

**Geometry — the two coordinated forms.** The resting mark is built from **rects**; the
animated draw uses a **stroked path along the rect centrelines**. This is not a style
preference: ImageMagick silently drops a stroked `<path>` and rasterises a blank tile,
which is why the existing favicon is already rect-based. The stroke path
`M16 22 H48 M26 26 V44 M42 26 V44` at `stroke-width="8"` with round caps occupies exactly
the same pixels as the three rects below.

- [ ] **Step 1: Create the component**

Create `src/components/BrandMark.vue`:

```vue
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    role="img"
    aria-label="PIPC"
    class="brand-mark"
  >
    <rect width="64" height="64" rx="14" :fill="tileColor" />
    <g :fill="glyphColor">
      <rect x="12" y="18" width="40" height="8" rx="4" />
      <rect x="22" y="22" width="8" height="26" rx="4" />
      <rect x="38" y="22" width="8" height="26" rx="4" />
    </g>
  </svg>
</template>

<script setup lang="ts">
/**
 * The π mark. Rects rather than a stroked path, because that is the only form every
 * rasteriser renders (ImageMagick drops stroked paths) — so the favicon, the header and
 * the splash are literally the same geometry.
 *
 * The tile keeps #E2610A rather than the theme's primary: at tile size it is a graphical
 * object needing 3:1, and the brighter orange is the brand colour. Buttons use the
 * darker #C2540A via the theme.
 */
withDefaults(
  defineProps<{ size?: number; tileColor?: string; glyphColor?: string }>(),
  { size: 42, tileColor: "#E2610A", glyphColor: "#FFFFFF" }
);
</script>
```

- [ ] **Step 2: Use it in the header**

In `src/App.vue`, replace this block:

```html
          <div class="quantum-avatar rounded-xl d-flex align-center justify-center elevation-1">
            <span class="brand-pi">π</span>
            <div class="quantum-ring"></div>
          </div>
```

with:

```html
          <BrandMark :size="42" class="header-mark" data-test="brand-mark" />
```

Add the import to the `<script setup>` block:

```ts
import BrandMark from "./components/BrandMark.vue";
```

Delete the `.quantum-avatar`, `.quantum-avatar:hover` and `.brand-pi` rules from the
`<style scoped>` block and add:

```css
.header-mark {
  display: block;
  flex: none;
  transition: transform var(--pipc-fast, 120ms) var(--pipc-ease, cubic-bezier(.2, .8, .2, 1));
}

.header-mark:hover {
  transform: scale(1.04);
}
```

The 180° rotate-on-hover is deliberately gone — it is the loudest motion in the app.

- [ ] **Step 3: Update the SVG favicon**

Replace the whole of `public/favicon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="PIPC">
  <!-- The header's π tile (src/components/BrandMark.vue), same geometry. Rects, not a
       stroked path: a favicon cannot rely on a webfont, and rasterisers drop strokes. -->
  <rect width="64" height="64" rx="14" fill="#E2610A"/>
  <g fill="#FFFFFF">
    <rect x="12" y="18" width="40" height="8" rx="4"/>
    <rect x="22" y="22" width="8" height="26" rx="4"/>
    <rect x="38" y="22" width="8" height="26" rx="4"/>
  </g>
</svg>
```

- [ ] **Step 4: Regenerate the raster icons**

ImageMagick is installed and verified against this exact geometry. Run:

```bash
magick public/favicon.svg -resize 180x180 public/apple-touch-icon.png
magick public/favicon.svg -resize 32x32 /tmp/pipc32.png
magick public/favicon.svg -resize 16x16 /tmp/pipc16.png
magick /tmp/pipc32.png /tmp/pipc16.png public/favicon.ico
magick identify public/favicon.ico
```

Expected: two frames, `32x32` and `16x16`.

- [ ] **Step 5: Verify the icons are not blank**

Open `public/apple-touch-icon.png` and confirm a **white π on an orange tile**. A solid
orange square with no π means the SVG lost its glyph — check that the rects are present
and that you did not reintroduce a stroked path.

- [ ] **Step 6: Run the suite and the dev server**

Run: `npm test` — expected PASS.
Run: `npm run dev`, hard-reload, and confirm the header mark renders and the tab icon is
orange.

- [ ] **Step 7: Commit**

```bash
git add src/components/BrandMark.vue src/App.vue public/favicon.svg public/favicon.ico public/apple-touch-icon.png
git commit -m "feat: replace the glyph brand mark with a rect-based SVG component"
```

---

## Task 5: The intro splash

**Files:**
- Modify: `index.html` (splash markup, keyframes, inline script)
- Modify: `src/App.vue` (exit + FLIP handoff, theme persistence)

**Interfaces:**
- Consumes: `INTRO_DURATION_MS`, `INTRO_EXIT_MS`, `markIntroPlayed` from
  `src/lib/intro.ts` (Task 2); `BrandMark` (Task 4) for the header target.
- Produces: DOM contract `#pipc-splash` with child `#pipc-splash-mark`, and the
  `pipc:theme` localStorage key.

- [ ] **Step 1: Add the splash styles and markup to the shell**

In `index.html`, inside the existing `<style>` block, append:

```css
      /* ---- Opening animation. Injected by the inline script below (never present for
         crawlers or no-JS visitors), removed by App.vue on mount. ---- */
      #pipc-splash {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        background: linear-gradient(165deg, #FFF9F4, #FBE3CD);
        transition: opacity 380ms cubic-bezier(.2, .8, .2, 1);
      }
      #pipc-splash.pipc-dark {
        background: linear-gradient(165deg, #1F1509, #120C06);
      }
      #pipc-splash.pipc-out { opacity: 0; }
      #pipc-splash-mark { transform-origin: center; }
      #pipc-splash-mark .pipc-draw {
        stroke-dasharray: 80;
        stroke-dashoffset: 80;
        animation: pipc-draw 1000ms cubic-bezier(.6, 0, .3, 1) forwards;
      }
      #pipc-splash-mark .pipc-fill { opacity: 0; animation: pipc-fade 450ms 850ms forwards; }
      #pipc-splash .pipc-word {
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-weight: 800;
        font-size: 22px;
        letter-spacing: -.5px;
        color: #1A1207;
        opacity: 0;
        animation: pipc-rise 400ms 1000ms cubic-bezier(.2, .8, .2, 1) forwards;
      }
      #pipc-splash.pipc-dark .pipc-word { color: #F5EDE4; }
      #pipc-splash .pipc-sub {
        font-size: 9px;
        letter-spacing: .22em;
        text-transform: uppercase;
        color: #14528C;
        opacity: 0;
        animation: pipc-rise 400ms 1120ms cubic-bezier(.2, .8, .2, 1) forwards;
      }
      #pipc-splash.pipc-dark .pipc-sub { color: #7FB6E8; }
      @keyframes pipc-draw { to { stroke-dashoffset: 0; } }
      @keyframes pipc-fade { to { opacity: 1; } }
      @keyframes pipc-rise {
        from { opacity: 0; transform: translateY(9px); }
        to   { opacity: 1; transform: translateY(0); }
      }
```

- [ ] **Step 2: Add the inline script**

In `index.html`, immediately before `</head>`, add:

```html
    <script>
      // Runs before the bundle loads, so the splash paints in ~50ms instead of after Vue
      // mounts. Injected rather than written statically into the shell: the ~653
      // prerendered pages must reach crawlers and no-JS visitors uncovered. Mirrors
      // src/lib/intro.ts — keep the two in step.
      (function () {
        try {
          if (sessionStorage.getItem("pipc:intro-played") !== null) return;
          if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          sessionStorage.setItem("pipc:intro-played", "1");
        } catch (e) {
          return;
        }
        var dark = false;
        try {
          dark = localStorage.getItem("pipc:theme") === "dark";
        } catch (e) {}
        var el = document.createElement("div");
        el.id = "pipc-splash";
        if (dark) el.className = "pipc-dark";
        el.setAttribute("aria-hidden", "true");
        el.innerHTML =
          '<svg id="pipc-splash-mark" width="72" height="72" viewBox="0 0 64 64">' +
          '<rect class="pipc-fill" width="64" height="64" rx="14" fill="#E2610A"/>' +
          '<path class="pipc-draw" d="M16 22 H48 M26 26 V44 M42 26 V44" stroke="#E2610A" ' +
          'stroke-width="8" stroke-linecap="round" fill="none"/>' +
          '<g class="pipc-fill" fill="#FFFFFF">' +
          '<rect x="12" y="18" width="40" height="8" rx="4"/>' +
          '<rect x="22" y="22" width="8" height="26" rx="4"/>' +
          '<rect x="38" y="22" width="8" height="26" rx="4"/></g></svg>' +
          '<div class="pipc-word">PIPC</div>' +
          '<div class="pipc-sub">Physique-Chimie</div>';
        document.addEventListener("DOMContentLoaded", function () {
          document.body.appendChild(el);
        });
      })();
    </script>
```

- [ ] **Step 3: Own the exit from `App.vue`**

Add to `src/App.vue`'s `<script setup>`:

```ts
import { onMounted } from "vue";
import { INTRO_DURATION_MS, INTRO_EXIT_MS } from "./lib/intro";

const THEME_KEY = "pipc:theme";

/**
 * Dismiss the splash the shell injected. The mark flies to the header's copy of itself
 * (FLIP: measure both, transform the splash node onto the target) so the intro resolves
 * into the app rather than being curtained away.
 *
 * The timer is unconditional — the splash never waits on data. The backend can take ~50s
 * on a cache miss, and an animation that waits for it stops being an animation.
 */
onMounted(() => {
  const splash = document.getElementById("pipc-splash");
  if (!splash) return;

  window.setTimeout(() => {
    const mark = document.getElementById("pipc-splash-mark");
    const target = document.querySelector<HTMLElement>(".header-mark");
    if (mark && target) {
      const from = mark.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = to.width / from.width;
      mark.style.transition = `transform ${INTRO_EXIT_MS}ms cubic-bezier(.2, .8, .2, 1)`;
      mark.style.transform =
        `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`;
    }
    splash.classList.add("pipc-out");
    window.setTimeout(() => splash.remove(), INTRO_EXIT_MS);
  }, INTRO_DURATION_MS);
});
```

- [ ] **Step 4: Persist the theme**

Still in `src/App.vue`, replace `toggleTheme` with:

```ts
function toggleTheme(): void {
  const next = theme.global.current.value.dark ? "light" : "dark";
  theme.global.name.value = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* unavailable — the choice simply does not survive the session */
  }
}
```

and restore it on mount, at the top of the existing `onMounted` callback, before the
splash lookup:

```ts
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") theme.global.name.value = savedTheme;
```

Without this the inline script has no theme to read and a dark-mode visitor gets a
cream-white splash for 1.4s.

- [ ] **Step 5: Verify in the browser**

Run `npm run dev`, then in DevTools console: `sessionStorage.clear()` and reload.

Expected: the π draws itself, the tile fills, the wordmark rises, and at ~1.4s the mark
flies up into the header position as the background fades.

Then check each of:
- Reload again → **no splash** (session flag).
- `sessionStorage.clear()`, switch to dark, reload → splash background is dark, no white flash.
- DevTools → Rendering → "Emulate prefers-reduced-motion" → `sessionStorage.clear()`,
  reload → **no splash at all**.
- Throttle to Slow 3G, `sessionStorage.clear()`, reload → the splash still appears almost
  immediately and still exits at 1.4s.

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS. `App.vue`'s `onMounted` returns early in jsdom — there is no splash node.

- [ ] **Step 7: Commit**

```bash
git add index.html src/App.vue
git commit -m "feat: add the opening animation and persist the theme choice"
```

---

## Task 6: Attribution in the UI

**Files:**
- Create: `src/components/AuthorCredit.vue`
- Modify: `src/App.vue` (footer), `src/views/BrowseView.vue`, `src/views/MenuView.vue`,
  `src/views/ExamenNationalView.vue`, `src/views/DocView.vue`
- Test: `src/components/AuthorCredit.test.ts`

**Interfaces:**
- Produces: `<AuthorCredit />` and the exported constant `AUTHOR_NAME = "Hassan Badry"`
  from `src/config.ts`, consumed by Task 7's SEO work.

- [ ] **Step 1: Write the failing test**

Create `src/components/AuthorCredit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import AuthorCredit from "./AuthorCredit.vue";
import { mountWithVuetify } from "../test/setup";

describe("AuthorCredit", () => {
  it("names the teacher with the agreed wording", () => {
    const w = mountWithVuetify(AuthorCredit);
    expect(w.text()).toContain("Documents rassemblés et édités par M. Hassan Badry");
  });

  it("shows his initials", () => {
    const w = mountWithVuetify(AuthorCredit);
    expect(w.text()).toContain("HB");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/AuthorCredit.test.ts`
Expected: FAIL — cannot resolve `./AuthorCredit.vue`.

- [ ] **Step 3: Add the shared constant**

Append to `src/config.ts`:

```ts
/** The teacher who gathered and edited every document in the library. */
export const AUTHOR_NAME = "Hassan Badry";
```

- [ ] **Step 4: Write the component**

Create `src/components/AuthorCredit.vue`:

```vue
<template>
  <div class="author-credit d-inline-flex align-center ga-2 rounded-pill px-3 py-1" data-test="author-credit">
    <span class="initials d-flex align-center justify-center rounded-circle">HB</span>
    <span class="text-caption font-weight-medium">
      Documents rassemblés et édités par M. {{ AUTHOR_NAME }}
    </span>
  </div>
</template>

<script setup lang="ts">
// Marine, not orange: orange means "you can act on this". Authorship is not an action.
import { AUTHOR_NAME } from "../config";
</script>

<style scoped>
.author-credit {
  background: rgb(var(--v-theme-secondary-container));
  color: rgb(var(--v-theme-on-secondary-container));
}

.initials {
  width: 20px;
  height: 20px;
  flex: none;
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
  font-size: 0.6rem;
  font-weight: 700;
}
</style>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/AuthorCredit.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Place it in the three list views**

In each of `src/views/BrowseView.vue`, `src/views/MenuView.vue` and
`src/views/ExamenNationalView.vue`: import the component

```ts
import AuthorCredit from "../components/AuthorCredit.vue";
```

and add `<AuthorCredit class="mb-6" />` directly beneath the `<h1>` of each view.
In `MenuView.vue` that is the `Menu Thématique` heading block; in `BrowseView.vue` the
main page heading; in `ExamenNationalView.vue` the page heading.

- [ ] **Step 7: Add the document-page row**

In `src/views/DocView.vue`, immediately after the chapter chips block (the
`v-if="doc.meta.chapter.length"` div), add:

```html
      <div class="d-flex align-center ga-2 mb-4" data-test="doc-author">
        <v-icon icon="mdi-account-edit-outline" size="16" color="secondary" />
        <span class="text-caption text-medium-emphasis">
          Rassemblé et édité par M. {{ AUTHOR_NAME }}
        </span>
      </div>
```

and import the constant in its `<script setup>`:

```ts
import { AUTHOR_NAME } from "../config";
```

- [ ] **Step 8: Add the footer line**

In `src/App.vue`, inside the `<v-footer>`, add above the existing copyright div:

```html
      <div class="text-caption font-weight-medium mb-1" data-test="footer-credit">
        Documents rassemblés et édités par M. Hassan Badry
      </div>
```

The existing `PIPC — Portail Interactif de Physique-Chimie © {{ year }}` line stays.

- [ ] **Step 9: Run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/AuthorCredit.vue src/components/AuthorCredit.test.ts src/config.ts src/views src/App.vue
git commit -m "feat: credit Hassan Badry across the app"
```

---

## Task 7: Attribution for crawlers

**Files:**
- Modify: `src/lib/seo.ts` (`injectPage`, plus a new `jsonLd`)
- Test: `src/lib/seo.test.ts`

**Interfaces:**
- Consumes: `AUTHOR_NAME` from `src/config.ts` (Task 6), `EXAMEN_NATIONAL_TYPE` from
  `src/config.ts`, `PageMeta` from `src/lib/seo.ts`.
- Produces: `jsonLd(page: PageMeta): string` — a `<script type="application/ld+json">`
  block, or `""` for pages that are not documents.

`PageMeta` gains one optional field, `docType?: string`, set by `docPage()` so `jsonLd`
can tell an Examen National paper from Hassan Badry's own material. He *wrote* the cours
and exercices (`author`); he *gathered* the ministry's exam papers (`editor`). Claiming
authorship of national exam papers would be false.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/seo.test.ts`:

```ts
describe("jsonLd", () => {
  const base = { path: "/doc/1/x", title: "T", description: "D", body: "" };

  it("names Hassan Badry as author of ordinary documents", () => {
    const out = jsonLd({ ...base, docType: "Cours" });
    expect(out).toContain('"author"');
    expect(out).toContain("Hassan Badry");
    expect(out).not.toContain('"editor"');
  });

  it("names him as editor of Examen National papers", () => {
    const out = jsonLd({ ...base, docType: "Examen National" });
    expect(out).toContain('"editor"');
    expect(out).not.toContain('"author"');
  });

  it("returns nothing for non-document pages", () => {
    expect(jsonLd(base)).toBe("");
  });
});

describe("injectPage author meta", () => {
  it("declares the author on every page", () => {
    const out = injectPage("<html><head></head><body><div id=\"app\"></div></body></html>", {
      path: "/",
      title: "T",
      description: "D",
      body: "",
    });
    expect(out).toContain('<meta name="author" content="Hassan Badry">');
  });
});
```

Add `jsonLd` to the existing `seo` import at the top of the test file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — `jsonLd` is not exported.

- [ ] **Step 3: Extend `PageMeta`**

In `src/lib/seo.ts`, add to the `PageMeta` interface:

```ts
  /** The document's `meta.type`, set only for document pages. Drives author vs editor. */
  docType?: string;
```

and in `docPage()` (the function building a document page), add `docType: item.meta.type`
to the returned object.

- [ ] **Step 4: Write `jsonLd`**

Add to `src/lib/seo.ts`:

```ts
/**
 * schema.org for a document page. Hassan Badry wrote and edited the cours and exercices,
 * so he is their `author`; the Examen National papers are written by the ministry and he
 * gathered them, so there he is the `editor`. The distinction is free here and claiming
 * authorship of national exam papers would be false.
 */
export function jsonLd(page: PageMeta): string {
  if (!page.docType) return "";
  const role = page.docType === EXAMEN_NATIONAL_TYPE ? "editor" : "author";
  const data = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: page.title.replace(SUFFIX, ""),
    description: page.description,
    url: canonicalUrl(page.path),
    inLanguage: "fr",
    [role]: { "@type": "Person", name: AUTHOR_NAME },
    publisher: { "@type": "Organization", name: "PIPC" },
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}
```

Extend the config import at the top of the file:

```ts
import { SITE_URL, EXAMEN_NATIONAL_LEVELS, EXAMEN_NATIONAL_TYPE, AUTHOR_NAME } from "../config";
```

- [ ] **Step 5: Emit it from `injectPage`**

In `injectPage`, add to the `head` array, after the `twitter:card` line:

```ts
    `<meta name="author" content="${escapeHtml(AUTHOR_NAME)}">`,
    jsonLd(page),
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS, 4 new tests plus the existing ones.

- [ ] **Step 7: Verify against a real build**

Run: `npm run build`, then:

```bash
grep -c 'name="author"' dist/index.html
grep -o '"@type":"LearningResource"' dist/doc/*/*/index.html | head -3
```

Expected: `1` for the first; at least one match for the second.

- [ ] **Step 8: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "feat: declare authorship in page metadata and JSON-LD"
```

---

## Task 8: Chapter numbering

**Files:**
- Create: `src/lib/chapterNumber.ts`
- Test: `src/lib/chapterNumber.test.ts`

**Interfaces:**
- Consumes: `CHAPTERS_BY_LEVEL` from `src/data/chapters.ts`.
- Produces: `chapterNumber(level, subject, chapter): number | null` — Task 9 consumes it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/chapterNumber.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { chapterNumber } from "./chapterNumber";

describe("chapterNumber", () => {
  it("numbers a chapter by its position in the official program", () => {
    expect(chapterNumber("Tronc Commun", "Physique", "La gravitation universelle")).toBe(1);
    expect(chapterNumber("Tronc Commun", "Physique", "Le mouvement")).toBe(3);
  });

  it("numbers each matière independently", () => {
    const first = CHAPTERS_BY_LEVEL["Tronc Commun"].Chimie[0];
    expect(chapterNumber("Tronc Commun", "Chimie", first)).toBe(1);
  });

  it("returns null for a chapter that is not in the program", () => {
    expect(chapterNumber("Tronc Commun", "Physique", "Chapitre inventé")).toBeNull();
  });

  it("returns null for an unknown level", () => {
    expect(chapterNumber("Niveau inconnu", "Physique", "Le mouvement")).toBeNull();
  });

  it("returns null for an unknown matière", () => {
    expect(chapterNumber("Tronc Commun", "Biologie", "Le mouvement")).toBeNull();
  });

  it("ignores case and accents when matching", () => {
    expect(chapterNumber("Tronc Commun", "Physique", "LE MOUVEMENT")).toBe(3);
  });
});
```

Add the data import at the top:

```ts
import { CHAPTERS_BY_LEVEL } from "../data/chapters";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/chapterNumber.test.ts`
Expected: FAIL — cannot resolve `./chapterNumber`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/chapterNumber.ts`:

```ts
import { CHAPTERS_BY_LEVEL, type LevelChapters } from "../data/chapters";
import { foldText } from "./normalize";

/**
 * A chapter's position in the official program for its level and matière, 1-based, or
 * null when it is not in the program at all.
 *
 * The chapter field is a free combobox, so an admin can type anything. Those chapters get
 * NO numeral rather than a guessed one — a wrong number in something styled like a
 * textbook contents page is worse than no number.
 */
export function chapterNumber(level: string, subject: string, chapter: string): number | null {
  const program = CHAPTERS_BY_LEVEL[level];
  if (!program) return null;
  const list = program[subject as keyof LevelChapters];
  if (!Array.isArray(list)) return null;
  const target = foldText(chapter);
  const i = list.findIndex((c) => foldText(c) === target);
  return i === -1 ? null : i + 1;
}
```

`foldText` is the existing accent/case folding from `src/lib/normalize.ts` — the same
helper search and slugs use. Do not add a second normalisation.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/chapterNumber.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chapterNumber.ts src/lib/chapterNumber.test.ts
git commit -m "feat: number chapters against the official program"
```

---

## Task 9: The chapter spine

**Files:**
- Modify: `src/components/UnfoldingCards.vue` (STEP 2, the chapter block at lines ~63-137)
- Modify: `src/components/MenuTable.vue` (the chapter cell)
- Test: `src/components/UnfoldingCards.test.ts`

**Interfaces:**
- Consumes: `chapterNumber(level, subject, chapter)` from Task 8. In `UnfoldingCards` the
  level is `selectedLevel` and the matière is `subGroup.subject`; in `MenuTable` the level
  is `menu.level` and the matière is `section.subject`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/UnfoldingCards.test.ts`, following the mounting pattern already
used in that file:

```ts
  it("hangs the program number beside each chapter", async () => {
    const { wrapper } = await mountUnfolding(mockItems);
    await settle();
    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();
    expect(wrapper.find('[data-test="chapter-spine-number"]').exists()).toBe(true);
  });
```

`mountUnfolding()`, `settle()` and `mockItems` already exist at the top of that file —
`settle()` is required because the step transition needs a real timer tick, not just a
flushed microtask queue.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/UnfoldingCards.test.ts`
Expected: FAIL — no element with that `data-test`.

- [ ] **Step 3: Replace the chapter cards with the contents list**

In `src/components/UnfoldingCards.vue`, replace the `<v-row>…</v-row>` block inside STEP 2
(the one iterating `subGroup.chapters` into `v-col`/`v-card`) with:

```html
            <div class="chapter-spine">
              <button
                v-for="(ch, index) in subGroup.chapters"
                :key="ch.name"
                type="button"
                class="spine-row d-flex align-start ga-4 w-100 text-left"
                :data-test="`unfold-chapter-${ch.name}`"
                :style="{ animationDelay: `${staggerDelay(index)}ms` }"
                @click="selectChapter(ch.name)"
              >
                <span class="spine-number font-heading" data-test="chapter-spine-number">
                  {{ formatChapterNumber(subGroup.subject, ch.name) }}
                </span>
                <span class="spine-body flex-grow-1 pb-4">
                  <span class="d-block font-heading font-weight-bold spine-name">{{ ch.name }}</span>
                  <span class="d-block text-caption text-medium-emphasis mt-1">
                    {{ ch.count }} document{{ ch.count > 1 ? "s" : "" }}
                  </span>
                </span>
                <v-icon icon="mdi-chevron-right" size="20" color="primary" class="mt-1" />
              </button>
            </div>
```

- [ ] **Step 4: Add the formatter**

In the same file's `<script setup>`:

```ts
import { chapterNumber } from "../lib/chapterNumber";

/**
 * Two-digit program number, or an em dash for a chapter the admin typed freely. A wrong
 * number in a contents page is worse than no number.
 */
function formatChapterNumber(subject: string, chapter: string): string {
  const n = selectedLevel.value ? chapterNumber(selectedLevel.value, subject, chapter) : null;
  return n === null ? "—" : String(n).padStart(2, "0");
}
```

- [ ] **Step 5: Style the spine**

Add to the same file's `<style scoped>`:

```css
.spine-row {
  background: none;
  border: 0;
  cursor: pointer;
  padding: 0;
}

.spine-number {
  width: 52px;
  flex: none;
  text-align: right;
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -1.5px;
  color: rgb(var(--v-theme-primary));
  opacity: 0.3;
  transition: opacity var(--pipc-fast, 120ms) var(--pipc-ease, cubic-bezier(.2, .8, .2, 1));
}

.spine-row:hover .spine-number {
  opacity: 0.75;
}

.spine-body {
  border-left: 2px solid rgb(var(--v-theme-outline-variant));
  padding-left: 14px;
}

.spine-name {
  font-size: 0.95rem;
}

@media (max-width: 600px) {
  .spine-number {
    width: 36px;
    font-size: 1.4rem;
  }
}
```

- [ ] **Step 6: Add numerals to the menu table**

In `src/components/MenuTable.vue`, replace the chapter cell:

```html
              <td class="font-weight-medium theme-cell">{{ row.chapter }}</td>
```

with:

```html
              <td class="font-weight-medium theme-cell">
                <span class="chapter-num">{{ formatChapterNumber(section.subject, row.chapter) }}</span>
                {{ row.chapter }}
              </td>
```

Add to its `<script setup>`:

```ts
import { chapterNumber } from "../lib/chapterNumber";

const props = defineProps<{ menu: LevelMenu }>();

function formatChapterNumber(subject: string, chapter: string): string {
  const n = chapterNumber(props.menu.level, subject, chapter);
  return n === null ? "—" : String(n).padStart(2, "0");
}
```

Note this replaces the existing bare `defineProps<{ menu: LevelMenu }>();` call — the
props must be captured in a variable to be read in the function.

And to its `<style scoped>`:

```css
.chapter-num {
  display: inline-block;
  min-width: 26px;
  margin-right: 8px;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  opacity: 0.55;
}
```

- [ ] **Step 7: Run the suite**

Run: `npm test`
Expected: PASS. If other `UnfoldingCards` tests asserted on `.unfold-card` for chapters,
update those selectors to the spine rows — the `data-test="unfold-chapter-<name>"` hook is
deliberately preserved so navigation tests keep working.

- [ ] **Step 8: Verify in the browser**

Run `npm run dev`, pick a level, and confirm: numerals are per-matière and start at 01,
off-program chapters show "—", the rule runs down the list, and it holds up at 375px wide.

- [ ] **Step 9: Commit**

```bash
git add src/components/UnfoldingCards.vue src/components/UnfoldingCards.test.ts src/components/MenuTable.vue
git commit -m "feat: present chapters as a numbered contents spine"
```

---

## Task 10: The motion system

**Files:**
- Modify: `index.html` (motion custom properties)
- Modify: `src/App.vue` (route transition)
- Modify: `src/views/BrowseView.vue:31-38` (skeletons)
- Modify: `src/components/FileCard.vue` (hover)

**Interfaces:**
- Consumes: nothing. Produces the CSS custom properties `--pipc-fast`, `--pipc-base`,
  `--pipc-slow`, `--pipc-ease`, already referenced by Tasks 4 and 9.

- [ ] **Step 1: Define the tokens**

In `index.html`, inside the existing `<style>` block, add at the top:

```css
      :root {
        --pipc-fast: 120ms;
        --pipc-base: 220ms;
        --pipc-slow: 380ms;
        --pipc-ease: cubic-bezier(.2, .8, .2, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
```

- [ ] **Step 2: Add the route transition**

In `src/App.vue`, replace:

```html
    <v-main class="app-main">
      <router-view />
    </v-main>
```

with:

```html
    <v-main class="app-main">
      <router-view v-slot="{ Component, route: r }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="r.path" />
        </transition>
      </router-view>
    </v-main>
```

and add to its `<style scoped>`:

```css
.page-enter-active,
.page-leave-active {
  transition: opacity var(--pipc-base) var(--pipc-ease), transform var(--pipc-base) var(--pipc-ease);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
}
```

- [ ] **Step 3: Shape the skeletons like the cards**

In `src/views/BrowseView.vue`, replace the skeleton block:

```html
          <v-skeleton-loader type="card, article" class="rounded-xl border" />
```

with:

```html
          <div class="card-skeleton rounded-xl border" data-test="card-skeleton">
            <div class="sk-chip"></div>
            <div class="sk-line sk-line-lg"></div>
            <div class="sk-line sk-line-md"></div>
            <div class="sk-foot"></div>
          </div>
```

and add to its `<style scoped>`:

```css
/* A skeleton should be the shape of the thing it becomes: chip, two title lines and an
   action row, matching FileCard's real geometry. */
.card-skeleton {
  background: rgb(var(--v-theme-surface));
  padding: 16px;
  height: 100%;
}

.card-skeleton > * {
  background: linear-gradient(
    100deg,
    rgba(var(--v-theme-on-surface), 0.06) 30%,
    rgba(var(--v-theme-on-surface), 0.12) 50%,
    rgba(var(--v-theme-on-surface), 0.06) 70%
  );
  background-size: 220% 100%;
  animation: sk-shimmer 1.5s linear infinite;
  border-radius: 6px;
}

.sk-chip { width: 68px; height: 18px; border-radius: 999px; }
.sk-line { height: 12px; margin-top: 12px; }
.sk-line-lg { width: 92%; }
.sk-line-md { width: 64%; }
.sk-foot { height: 14px; width: 45%; margin-top: 22px; }

@keyframes sk-shimmer {
  from { background-position: 120% 0; }
  to { background-position: -120% 0; }
}
```

- [ ] **Step 4: Retune the card hover**

In `src/components/FileCard.vue`, the root class is `.course-card` (used by both the list
and grid modes; its rules start around line 159). Replace its transition and hover rules
with:

```css
.course-card {
  transition: transform var(--pipc-fast) var(--pipc-ease),
              border-color var(--pipc-fast) var(--pipc-ease);
}

.course-card:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--v-theme-primary), 0.5) !important;
}
```

Keep the rest of `.course-card`'s existing declarations (background, layout); only the
motion and hover treatment change.

- [ ] **Step 5: Retune the existing stagger**

In `src/components/UnfoldingCards.vue`, find the entrance keyframe/transition rules and
replace any hardcoded durations and easing curves with `var(--pipc-base)` and
`var(--pipc-ease)`. Leave the capped `staggerDelay()` logic alone.

- [ ] **Step 6: Verify in the browser**

Run `npm run dev` and check:
- Navigating between Parcourir / Menu / Examen fades and rises, no flash of empty space.
- `localStorage.clear()` + reload shows card-shaped skeletons, not Vuetify's generic ones.
- DevTools → Rendering → "Emulate prefers-reduced-motion": no animation anywhere, and the
  app remains fully usable.

- [ ] **Step 7: Run the suite**

Run: `npm test`
Expected: PASS. If a `BrowseView` test asserted on `v-skeleton-loader`, point it at
`[data-test="card-skeleton"]`.

- [ ] **Step 8: Full build check**

Run: `npm run build`
Expected: `vue-tsc` clean, the prerender reporting its page count, and
`dist/library-seed.json` present.

```bash
ls -la dist/library-seed.json
```

- [ ] **Step 9: Commit**

```bash
git add index.html src/App.vue src/views/BrowseView.vue src/components/FileCard.vue src/components/UnfoldingCards.vue
git commit -m "feat: add a shared motion system and card-shaped skeletons"
```

---

## Final verification

Before considering the work done, run all of it:

- [ ] `npm test` — full suite green.
- [ ] `npm run build` — `vue-tsc` clean; prerender writes pages, sitemap, robots and
      `dist/library-seed.json`.
- [ ] `npm run preview`, then with storage cleared: first paint shows real documents in
      well under a second (Network tab: `library-seed.json` served, backend request still
      in flight behind it).
- [ ] Splash: plays once per session, correct background in both themes, absent under
      reduced motion, absent with JS disabled.
- [ ] A prerendered deep link **with the trailing slash** (e.g. `/niveau/2eme-bac-sm/`) —
      `vite preview` does not redirect the bare path, so testing without the slash falsely
      looks broken.
- [ ] `view-source:` on a document page: `<meta name="author">` and the JSON-LD block are
      present in the served HTML, not just after hydration.
- [ ] Favicon at 16px in a real browser tab shows a legible π.
- [ ] 375px-wide viewport: header, chapter spine and cards all hold.
