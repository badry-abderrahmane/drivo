# Deep Links, Prerendered SEO, Document Pages & Search Folding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every resource a shareable, crawlable URL; serve prerendered HTML so the library is findable on Google; keep students in the app with a real document page; and make search match how students actually type.

**Architecture:** The Vue SPA switches from hash routing to history routing with path-based navigation state. A new `DocView` renders a document in-app. After `vite build`, a `vite-node` script fetches the manifest once and writes a static HTML file per URL — the built shell with per-page `<head>` metadata and a semantic content block injected — plus `sitemap.xml`, `robots.txt` and `404.html`. All prerender logic lives in a pure, tested `src/lib/seo.ts`; the script itself is a thin I/O shell.

**Tech Stack:** Vue 3 (`<script setup>`), Vuetify 3, vue-router 4, Vite 5, fuse.js 7, Vitest 2 + @vue/test-utils, `vite-node` 2.1.9 (already present via vitest — do NOT add a dependency).

**Spec:** `docs/superpowers/specs/2026-08-18-deep-links-seo-doc-page-design.md`

## Global Constraints

- **No new npm dependencies.** `vite-node` is already available at `node_modules/.bin/vite-node`.
- **UI copy is French.** Every user-visible string in this plan is French and must stay French.
- **Publication gate:** a file is student-visible only when `isClassified(item.meta)` is true (`src/lib/classification.ts`). Never bypass it in any public view or in the prerender.
- **Vite `base` is `/drivo/`** (`vite.config.ts`). The router base must match.
- **`SITE_URL = "https://badry-abderrahmane.github.io/drivo/"`** — with the trailing slash.
- **No backwards compatibility with `#/` URLs.** The app is not in production; build no redirect shim.
- **Do not modify `src/data/chapters.ts`** — reshaping it would ripple into the admin chapter picker.
- **Do not modify `apps-script/`.** Nothing here needs a backend redeploy.
- **TDD:** every task writes a failing test first, watches it fail, then implements.
- Run the full suite with `npm test`, a single file with `npx vitest run <path>`.

---

### Task 1: Text folding and slugs

Shared foundation. `foldText` gives search and slugs one definition of "equal text"; `slugify`/`resolveSlug` turn French labels into URL segments and back.

**Files:**
- Create: `src/lib/normalize.ts`
- Create: `src/lib/normalize.test.ts`
- Create: `src/lib/slug.ts`
- Create: `src/lib/slug.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `foldText(s: string): string`
  - `slugify(s: string): string`
  - `resolveSlug(slug: string, candidates: string[]): string | null`

- [ ] **Step 1: Write the failing tests**

`src/lib/normalize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { foldText } from "./normalize";

describe("foldText", () => {
  it("strips diacritics", () => {
    expect(foldText("Électricité")).toBe("electricite");
  });

  it("lowercases", () => {
    expect(foldText("ONDES")).toBe("ondes");
  });

  it("collapses and trims whitespace", () => {
    expect(foldText("  Dipôle   RC  ")).toBe("dipole rc");
  });

  it("leaves non-latin scripts alone", () => {
    expect(foldText("الموجات")).toBe("الموجات");
  });

  it("is idempotent", () => {
    expect(foldText(foldText("Mécanique"))).toBe(foldText("Mécanique"));
  });
});
```

`src/lib/slug.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slugify, resolveSlug } from "./slug";

describe("slugify", () => {
  it("slugifies a level label", () => {
    expect(slugify("2ème Bac SM")).toBe("2eme-bac-sm");
  });

  it("slugifies a chapter with punctuation", () => {
    expect(slugify("Oscillations libres d'un circuit RLC en série")).toBe(
      "oscillations-libres-d-un-circuit-rlc-en-serie"
    );
  });

  it("collapses runs of separators and trims them", () => {
    expect(slugify("  Noyaux, masse et énergie  ")).toBe("noyaux-masse-et-energie");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("resolveSlug", () => {
  const levels = ["Tronc Commun", "2ème Bac SM", "2ème Bac PC"];

  it("finds the label whose slug matches", () => {
    expect(resolveSlug("2eme-bac-sm", levels)).toBe("2ème Bac SM");
  });

  it("returns null for an unknown slug rather than guessing", () => {
    expect(resolveSlug("3eme-bac-xyz", levels)).toBeNull();
  });

  it("returns null for an empty slug", () => {
    expect(resolveSlug("", levels)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/normalize.test.ts src/lib/slug.test.ts`
Expected: FAIL — cannot resolve `./normalize` and `./slug`.

- [ ] **Step 3: Write the implementations**

`src/lib/normalize.ts`:

```ts
/**
 * The single definition of "the same text" for both search matching and URL slugs:
 * diacritics removed, lowercased, whitespace collapsed. Non-latin scripts (Arabic
 * chapter aliases) pass through untouched — they carry no combining marks to strip.
 */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
```

`src/lib/slug.ts`:

```ts
import { foldText } from "./normalize";

/** URL segment for a French label: "2ème Bac SM" -> "2eme-bac-sm". */
export function slugify(s: string): string {
  return foldText(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The label whose slug is `slug`, or null. Resolution is a lookup against real data,
 * never an attempt to un-slugify: an unknown slug must produce a clean not-found
 * rather than a plausible-looking guess.
 */
export function resolveSlug(slug: string, candidates: string[]): string | null {
  if (!slug) return null;
  return candidates.find((c) => slugify(c) === slug) ?? null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/normalize.test.ts src/lib/slug.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/normalize.ts src/lib/normalize.test.ts src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat: add text folding and URL slug helpers"
```

---

### Task 2: Accent-insensitive search with filenames and chapter aliases

**Files:**
- Create: `src/data/chapterAliases.ts`
- Create: `src/data/chapterAliases.test.ts`
- Modify: `src/lib/search.ts` (whole file rewritten)
- Modify: `src/lib/search.test.ts` (add cases; keep the existing ones passing)

**Interfaces:**
- Consumes: `foldText` from Task 1.
- Produces:
  - `CHAPTER_ALIASES: Record<string, string[]>`
  - `aliasesFor(chapters: string[]): string[]`
  - `buildSearchIndex(items: LibraryItem[]): Fuse<LibraryItem>` (unchanged signature)
  - `searchItems(index: Fuse<LibraryItem>, query: string): LibraryItem[]` (unchanged signature)

- [ ] **Step 1: Write the failing tests**

`src/data/chapterAliases.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CHAPTER_ALIASES, aliasesFor } from "./chapterAliases";

describe("aliasesFor", () => {
  it("returns aliases for a known chapter", () => {
    expect(aliasesFor(["Dipôle RC"])).toContain("condensateur");
  });

  it("returns nothing for an unknown chapter", () => {
    expect(aliasesFor(["Chapitre inventé"])).toEqual([]);
  });

  it("flattens aliases across several chapters", () => {
    const got = aliasesFor(["Dipôle RC", "Lois de Newton"]);
    expect(got).toContain("condensateur");
    expect(got).toContain("newton");
  });

  it("keys are real chapter labels, never empty", () => {
    for (const key of Object.keys(CHAPTER_ALIASES)) {
      expect(key.trim().length).toBeGreaterThan(0);
      expect(CHAPTER_ALIASES[key].length).toBeGreaterThan(0);
    }
  });
});
```

Append to `src/lib/search.test.ts` — inside the existing `describe("searchItems")`, extend the `items` array and add cases. Replace the existing `items` declaration with:

```ts
  const items = [
    item({ fileId: "1" }, "Mécanique du point"),
    item({ fileId: "2", tags: ["newton"] }, "TD1"),
    item({ fileId: "3", chapter: ["Le champ magnétique"] }, "Exercices"),
    item({ fileId: "4" }, "Optique géométrique"),
    item({ fileId: "5" }, "Électricité générale"),
    item({ fileId: "6", chapter: ["Dipôle RC"] }, "Serie 3"),
  ];
```

and add these cases:

```ts
  it("matches despite missing accents in the query", () => {
    expect(searchItems(index, "electricite").map((i) => i.fileId)).toContain("5");
  });

  it("matches despite accents in the query the title lacks", () => {
    expect(searchItems(index, "sérié 3").map((i) => i.fileId)).toContain("6");
  });

  it("matches on the raw Drive filename", () => {
    const withFilename = item({ fileId: "7" }, "Titre affiché");
    withFilename.name = "2bac-sm-ondes-mecaniques.pdf";
    const idx = buildSearchIndex([withFilename]);
    expect(searchItems(idx, "ondes mecaniques").map((i) => i.fileId)).toContain("7");
  });

  it("matches on a chapter alias", () => {
    expect(searchItems(index, "condensateur").map((i) => i.fileId)).toContain("6");
  });

  it("matches on an Arabic chapter alias", () => {
    const arabic = item({ fileId: "8", chapter: ["Ondes mécaniques progressives"] }, "Cours");
    const idx = buildSearchIndex([arabic]);
    expect(searchItems(idx, "الموجات").map((i) => i.fileId)).toContain("8");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/data/chapterAliases.test.ts src/lib/search.test.ts`
Expected: FAIL — cannot resolve `./chapterAliases`; the accent, filename and alias cases fail.

- [ ] **Step 3: Write `src/data/chapterAliases.ts`**

Keys MUST be copied verbatim from `src/data/chapters.ts` — an alias keyed to a label that does not exist there is dead weight.

```ts
// How students actually type chapter names: Arabic labels, transliterations and the
// shorthand used in class. Indexed as a virtual search key so a query never has to match
// the official French wording. Extending this map is content editing, not code — add a
// key copied verbatim from `chapters.ts` and list the ways students say it.

export const CHAPTER_ALIASES: Record<string, string[]> = {
  "Ondes mécaniques progressives": ["الموجات الميكانيكية", "ondes", "mawjat", "onde progressive"],
  "Ondes mécaniques progressives périodiques": ["الموجات الدورية", "ondes periodiques"],
  "Propagation des ondes lumineuses": ["الضوء", "diffraction", "lumiere"],
  "Décroissance radioactive": ["التناقص الإشعاعي", "radioactivite", "radioactif"],
  "Noyaux, masse et énergie": ["النواة", "energie nucleaire", "noyau"],
  "Dipôle RC": ["ثنائي القطب RC", "condensateur", "rc"],
  "Dipôle RL": ["ثنائي القطب RL", "bobine", "rl"],
  "Oscillations libres d'un circuit RLC en série": ["الدارة RLC", "rlc", "oscillations libres"],
  "Circuit RLC série en régime sinusoïdal forcé": ["rlc force", "regime force", "resonance"],
  "Ondes électromagnétiques": ["الأمواج الكهرمغنطيسية", "electromagnetique"],
  "Modulation d'amplitude": ["التضمين", "modulation", "am"],
  "Lois de Newton": ["قوانين نيوتن", "newton", "lois newton"],
  "Chute verticale d'un corps solide": ["السقوط الرأسي", "chute libre", "chute verticale"],
  "Mouvements plans : projectile dans le champ de pesanteur": ["projectile", "champ pesanteur", "mouvement plan"],
  "Mouvement des satellites et des planètes": ["الأقمار الاصطناعية", "satellites", "kepler", "planetes"],
  "Mouvement de rotation d'un solide autour d'un axe fixe": ["دوران جسم صلب", "rotation solide"],
  "Oscillateurs mécaniques": ["المتذبذب الميكانيكي", "pendule", "oscillateur"],
  "Transformations lentes et transformations rapides": ["التحولات السريعة والبطيئة", "transformations lentes"],
  "Suivi temporel d'une transformation chimique - Vitesse de réaction": ["سرعة التفاعل", "vitesse reaction", "suivi temporel"],
  "Dosage acido-basique": ["المعايرة", "dosage", "titrage", "acide base"],
  "Transformations spontanées dans les piles et production d'énergie": ["الأعمدة", "piles", "pile"],
  "Transformations forcées (électrolyse)": ["التحليل الكهربائي", "electrolyse"],
  "Réactions d'estérification et d'hydrolyse": ["الأسترة", "esterification", "hydrolyse", "ester"],
};

/** Every alias for the given chapters, flattened. Unknown chapters contribute nothing. */
export function aliasesFor(chapters: string[]): string[] {
  return chapters.flatMap((c) => CHAPTER_ALIASES[c] ?? []);
}
```

- [ ] **Step 4: Rewrite `src/lib/search.ts`**

```ts
import Fuse, { type IFuseOptions } from "fuse.js";
import type { LibraryItem } from "./types";
import { foldText } from "./normalize";
import { aliasesFor } from "../data/chapterAliases";

// The single search engine for the whole app: the command palette's live preview and the
// flat "all results" grid must agree on what counts as a match, or a hit shown in one place
// could vanish from the other for the exact same query.

/** Virtual key: chapter aliases are derived, not stored on the item. */
const ALIAS_KEY = "_aliases";

/** Plain dotted-path read. Written out rather than borrowed from Fuse internals. */
function valueAt(item: LibraryItem, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, k) => (acc == null ? acc : (acc as Record<string, unknown>)[k]), item);
}

function fold(value: unknown): string | string[] {
  if (typeof value === "string") return foldText(value);
  if (Array.isArray(value)) return value.map((v) => foldText(String(v)));
  return "";
}

const FUSE_OPTIONS: IFuseOptions<LibraryItem> = {
  keys: [
    { name: "displayTitle", weight: 0.45 },
    { name: "meta.chapter", weight: 0.3 },
    { name: "meta.tags", weight: 0.1 },
    // The raw Drive filename: a student sent "2bac-sm-ondes.pdf" searches for that,
    // not for the display title an admin later wrote.
    { name: "name", weight: 0.1 },
    { name: ALIAS_KEY, weight: 0.1 },
    { name: "meta.subject", weight: 0.05 },
    { name: "meta.description", weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  // Both sides of the comparison are folded, so "electricite" matches "Électricité"
  // deterministically instead of depending on the fuzzy threshold absorbing the accent.
  getFn: (item, path) => {
    const p = Array.isArray(path) ? path.join(".") : path;
    if (p === ALIAS_KEY) return aliasesFor(item.meta.chapter).map(foldText);
    return fold(valueAt(item, p));
  },
};

export function buildSearchIndex(items: LibraryItem[]): Fuse<LibraryItem> {
  return new Fuse(items, FUSE_OPTIONS);
}

/** Matches, best first. Empty/whitespace-only query returns no results, not everything. */
export function searchItems(index: Fuse<LibraryItem>, query: string): LibraryItem[] {
  const q = foldText(query);
  if (!q) return [];
  return index.search(q).map((r) => r.item);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/data/chapterAliases.test.ts src/lib/search.test.ts`
Expected: PASS. If the Arabic alias case fails, the cause is `minMatchCharLength` versus a short query — verify the query is at least 2 characters; do NOT lower the threshold to force a pass.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS. `SearchPalette.test.ts` exercises this engine — if a case there breaks, fix the cause, not the assertion.

- [ ] **Step 7: Commit**

```bash
git add src/data/chapterAliases.ts src/data/chapterAliases.test.ts src/lib/search.ts src/lib/search.test.ts
git commit -m "feat: fold accents and index filenames and chapter aliases in search"
```

---

### Task 3: History-mode router with path-based routes

Routes only. The views still read `route.query` after this task and are migrated in Task 4, so the app is briefly navigable by path without honouring it — that is expected and the suite stays green.

**Files:**
- Modify: `src/router.ts`
- Modify: `src/config.ts` (add `SITE_URL`)

**Interfaces:**
- Consumes: nothing.
- Produces: route names `browse`, `level`, `chapter`, `menu`, `menu-level`, `examen-national`, `examen-national-level`, `admin`. Task 6 adds `doc`.
- Produces: `SITE_URL` from `src/config.ts`.

- [ ] **Step 1: Add `SITE_URL` to `src/config.ts`**

Insert directly below the `BACKEND_URL` export:

```ts
/** Canonical origin + base path of the deployed site. Trailing slash required. */
export const SITE_URL = "https://badry-abderrahmane.github.io/drivo/";
```

- [ ] **Step 2: Rewrite `src/router.ts`**

```ts
import { createRouter, createWebHistory } from "vue-router";
import BrowseView from "./views/BrowseView.vue";
import MenuView from "./views/MenuView.vue";
import ExamenNationalView from "./views/ExamenNationalView.vue";
import AdminView from "./views/AdminView.vue";

// Path-based navigation state (not query params) so every level and chapter is a real
// URL that can be prerendered to a static file and indexed. `?search=` stays a query
// param: a result set is not a page worth indexing.
export default createRouter({
  history: createWebHistory("/drivo/"),
  routes: [
    { path: "/", name: "browse", component: BrowseView },
    { path: "/niveau/:level", name: "level", component: BrowseView },
    { path: "/niveau/:level/chapitre/:chapter", name: "chapter", component: BrowseView },
    { path: "/menu", name: "menu", component: MenuView },
    { path: "/menu/:level", name: "menu-level", component: MenuView },
    { path: "/examen-national", name: "examen-national", component: ExamenNationalView },
    { path: "/examen-national/:level", name: "examen-national-level", component: ExamenNationalView },
    { path: "/admin", name: "admin", component: AdminView },
  ],
});
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS, unchanged. Component tests mount components directly with their own router stubs, so the router module change should not reach them. If a test fails because it asserted a hash URL, update that assertion.

- [ ] **Step 4: Verify the dev server serves paths**

Run: `npm run dev`, then open `http://localhost:5173/drivo/menu`.
Expected: the Menu thématique page renders (Vite serves the SPA for unknown paths in dev). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/router.ts src/config.ts
git commit -m "feat: switch to history routing with path-based level and chapter routes"
```

---

### Task 4: Migrate drill-down state from query params to route params

`UnfoldingCards`, `MenuView` and `ExamenNationalView` each funnel their selection through one computed get/set pair. Each gets the same treatment: read a slug from `route.params`, resolve it against real labels, and write by pushing a named route.

**Files:**
- Modify: `src/components/UnfoldingCards.vue:200-217`
- Modify: `src/views/MenuView.vue:95-105`
- Modify: `src/views/ExamenNationalView.vue:101-111`
- Modify: `src/components/UnfoldingCards.test.ts`, `src/views/MenuView.test.ts`, `src/views/ExamenNationalView.test.ts`

**Interfaces:**
- Consumes: `slugify`, `resolveSlug` (Task 1); route names from Task 3.
- Produces: no new exports.

- [ ] **Step 1: Read the existing tests to learn how each mounts a router**

Run: `npx vitest run src/components/UnfoldingCards.test.ts src/views/MenuView.test.ts src/views/ExamenNationalView.test.ts`
Expected: PASS. Then read all three files and note how each provides routing — whether via a real `createRouter` or a `$route` mock. The updated tests must set `params` where they currently set `query`, using the same mechanism.

- [ ] **Step 2: Update the tests to drive params instead of query**

In each test file, replace navigation setup of the form `query: { level: "2ème Bac SM" }` with `params: { level: "2eme-bac-sm" }` (and `chapter: { ... }` likewise, slugified). Assertions about what the component pushes change from a query object to a named route, e.g.:

```ts
expect(push).toHaveBeenCalledWith({ name: "level", params: { level: "2eme-bac-sm" } });
```

Add one new case per file proving an unknown slug degrades safely — for `MenuView.test.ts`:

```ts
it("shows the level picker when the URL names an unknown level", async () => {
  const wrapper = mountWithVuetify(MenuView, {
    global: { mocks: { $route: { params: { level: "niveau-inexistant" }, query: {} } } },
  });
  await flushPromises();
  expect(wrapper.findAll('[data-test="level-card"]').length).toBeGreaterThan(0);
});
```

Adapt the mounting mechanism to whatever the file already uses.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/components/UnfoldingCards.test.ts src/views/MenuView.test.ts src/views/ExamenNationalView.test.ts`
Expected: FAIL — the components still read `route.query`, so a params-driven selection reads as null.

- [ ] **Step 4: Migrate `src/components/UnfoldingCards.vue`**

Add to the imports:

```ts
import { slugify, resolveSlug } from "../lib/slug";
```

Replace the two computed properties (currently lines 206-217):

```ts
// Drill-down position lives in the route path (not local state or a query param) so the
// browser's Back button steps back through Niveau -> Chapitre -> Documents, and every
// level and chapter is a real URL that can be prerendered and indexed. Slugs resolve
// against the levels and chapters actually present, so an unknown slug reads as null
// and the view falls back to its picker instead of showing an empty drill-down.
const availableLevels = computed(() => [...new Set(props.items.flatMap(levelsOf))]);

const selectedLevel = computed<string | null>({
  get: () => {
    const slug = route.params.level;
    return typeof slug === "string" ? resolveSlug(slug, availableLevels.value) : null;
  },
  set: (level) => {
    router.push(level ? { name: "level", params: { level: slugify(level) } } : { name: "browse" });
  },
});

const availableChapters = computed(() => {
  const lvl = selectedLevel.value;
  if (!lvl) return [];
  return [
    ...new Set(
      props.items.filter((it) => levelsOf(it).includes(lvl)).flatMap(chaptersOf)
    ),
  ];
});

const selectedChapter = computed<string | null>({
  get: () => {
    const slug = route.params.chapter;
    return typeof slug === "string" ? resolveSlug(slug, availableChapters.value) : null;
  },
  set: (chapter) => {
    const lvl = selectedLevel.value;
    if (!lvl) return;
    router.push(
      chapter
        ? { name: "chapter", params: { level: slugify(lvl), chapter: slugify(chapter) } }
        : { name: "level", params: { level: slugify(lvl) } }
    );
  },
});
```

- [ ] **Step 5: Migrate `src/views/MenuView.vue`**

Add `import { slugify, resolveSlug } from "../lib/slug";` and `import { menuLevels } from "../lib/menu";` is already present. Replace the computed (currently lines 98-105):

```ts
// Selected level lives in the route path, not local state, so Back steps out to the level
// picker instead of leaving the app, and each level is a real, shareable, indexable URL.
const selectedLevel = computed<string | null>({
  get: () => {
    const slug = route.params.level;
    return typeof slug === "string" ? resolveSlug(slug, menuLevels()) : null;
  },
  set: (level) => {
    router.push(level ? { name: "menu-level", params: { level: slugify(level) } } : { name: "menu" });
  },
});
```

- [ ] **Step 6: Migrate `src/views/ExamenNationalView.vue`**

Add `import { slugify, resolveSlug } from "../lib/slug";`. `EXAMEN_NATIONAL_LEVELS` is already imported. Replace the computed (currently lines 104-111):

```ts
// Selected level lives in the route path, not local state, so Back steps out to the
// filière picker instead of leaving the app, and each filière is a shareable, indexable URL.
const selectedLevel = computed<string | null>({
  get: () => {
    const slug = route.params.level;
    return typeof slug === "string" ? resolveSlug(slug, [...EXAMEN_NATIONAL_LEVELS]) : null;
  },
  set: (level) => {
    router.push(
      level
        ? { name: "examen-national-level", params: { level: slugify(level) } }
        : { name: "examen-national" }
    );
  },
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/components/UnfoldingCards.test.ts src/views/MenuView.test.ts src/views/ExamenNationalView.test.ts`
Expected: PASS.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/UnfoldingCards.vue src/components/UnfoldingCards.test.ts src/views/MenuView.vue src/views/MenuView.test.ts src/views/ExamenNationalView.vue src/views/ExamenNationalView.test.ts
git commit -m "feat: drive level and chapter selection from route params"
```

---

### Task 5: Drive download URLs

**Files:**
- Modify: `src/lib/drivePreview.ts`
- Modify: `src/lib/drivePreview.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `driveDownloadUrl(fileId: string, mimeType?: string): string`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/drivePreview.test.ts`:

```ts
import { driveDownloadUrl } from "./drivePreview";

describe("driveDownloadUrl", () => {
  it("exports a Google Doc as PDF", () => {
    expect(driveDownloadUrl("abc", "application/vnd.google-apps.document")).toBe(
      "https://docs.google.com/document/d/abc/export?format=pdf"
    );
  });

  it("exports a Google Sheet as PDF", () => {
    expect(driveDownloadUrl("abc", "application/vnd.google-apps.spreadsheet")).toBe(
      "https://docs.google.com/spreadsheets/d/abc/export?format=pdf"
    );
  });

  it("downloads a binary file directly", () => {
    expect(driveDownloadUrl("abc", "application/pdf")).toBe(
      "https://drive.google.com/uc?export=download&id=abc"
    );
  });

  it("downloads directly when the mime type is unknown", () => {
    expect(driveDownloadUrl("abc")).toBe("https://drive.google.com/uc?export=download&id=abc");
  });
});
```

Merge the import with the file's existing import from `./drivePreview` rather than adding a second import statement.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/drivePreview.test.ts`
Expected: FAIL — `driveDownloadUrl is not a function`.

- [ ] **Step 3: Append the implementation to `src/lib/drivePreview.ts`**

```ts
/**
 * A URL that saves the file rather than opening it. Google-native docs have no binary to
 * download, so they are exported as PDF; everything else uses Drive's direct-download
 * endpoint. Reuses the same mime-type split as the preview and open URLs.
 */
export function driveDownloadUrl(fileId: string, mimeType?: string): string {
  const host = docHost(mimeType);
  if (host) return `https://docs.google.com/${host}/d/${fileId}/export?format=pdf`;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/drivePreview.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/drivePreview.ts src/lib/drivePreview.test.ts
git commit -m "feat: add Drive download URLs"
```

---

### Task 6: Document lookup, related documents, and DocView

**Files:**
- Create: `src/lib/doc.ts`
- Create: `src/lib/doc.test.ts`
- Create: `src/views/DocView.vue`
- Create: `src/views/DocView.test.ts`
- Modify: `src/router.ts` (add the `doc` route)

**Interfaces:**
- Consumes: `isClassified` (`src/lib/classification.ts`), `slugify` (Task 1), `drivePreviewUrl`/`driveOpenUrl`/`driveDownloadUrl` (Task 5), `useLibrary`.
- Produces:
  - `findDoc(items: LibraryItem[], fileId: string): LibraryItem | null`
  - `relatedDocs(items: LibraryItem[], item: LibraryItem, limit?: number): LibraryItem[]`
  - `docSlug(item: LibraryItem): string`
  - route name `doc` at `/doc/:fileId/:slug?`

- [ ] **Step 1: Write the failing tests for `src/lib/doc.ts`**

`src/lib/doc.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { findDoc, relatedDocs, docSlug } from "./doc";
import type { LibraryItem } from "./types";

const make = (fileId: string, over: Partial<LibraryItem["meta"]> = {}, title = "Titre"): LibraryItem => ({
  fileId,
  name: `${fileId}.pdf`,
  mimeType: "application/pdf",
  path: [],
  webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false,
  displayTitle: title,
  meta: {
    fileId,
    level: over.level ?? ["2ème Bac SM"],
    type: over.type ?? "Cours",
    subject: over.subject ?? "Physique",
    chapter: over.chapter ?? ["Dipôle RC"],
    title: over.title ?? "",
    description: over.description ?? "",
    tags: over.tags ?? [],
    order: over.order ?? 0,
  },
});

describe("findDoc", () => {
  it("finds a classified document by id", () => {
    const items = [make("a"), make("b")];
    expect(findDoc(items, "b")?.fileId).toBe("b");
  });

  it("returns null for an unknown id", () => {
    expect(findDoc([make("a")], "zzz")).toBeNull();
  });

  it("returns null for an unclassified document, so it stays unpublished", () => {
    const unclassified = make("c", { chapter: [] });
    expect(findDoc([unclassified], "c")).toBeNull();
  });
});

describe("relatedDocs", () => {
  it("returns documents sharing a level and a chapter", () => {
    const target = make("a");
    const sibling = make("b");
    expect(relatedDocs([target, sibling], target).map((i) => i.fileId)).toEqual(["b"]);
  });

  it("excludes the document itself", () => {
    const target = make("a");
    expect(relatedDocs([target], target)).toEqual([]);
  });

  it("excludes documents from another chapter", () => {
    const target = make("a");
    const other = make("b", { chapter: ["Lois de Newton"] });
    expect(relatedDocs([target, other], target)).toEqual([]);
  });

  it("excludes documents from another level", () => {
    const target = make("a");
    const other = make("b", { level: ["2ème Bac PC"] });
    expect(relatedDocs([target, other], target)).toEqual([]);
  });

  it("excludes unclassified documents", () => {
    const target = make("a");
    const draft = make("b", { type: "" });
    expect(relatedDocs([target, draft], target)).toEqual([]);
  });

  it("caps the result at the limit", () => {
    const target = make("a");
    const siblings = Array.from({ length: 12 }, (_, i) => make(`s${i}`));
    expect(relatedDocs([target, ...siblings], target).length).toBe(8);
    expect(relatedDocs([target, ...siblings], target, 3).length).toBe(3);
  });
});

describe("docSlug", () => {
  it("slugifies the display title", () => {
    expect(docSlug(make("a", {}, "Dipôle RC — Cours"))).toBe("dipole-rc-cours");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/doc.test.ts`
Expected: FAIL — cannot resolve `./doc`.

- [ ] **Step 3: Write `src/lib/doc.ts`**

```ts
import type { LibraryItem } from "./types";
import { isClassified } from "./classification";
import { slugify } from "./slug";

/** Documents in the same chapter, shown at the bottom of a document page. */
const RELATED_LIMIT = 8;

/**
 * The published document with this id, or null. An unclassified file resolves to null
 * exactly like an unknown id: a direct URL must not become a side door to a file that is
 * deliberately absent from every other student-facing view.
 */
export function findDoc(items: LibraryItem[], fileId: string): LibraryItem | null {
  const found = items.find((it) => it.fileId === fileId);
  return found && isClassified(found.meta) ? found : null;
}

/**
 * Published siblings sharing at least one level AND at least one chapter with `item`,
 * excluding itself. These links are what a student browses next, and they are also the
 * internal link graph a crawler follows from any single indexed page into the library.
 */
export function relatedDocs(
  items: LibraryItem[],
  item: LibraryItem,
  limit: number = RELATED_LIMIT
): LibraryItem[] {
  return items
    .filter(
      (it) =>
        it.fileId !== item.fileId &&
        isClassified(it.meta) &&
        it.meta.level.some((l) => item.meta.level.includes(l)) &&
        it.meta.chapter.some((c) => item.meta.chapter.includes(c))
    )
    .slice(0, limit);
}

/** The decorative, human-readable half of a document URL. */
export function docSlug(item: LibraryItem): string {
  return slugify(item.displayTitle);
}
```

- [ ] **Step 4: Run to verify the lib tests pass**

Run: `npx vitest run src/lib/doc.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Add the `doc` route to `src/router.ts`**

Add the import and the route immediately before the `/admin` entry:

```ts
import DocView from "./views/DocView.vue";
```

```ts
    { path: "/doc/:fileId/:slug?", name: "doc", component: DocView },
```

- [ ] **Step 6: Write the failing `src/views/DocView.test.ts`**

Follow the mounting conventions already used by `src/views/MenuView.test.ts` — read it first and mirror how it stubs `useLibrary` and the route.

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "../test/setup";
import DocView from "./DocView.vue";
import type { LibraryItem } from "../lib/types";

const make = (fileId: string, over: Partial<LibraryItem["meta"]> = {}, title = "Dipôle RC — Cours"): LibraryItem => ({
  fileId,
  name: `${fileId}.pdf`,
  mimeType: "application/pdf",
  path: [],
  webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false,
  displayTitle: title,
  meta: {
    fileId,
    level: over.level ?? ["2ème Bac SM"],
    type: over.type ?? "Cours",
    subject: over.subject ?? "Physique",
    chapter: over.chapter ?? ["Dipôle RC"],
    title: "",
    description: over.description ?? "",
    tags: [],
    order: 0,
  },
});

const library = { items: { value: [] as LibraryItem[] }, loading: { value: false }, error: { value: null } };

vi.mock("../composables/useLibrary", () => ({
  useLibrary: () => ({ ...library, refreshing: { value: false }, stale: { value: false }, ensureLoaded: vi.fn() }),
}));

function mountAt(fileId: string) {
  return mountWithVuetify(DocView, {
    global: {
      mocks: { $route: { params: { fileId }, query: {} } },
      stubs: { RouterLink: { template: "<a><slot /></a>" } },
    },
  });
}

beforeEach(() => {
  library.items.value = [];
  library.loading.value = false;
});

describe("DocView", () => {
  it("renders the document title and metadata", async () => {
    library.items.value = [make("a")];
    const w = mountAt("a");
    await flushPromises();
    expect(w.text()).toContain("Dipôle RC — Cours");
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("Physique");
  });

  it("embeds the Drive preview for the document", async () => {
    library.items.value = [make("a")];
    const w = mountAt("a");
    await flushPromises();
    expect(w.find('[data-test="doc-frame"]').attributes("src")).toBe(
      "https://drive.google.com/file/d/a/preview"
    );
  });

  it("offers a download link", async () => {
    library.items.value = [make("a")];
    const w = mountAt("a");
    await flushPromises();
    expect(w.find('[data-test="doc-download"]').attributes("href")).toBe(
      "https://drive.google.com/uc?export=download&id=a"
    );
  });

  it("shows a skeleton while the library loads", async () => {
    library.loading.value = true;
    const w = mountAt("a");
    await flushPromises();
    expect(w.find('[data-test="doc-skeleton"]').exists()).toBe(true);
  });

  it("shows not-found for an unknown id", async () => {
    library.items.value = [make("a")];
    const w = mountAt("zzz");
    await flushPromises();
    expect(w.find('[data-test="doc-not-found"]').exists()).toBe(true);
  });

  it("shows not-found for an unclassified document", async () => {
    library.items.value = [make("a", { chapter: [] })];
    const w = mountAt("a");
    await flushPromises();
    expect(w.find('[data-test="doc-not-found"]').exists()).toBe(true);
  });

  it("lists related documents from the same chapter", async () => {
    library.items.value = [make("a"), make("b", {}, "Dipôle RC — Exercices")];
    const w = mountAt("a");
    await flushPromises();
    expect(w.findAll('[data-test="doc-related"]').length).toBe(1);
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `npx vitest run src/views/DocView.test.ts`
Expected: FAIL — cannot resolve `./DocView.vue`.

- [ ] **Step 8: Write `src/views/DocView.vue`**

```vue
<template>
  <div class="doc-view max-width-xl mx-auto py-8 px-4 px-md-6">
    <div v-if="loading" data-test="doc-skeleton">
      <v-skeleton-loader type="heading, chip, image" class="rounded-xl" />
    </div>

    <v-card
      v-else-if="!doc"
      data-test="doc-not-found"
      class="text-center py-12 px-4 rounded-2xl border"
      variant="flat"
    >
      <v-icon icon="mdi-file-question-outline" size="64" color="medium-emphasis" class="mb-4" />
      <h1 class="text-h6 font-weight-bold mb-1">Ressource introuvable</h1>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Ce document n'existe pas ou n'est pas encore publié.
      </p>
      <v-btn :to="{ name: 'browse' }" color="primary" variant="flat" class="rounded-pill px-6">
        Retour à la bibliothèque
      </v-btn>
    </v-card>

    <template v-else>
      <!-- Breadcrumb: orientation for students, and extra crawl paths up to the
           chapter and level pages for search engines. -->
      <nav class="d-flex align-center flex-wrap ga-1 text-caption text-medium-emphasis mb-4">
        <router-link :to="{ name: 'browse' }" class="text-decoration-none color-inherit">Bibliothèque</router-link>
        <template v-if="primaryLevel">
          <span>›</span>
          <router-link
            :to="{ name: 'level', params: { level: slugify(primaryLevel) } }"
            class="text-decoration-none color-inherit"
          >{{ primaryLevel }}</router-link>
        </template>
        <template v-if="primaryLevel && primaryChapter">
          <span>›</span>
          <router-link
            :to="{ name: 'chapter', params: { level: slugify(primaryLevel), chapter: slugify(primaryChapter) } }"
            class="text-decoration-none color-inherit"
          >{{ primaryChapter }}</router-link>
        </template>
      </nav>

      <h1 class="text-h4 font-weight-black font-heading mb-3">{{ doc.displayTitle }}</h1>

      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <v-chip v-if="doc.meta.type" size="small" color="primary" variant="tonal" class="font-weight-bold rounded-pill">
          {{ doc.meta.type }}
        </v-chip>
        <v-chip v-if="doc.meta.subject" size="small" variant="tonal" class="rounded-pill">
          {{ doc.meta.subject }}
        </v-chip>
        <v-chip v-for="lvl in doc.meta.level" :key="lvl" size="small" variant="tonal" class="rounded-pill">
          {{ lvl }}
        </v-chip>
      </div>

      <div v-if="doc.meta.chapter.length" class="d-flex flex-wrap ga-1 mb-4">
        <v-chip v-for="ch in doc.meta.chapter" :key="ch" size="x-small" variant="outlined" class="rounded-pill">
          {{ ch }}
        </v-chip>
      </div>

      <p v-if="doc.meta.description" class="text-body-1 text-medium-emphasis mb-6">
        {{ doc.meta.description }}
      </p>

      <div class="doc-frame-wrapper rounded-xl overflow-hidden border mb-4">
        <iframe :src="previewSrc" data-test="doc-frame" class="doc-frame" allowfullscreen />
      </div>

      <div class="d-flex flex-wrap ga-2 mb-10">
        <v-btn
          :href="downloadHref"
          data-test="doc-download"
          color="primary"
          variant="flat"
          prepend-icon="mdi-download-outline"
          class="rounded-pill px-5"
        >
          Télécharger
        </v-btn>
        <v-btn
          :href="openHref"
          target="_blank"
          rel="noopener"
          variant="tonal"
          prepend-icon="mdi-open-in-new"
          class="rounded-pill px-5"
        >
          Ouvrir dans Drive
        </v-btn>
        <v-btn
          data-test="doc-share"
          variant="tonal"
          prepend-icon="mdi-share-variant-outline"
          class="rounded-pill px-5"
          @click="share"
        >
          Partager
        </v-btn>
      </div>

      <template v-if="related.length">
        <h2 class="text-h6 font-weight-bold font-heading mb-3">Dans le même chapitre</h2>
        <v-row>
          <v-col v-for="it in related" :key="it.fileId" cols="12" sm="6" md="4">
            <FileCard :item="it" mode="grid" data-test="doc-related" />
          </v-col>
        </v-row>
      </template>

      <v-snackbar v-model="shared" timeout="2500">Lien copié</v-snackbar>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import FileCard from "../components/FileCard.vue";
import { useLibrary } from "../composables/useLibrary";
import { findDoc, relatedDocs } from "../lib/doc";
import { slugify } from "../lib/slug";
import { drivePreviewUrl, driveOpenUrl, driveDownloadUrl } from "../lib/drivePreview";

const { items, loading, ensureLoaded } = useLibrary();
const route = useRoute();

const fileId = computed(() => (typeof route.params.fileId === "string" ? route.params.fileId : ""));

// `findDoc` returns null for an unclassified file as well as an unknown id, so a direct
// URL can't reach a document that every other student-facing view hides.
const doc = computed(() => findDoc(items.value, fileId.value));

const primaryLevel = computed(() => doc.value?.meta.level[0] ?? null);
const primaryChapter = computed(() => doc.value?.meta.chapter[0] ?? null);

const previewSrc = computed(() => (doc.value ? drivePreviewUrl(doc.value.fileId, doc.value.mimeType) : ""));
const openHref = computed(() => (doc.value ? driveOpenUrl(doc.value.fileId, doc.value.mimeType) : "#"));
const downloadHref = computed(() => (doc.value ? driveDownloadUrl(doc.value.fileId, doc.value.mimeType) : "#"));

const related = computed(() => (doc.value ? relatedDocs(items.value, doc.value) : []));

// Most students are on mobile, where the native share sheet is what they expect;
// the clipboard is the desktop fallback.
const shared = ref(false);
async function share(): Promise<void> {
  const url = window.location.href;
  const title = doc.value?.displayTitle ?? "PIPC";
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch {
      /* dismissed — fall through to copying */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    shared.value = true;
  } catch {
    /* clipboard unavailable — nothing useful to offer */
  }
}

onMounted(ensureLoaded);
</script>

<style scoped>
.doc-view {
  max-width: 1100px;
}
.doc-frame-wrapper {
  width: 100%;
  height: 72vh;
  background: #000;
}
.doc-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
```

- [ ] **Step 9: Run to verify the component tests pass**

Run: `npx vitest run src/views/DocView.test.ts`
Expected: PASS (7 tests). If the `useLibrary` mock shape does not match the real composable, align the mock with `src/composables/useLibrary.ts` rather than changing the component.

- [ ] **Step 10: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/doc.ts src/lib/doc.test.ts src/views/DocView.vue src/views/DocView.test.ts src/router.ts
git commit -m "feat: add in-app document page with preview, download and share"
```

---

### Task 7: Route cards to the document page and retire the preview modal

**Files:**
- Modify: `src/components/FileCard.vue` (both `v-card` roots)
- Modify: `src/components/FileCard.test.ts`
- Modify: `src/components/SearchPalette.vue`
- Modify: `src/components/MenuTable.vue`
- Modify: `src/views/MenuView.vue` (drop the `FilePreview` usage)
- Modify: `src/views/ExamenNationalView.vue` (drop the `FilePreview` usage if present)
- Delete: `src/components/FilePreview.vue`, `src/components/FilePreview.test.ts`

**Interfaces:**
- Consumes: `docSlug` (Task 6); route name `doc`.
- Produces: no new exports.

- [ ] **Step 1: Update `src/components/FileCard.test.ts` to expect a router link**

Replace assertions of the form `expect(card.attributes("href")).toBe(item.webViewLink)` with a check that the card is a `RouterLink` to the document route. Mirror how other component tests stub `RouterLink`; a minimal stub that records its `to` prop works:

```ts
const RouterLinkStub = {
  props: ["to"],
  template: "<a :data-to='JSON.stringify(to)'><slot /></a>",
};

it("links to the in-app document page, not to Drive", () => {
  const w = mountWithVuetify(FileCard, {
    props: { item },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  const to = JSON.parse(w.find("[data-to]").attributes("data-to") as string);
  expect(to).toEqual({ name: "doc", params: { fileId: item.fileId, slug: "dipole-rc-cours" } });
});
```

Add the same assertion for `mode: "list"`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/FileCard.test.ts`
Expected: FAIL — the card still renders an `href` to Drive.

- [ ] **Step 3: Rewire `src/components/FileCard.vue`**

On BOTH `v-card` roots (list mode and grid mode), replace these three attributes:

```
    :href="item.webViewLink"
    target="_blank"
    rel="noopener"
```

with:

```
    :to="docRoute"
```

Add to the `<script setup>` imports and computed properties:

```ts
import { docSlug } from "../lib/doc";
```

```ts
// Cards open the in-app document page rather than ejecting the student to Drive; the
// document page carries the Drive preview plus download and share actions.
const docRoute = computed(() => ({
  name: "doc",
  params: { fileId: props.item.fileId, slug: docSlug(props.item) },
}));
```

- [ ] **Step 4: Run to verify the card tests pass**

Run: `npx vitest run src/components/FileCard.test.ts`
Expected: PASS.

- [ ] **Step 5: Point the search palette at the document page**

In `src/components/SearchPalette.vue`, `resultToItem` currently ends with:

```ts
    onClick: () => window.open(it.webViewLink, "_blank", "noopener"),
```

Replace that line with:

```ts
    onClick: () => router.push({ name: "doc", params: { fileId: it.fileId, slug: docSlug(it) } }),
```

Add `import { docSlug } from "../lib/doc";` to the imports. Leave the "Voir tous les résultats" handler (`router.push({ name: "browse", query: { search: q } })`) untouched — a search result set stays a query param.

Add a case to `src/components/SearchPalette.test.ts` asserting that selecting a result pushes the `doc` route rather than calling `window.open`.

- [ ] **Step 6: Point the menu table at the document page**

In `src/components/MenuTable.vue`:

Replace the click handler on line 29:

```
                    @click="emit('preview', f)"
```

with:

```
                    @click="goToDoc(f)"
```

Delete the emit declaration on line 49 (`const emit = defineEmits<{ preview: [LibraryItem] }>();`) and add in its place:

```ts
import { useRouter } from "vue-router";
import { docSlug } from "../lib/doc";

const router = useRouter();

// Rows open the in-app document page; the menu no longer raises a preview modal.
function goToDoc(f: LibraryItem): void {
  router.push({ name: "doc", params: { fileId: f.fileId, slug: docSlug(f) } });
}
```

Put the two `import` lines with the file's other imports rather than mid-body.

- [ ] **Step 7: Remove the preview modal from the views**

In `src/views/MenuView.vue`: delete the `<FilePreview v-model="previewDialog" :item="previewItem" />` element, the `import FilePreview from "../components/FilePreview.vue";` line, the `@preview="openPreview"` binding on `<MenuTable>`, and the `previewDialog`/`previewItem`/`openPreview` state and handler.

Then confirm nothing else references the component:

```bash
grep -rn "FilePreview\|openPreview\|previewDialog\|previewItem" src
```

Expected after the edit: no matches outside the files being deleted. Clean up whatever it reports (`src/views/ExamenNationalView.vue` may or may not use them).

- [ ] **Step 8: Delete the modal**

```bash
git rm src/components/FilePreview.vue src/components/FilePreview.test.ts
```

- [ ] **Step 9: Type-check and run the full suite**

Run: `npx vue-tsc --noEmit && npm test`
Expected: PASS. The type-check is what catches a leftover reference to the deleted component or to a removed emit. Fix any test that still mounts `FilePreview` by deleting that case — the component is gone by design.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: open documents in-app and remove the preview modal"
```

---

### Task 8: SEO page model

Pure functions only — no filesystem, no network. This is where every prerender decision becomes testable.

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/lib/seo.test.ts`

**Interfaces:**
- Consumes: `slugify`, `docSlug`, `isClassified`, `menuLevels` (`src/lib/menu.ts`), `SITE_URL`, `EXAMEN_NATIONAL_LEVELS`, `EXAMEN_NATIONAL_TYPE`.
- Produces:
  - `interface PageMeta { path: string; title: string; description: string; body: string; lastmod?: string; noindex?: boolean; ogImage?: string }`
  - `enumeratePages(items: LibraryItem[]): PageMeta[]` — emits a file for EVERY matchable route, including `/admin` (noindex), because an un-emitted route resolves to `404.html` on GitHub Pages
  - `absoluteUrl(path: string): string`
  - `levelPath(level: string): string`, `chapterPath(level: string, chapter: string): string`, `documentPath(item: LibraryItem): string`
  - `injectPage(shell: string, page: PageMeta): string`
  - `sitemapXml(pages: PageMeta[]): string`
  - `robotsTxt(): string`
  - `escapeHtml(s: string): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/seo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { enumeratePages, absoluteUrl, injectPage, sitemapXml, robotsTxt, escapeHtml } from "./seo";
import type { LibraryItem } from "./types";

const make = (fileId: string, over: Partial<LibraryItem["meta"]> = {}, title = "Dipôle RC — Cours"): LibraryItem => ({
  fileId,
  name: `${fileId}.pdf`,
  mimeType: "application/pdf",
  path: [],
  webViewLink: "u",
  modifiedTime: "2026-03-04T10:00:00.000Z",
  isFolder: false,
  displayTitle: title,
  meta: {
    fileId,
    level: over.level ?? ["2ème Bac SM"],
    type: over.type ?? "Cours",
    subject: over.subject ?? "Physique",
    chapter: over.chapter ?? ["Dipôle RC"],
    title: "",
    description: over.description ?? "",
    tags: [],
    order: 0,
  },
});

const SHELL = `<!doctype html><html lang="fr"><head><title>PIPC</title></head><body><div id="app"></div></body></html>`;

describe("escapeHtml", () => {
  it("escapes the characters that would break an attribute or a tag", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("absoluteUrl", () => {
  it("joins the site base with a path without doubling the slash", () => {
    expect(absoluteUrl("/menu")).toBe("https://badry-abderrahmane.github.io/drivo/menu");
  });

  it("maps the root path to the base itself", () => {
    expect(absoluteUrl("/")).toBe("https://badry-abderrahmane.github.io/drivo/");
  });
});

describe("enumeratePages", () => {
  const items = [make("a"), make("b", {}, "Dipôle RC — Exercices"), make("c", { chapter: ["Lois de Newton"] }, "Newton")];
  const paths = enumeratePages(items).map((p) => p.path);

  it("includes the static pages", () => {
    expect(paths).toContain("/");
    expect(paths).toContain("/menu");
    expect(paths).toContain("/examen-national");
  });

  it("includes a page per level in use", () => {
    expect(paths).toContain("/niveau/2eme-bac-sm");
  });

  it("includes a page per level and chapter in use", () => {
    expect(paths).toContain("/niveau/2eme-bac-sm/chapitre/dipole-rc");
    expect(paths).toContain("/niveau/2eme-bac-sm/chapitre/lois-de-newton");
  });

  it("includes a slugged page per document", () => {
    expect(paths).toContain("/doc/a/dipole-rc-cours");
  });

  it("excludes unclassified documents", () => {
    const withDraft = enumeratePages([...items, make("d", { type: "" })]).map((p) => p.path);
    expect(withDraft.some((p) => p.startsWith("/doc/d"))).toBe(false);
  });

  it("includes a page per level for the menu and the national exam", () => {
    expect(paths).toContain("/menu/2eme-bac-sm");
    expect(paths).toContain("/examen-national/2eme-bac-sm");
  });

  it("emits the admin page so its URL is not a 404, but marks it noindex", () => {
    const admin = enumeratePages(items).find((p) => p.path === "/admin");
    expect(admin).toBeDefined();
    expect(admin?.noindex).toBe(true);
  });

  it("keeps the admin page out of the sitemap", () => {
    expect(sitemapXml(enumeratePages(items))).not.toContain("/drivo/admin<");
  });

  it("gives a document page a title carrying its type and level", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.title).toBe("Dipôle RC — Cours — Cours, 2ème Bac SM | PIPC");
  });

  it("generates a description when the admin wrote none", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.description).toContain("Physique");
    expect(doc?.description).toContain("2ème Bac SM");
  });

  it("prefers the admin's description when there is one", () => {
    const pages = enumeratePages([make("a", { description: "Résumé du cours sur le condensateur." })]);
    const doc = pages.find((p) => p.path.startsWith("/doc/a"));
    expect(doc?.description).toBe("Résumé du cours sur le condensateur.");
  });

  it("carries the document's modifiedTime as lastmod", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.lastmod).toBe("2026-03-04");
  });

  it("links a document page to its siblings so crawlers can walk the library", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.body).toContain('href="/drivo/doc/b/dipole-rc-exercices"');
  });

  it("escapes document titles in the body", () => {
    const pages = enumeratePages([make("a", {}, "A <b> & C")]);
    expect(pages.find((p) => p.path.startsWith("/doc/a"))?.body).toContain("A &lt;b&gt; &amp; C");
  });
});

describe("injectPage", () => {
  const page = enumeratePages([make("a")]).find((p) => p.path.startsWith("/doc/a"))!;
  const html = injectPage(SHELL, page);

  it("replaces the shell title", () => {
    expect(html).toContain(`<title>${escapeHtml(page.title)}</title>`);
    expect(html).not.toContain("<title>PIPC</title>");
  });

  it("adds a description, a canonical link and OG tags", () => {
    expect(html).toContain('<meta name="description"');
    expect(html).toContain(`<link rel="canonical" href="${absoluteUrl(page.path)}">`);
    expect(html).toContain('<meta property="og:title"');
  });

  it("injects the content block into the app container", () => {
    expect(html).toContain('<div id="app">');
    expect(html).toContain("<h1>");
    expect(html).not.toContain('<div id="app"></div>');
  });

  it("marks a noindex page as noindex", () => {
    const out = injectPage(SHELL, { ...page, noindex: true });
    expect(out).toContain('<meta name="robots" content="noindex">');
  });
});

describe("sitemapXml", () => {
  const pages = enumeratePages([make("a")]);
  const xml = sitemapXml(pages);

  it("lists absolute URLs", () => {
    expect(xml).toContain("<loc>https://badry-abderrahmane.github.io/drivo/</loc>");
  });

  it("includes lastmod when known", () => {
    expect(xml).toContain("<lastmod>2026-03-04</lastmod>");
  });

  it("omits noindex pages", () => {
    const out = sitemapXml([...pages, { path: "/x", title: "x", description: "x", body: "", noindex: true }]);
    expect(out).not.toContain("/drivo/x<");
  });

  it("is well-formed", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});

describe("robotsTxt", () => {
  it("disallows admin and points at the sitemap", () => {
    const out = robotsTxt();
    expect(out).toContain("Disallow: /drivo/admin");
    expect(out).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — cannot resolve `./seo`.

- [ ] **Step 3: Write `src/lib/seo.ts`**

```ts
import type { LibraryItem } from "./types";
import { isClassified } from "./classification";
import { slugify } from "./slug";
import { docSlug } from "./doc";
import { menuLevels } from "./menu";
import { SITE_URL, EXAMEN_NATIONAL_LEVELS, EXAMEN_NATIONAL_TYPE } from "../config";

/**
 * One prerenderable page. `body` is a semantic HTML block written into `<div id="app">`:
 * Vue's mount() clears that container before mounting, so a visitor never sees it, while a
 * crawler that runs no JavaScript still gets the heading, the metadata and — crucially —
 * real <a href> links it can follow into the rest of the library.
 */
export interface PageMeta {
  path: string;
  title: string;
  description: string;
  body: string;
  lastmod?: string;
  noindex?: boolean;
  ogImage?: string;
}

const SUFFIX = " | PIPC";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** SITE_URL ends with a slash and every path starts with one; join without doubling it. */
export function absoluteUrl(path: string): string {
  return SITE_URL.replace(/\/$/, "") + path;
}

/** The in-site href a crawler follows: the Vite base plus the route path. */
function href(path: string): string {
  return "/drivo" + path;
}

function isoDate(t: string): string | undefined {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function link(path: string, label: string): string {
  return `<a href="${href(path)}">${escapeHtml(label)}</a>`;
}

export function levelPath(level: string): string {
  return `/niveau/${slugify(level)}`;
}

export function chapterPath(level: string, chapter: string): string {
  return `${levelPath(level)}/chapitre/${slugify(chapter)}`;
}

export function documentPath(item: LibraryItem): string {
  return `/doc/${item.fileId}/${docSlug(item)}`;
}

function docDescription(item: LibraryItem): string {
  if (item.meta.description.trim()) return item.meta.description.trim();
  const chapters = item.meta.chapter.join(", ");
  const levels = item.meta.level.join(", ");
  return `${item.meta.type} de ${item.meta.subject} — ${levels}. Chapitre : ${chapters}. À consulter en ligne et à télécharger sur PIPC.`;
}

function docPage(item: LibraryItem, all: LibraryItem[]): PageMeta {
  const levels = item.meta.level.join(", ");
  const siblings = all.filter(
    (it) =>
      it.fileId !== item.fileId &&
      isClassified(it.meta) &&
      it.meta.level.some((l) => item.meta.level.includes(l)) &&
      it.meta.chapter.some((c) => item.meta.chapter.includes(c))
  );
  const level = item.meta.level[0];
  const chapter = item.meta.chapter[0];

  const parts = [
    `<h1>${escapeHtml(item.displayTitle)}</h1>`,
    `<p>${escapeHtml(`${item.meta.type} · ${item.meta.subject} · ${levels}`)}</p>`,
    item.meta.chapter.length ? `<p>Chapitres : ${escapeHtml(item.meta.chapter.join(", "))}</p>` : "",
    `<p>${escapeHtml(docDescription(item))}</p>`,
    level ? `<p>${link(levelPath(level), level)}</p>` : "",
    level && chapter ? `<p>${link(chapterPath(level, chapter), chapter)}</p>` : "",
    siblings.length
      ? `<h2>Dans le même chapitre</h2><ul>${siblings
          .map((s) => `<li>${link(documentPath(s), s.displayTitle)}</li>`)
          .join("")}</ul>`
      : "",
  ];

  return {
    path: documentPath(item),
    title: `${item.displayTitle} — ${item.meta.type}, ${levels}${SUFFIX}`,
    description: docDescription(item),
    body: parts.filter(Boolean).join(""),
    lastmod: isoDate(item.modifiedTime),
    ogImage: item.thumbnailLink,
  };
}

function listBody(heading: string, intro: string, items: LibraryItem[]): string {
  return [
    `<h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(intro)}</p>`,
    items.length
      ? `<ul>${items.map((it) => `<li>${link(documentPath(it), it.displayTitle)}</li>`).join("")}</ul>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

/**
 * Every URL worth writing to disk, derived from the library itself: the static pages, one
 * page per level in use, one per level+chapter in use, and one per published document.
 * `/admin` is deliberately absent — it is neither prerendered nor listed in the sitemap.
 */
export function enumeratePages(items: LibraryItem[]): PageMeta[] {
  const published = items.filter((it) => isClassified(it.meta));
  const pages: PageMeta[] = [];

  pages.push({
    path: "/",
    title: "PIPC — Cours, exercices et examens de Physique-Chimie",
    description:
      "Bibliothèque de cours, exercices corrigés, devoirs et examens nationaux de Physique-Chimie du programme marocain, classés par niveau et par chapitre.",
    body: listBody(
      "Physique-Chimie — cours, exercices et examens",
      "Toutes les ressources du programme marocain, classées par niveau et par chapitre.",
      published.slice(0, 50)
    ),
  });

  pages.push({
    path: "/menu",
    title: `Menu thématique — programme officiel de Physique-Chimie${SUFFIX}`,
    description:
      "Le programme officiel de Physique-Chimie chapitre par chapitre, avec les ressources disponibles pour chaque niveau.",
    body: listBody("Menu thématique", "Le programme officiel, chapitre par chapitre.", []),
  });

  pages.push({
    path: "/examen-national",
    title: `Examen National de Physique-Chimie — sujets par filière${SUFFIX}`,
    description:
      "Sujets d'examen national de Physique-Chimie, classés par filière de 2ème Bac et par année.",
    body: listBody("Examen National", "Les sujets classés par filière et par année.", []),
  });

  // Every route the router can match needs a file on disk: GitHub Pages serves 404.html
  // for anything unmatched, so an un-emitted route would 404 rather than load the SPA.
  for (const level of menuLevels()) {
    pages.push({
      path: `/menu/${slugify(level)}`,
      title: `Menu thématique ${level} — programme de Physique-Chimie${SUFFIX}`,
      description: `Le programme officiel de Physique-Chimie de ${level}, chapitre par chapitre, avec les ressources disponibles.`,
      body: listBody(`Menu thématique — ${level}`, `Le programme officiel de ${level}, chapitre par chapitre.`, []),
    });
  }

  for (const level of EXAMEN_NATIONAL_LEVELS) {
    pages.push({
      path: `/examen-national/${slugify(level)}`,
      title: `Examen National ${level} — sujets de Physique-Chimie${SUFFIX}`,
      description: `Sujets d'examen national de Physique-Chimie pour ${level}, classés par année, à consulter et à télécharger.`,
      body: listBody(
        `Examen National — ${level}`,
        `Les sujets d'examen national de ${level}, classés par année.`,
        published.filter((it) => it.meta.type === EXAMEN_NATIONAL_TYPE && it.meta.level.includes(level))
      ),
    });
  }

  // The admin page is emitted only so its URL resolves to the SPA instead of 404.html.
  // It carries noindex, an empty body, and is filtered out of the sitemap.
  pages.push({
    path: "/admin",
    title: `Administration${SUFFIX}`,
    description: "Espace d'administration de la bibliothèque.",
    body: "",
    noindex: true,
  });

  const levels = [...new Set(published.flatMap((it) => it.meta.level))];
  for (const level of levels) {
    const inLevel = published.filter((it) => it.meta.level.includes(level));
    pages.push({
      path: levelPath(level),
      title: `Physique-Chimie ${level} : cours, exercices et examens${SUFFIX}`,
      description: `Toutes les ressources de Physique-Chimie pour ${level} : cours, exercices corrigés, devoirs surveillés et examens nationaux, classés par chapitre.`,
      body: listBody(
        `Physique-Chimie — ${level}`,
        `Cours, exercices et examens pour ${level}.`,
        inLevel
      ),
    });

    const chapters = [...new Set(inLevel.flatMap((it) => it.meta.chapter))];
    for (const chapter of chapters) {
      const inChapter = inLevel.filter((it) => it.meta.chapter.includes(chapter));
      pages.push({
        path: chapterPath(level, chapter),
        title: `${chapter} — ${level} : cours, exercices et examens${SUFFIX}`,
        description: `${chapter} (${level}) : cours, exercices corrigés et examens à consulter en ligne et à télécharger.`,
        body: listBody(
          `${chapter} — ${level}`,
          `Les ressources du chapitre « ${chapter} » pour ${level}.`,
          inChapter
        ),
      });
    }
  }

  for (const item of published) pages.push(docPage(item, published));

  return pages;
}

/** The built shell with this page's head metadata and content block written into it. */
export function injectPage(shell: string, page: PageMeta): string {
  const url = absoluteUrl(page.path);
  const head = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    page.noindex ? `<meta name="robots" content="noindex">` : "",
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="PIPC">`,
    `<meta property="og:locale" content="fr_MA">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    page.ogImage ? `<meta property="og:image" content="${escapeHtml(page.ogImage)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
  ]
    .filter(Boolean)
    .join("");

  return shell
    .replace(/<title>.*?<\/title>/s, "")
    .replace("</head>", `${head}</head>`)
    .replace('<div id="app"></div>', `<div id="app">${page.body}</div>`);
}

export function sitemapXml(pages: PageMeta[]): string {
  const urls = pages
    .filter((p) => !p.noindex)
    .map((p) => {
      const lastmod = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : "";
      return `  <url><loc>${escapeHtml(absoluteUrl(p.path))}</loc>${lastmod}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /drivo/admin\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`;
}
```

- [ ] **Step 4: Run to verify the tests pass**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS. If the document-title case fails on exact wording, fix the implementation to match the test, not the reverse — the title format is specified.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "feat: add the SEO page model for prerendering"
```

---

### Task 9: The prerender build step

A thin I/O shell over Task 8. No logic beyond fetching, looping and writing.

**Files:**
- Create: `scripts/prerender.ts`
- Modify: `package.json` (the `build` script)

**Interfaces:**
- Consumes: `fetchManifest` (`src/api.ts`), `buildLibrary` (`src/lib/manifest.ts`), everything from `src/lib/seo.ts`.
- Produces: `dist/**/index.html`, `dist/sitemap.xml`, `dist/robots.txt`, `dist/404.html`.

- [ ] **Step 1: Write `scripts/prerender.ts`**

```ts
/**
 * Post-build prerender. Vite emits a single client-rendered shell; this writes one static
 * HTML file per URL, each carrying real <head> metadata and a semantic content block, so a
 * crawler sees the library without executing JavaScript. Run by vite-node (already present
 * via vitest) so it can import the app's own TypeScript — the join and classification
 * logic here is the same tested code the browser runs, not a second implementation.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchManifest } from "../src/api";
import { buildLibrary } from "../src/lib/manifest";
import { enumeratePages, injectPage, sitemapXml, robotsTxt } from "../src/lib/seo";

const DIST = join(process.cwd(), "dist");

async function write(relPath: string, contents: string): Promise<void> {
  const full = join(DIST, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents, "utf8");
}

/** "/" -> "index.html", "/menu" -> "menu/index.html". */
function fileFor(path: string): string {
  return path === "/" ? "index.html" : `${path.replace(/^\//, "")}/index.html`;
}

async function main(): Promise<void> {
  const shell = await readFile(join(DIST, "index.html"), "utf8");

  // A shell copy under 404.html is what GitHub Pages serves for an unmatched path. Every
  // real URL is written as a file, so this only ever catches genuine typos.
  await write("404.html", shell);

  let pages;
  try {
    const raw = await fetchManifest();
    const items = buildLibrary(raw.files, raw.meta);
    pages = enumeratePages(items);
  } catch (err) {
    // A backend hiccup must degrade SEO for one deploy, never break the deploy.
    console.warn("[prerender] manifest fetch failed — emitting the plain shell only:", err);
    return;
  }

  for (const page of pages) {
    await write(fileFor(page.path), injectPage(shell, page));
  }
  await write("sitemap.xml", sitemapXml(pages));
  await write("robots.txt", robotsTxt());

  console.log(`[prerender] wrote ${pages.length} pages, sitemap.xml, robots.txt and 404.html`);
}

await main();
```

- [ ] **Step 2: Wire it into the build**

In `package.json`, change the `build` script to:

```json
    "build": "vue-tsc --noEmit && vite build && vite-node scripts/prerender.ts",
```

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: it completes and prints `[prerender] wrote N pages, …` with N well above 100. If the backend is unreachable, the warning path runs instead and the build still succeeds — retry when it is reachable, because the next step needs real pages.

- [ ] **Step 4: Verify the emitted tree**

```bash
ls dist/404.html dist/sitemap.xml dist/robots.txt
find dist/doc -name index.html | head -3
find dist/niveau -name index.html | head -5
grep -c "<url>" dist/sitemap.xml
grep -o "<title>[^<]*</title>" "$(find dist/doc -name index.html | head -1)"
grep -o '<div id="app">.\{0,120\}' "$(find dist/doc -name index.html | head -1)"
```

Expected: all four listed files exist; `dist/doc/**` and `dist/niveau/**` contain `index.html` files; the sitemap's `<url>` count matches the page count; the sampled document page has a real per-document `<title>` and a non-empty `<div id="app">` containing an `<h1>`.

- [ ] **Step 5: Verify the built site serves and hydrates**

Run: `npm run preview`, then open the document URL sampled above (e.g. `http://localhost:4173/drivo/doc/<id>/<slug>`).
Expected: the page renders the full Vue app — the prerendered block is replaced on mount, with no duplicated heading and no flash of raw HTML. Navigate to a level page and back. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add scripts/prerender.ts package.json
git commit -m "feat: prerender static pages, sitemap and robots.txt at build time"
```

---

### Task 10: Full verification

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS. Count: 226 before this work, minus 2 removed with `FilePreview`, plus roughly 60 new — report the actual number.

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Clean build**

```bash
rm -rf dist && npm run build
```

Expected: succeeds, with the prerender summary line.

- [ ] **Step 4: Confirm the spec's "Done means" list**

Walk `docs/superpowers/specs/2026-08-18-deep-links-seo-doc-page-design.md` and confirm each bullet against real output. Report any that do not hold rather than adjusting the claim.

- [ ] **Step 5: Report**

State the test count, the number of prerendered pages, and anything left undone. Do not claim success for a step that was not run.
