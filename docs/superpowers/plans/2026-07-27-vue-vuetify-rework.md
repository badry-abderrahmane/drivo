# Vue 3 + Vuetify Frontend Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vanilla-DOM view layer with a Vue 3 + Vuetify single-page app that adds pagination, an editable admin data table, and a polished themed UI — reusing the existing tested core and backend untouched.

**Architecture:** One SPA (`index.html` → `src/main.ts`) with vue-router in hash mode. Two views (`BrowseView`, `AdminView`) consume a shared `useLibrary` composable that wraps the existing `loadLibrary()`. Vuetify components provide pagination (`v-data-iterator` for browse cards, `v-data-table` for the admin editor). All `lib/*`, `api.ts`, `config.ts`, their tests, and the Apps Script backend are unchanged.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), Vuetify 3 + `vite-plugin-vuetify`, vue-router 4 (hash mode), Vite, Vitest + @vue/test-utils + jsdom.

## Global Constraints

- **Do not modify** `src/lib/types.ts`, `src/lib/manifest.ts`, `src/lib/filter.ts`, `src/lib/cache.ts`, `src/lib/loadLibrary.ts`, `src/api.ts`, `src/config.ts`, or `apps-script/**`. Reuse them as-is.
- **Preserve all existing passing tests** for `lib/*` and `api.ts` — the full suite must stay green after every task.
- **French UI labels** (Niveau, Type, Matière, Chapitre, Ouvrir, Déverrouiller, Enregistrer, Réindexer Drive).
- **Metadata field names** exactly: `level`, `type`, `subject`, `chapter`, `title`, `description`, `tags`, `order`. Join key `fileId`.
- **Vite `base` stays `/drivo/`.** Router uses `createWebHashHistory()`.
- **Save serialization:** `SaveInput.tags` is a comma-joined string; `order` is a number. Do not change the `api.ts` contract.
- Node 20+. TDD, DRY, YAGNI, frequent commits.

---

### Task 1: Add Vue + Vuetify toolchain and SPA shell

**Files:**
- Modify: `package.json` (deps), `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.ts` (replace), `src/App.vue`, `src/router.ts`, `src/plugins/vuetify.ts`, `src/views/BrowseView.vue`, `src/views/AdminView.vue`, `src/vite-env.d.ts`
- Delete: `admin.html`, `src/admin.ts`, `src/styles.css` (after confirming nothing else imports it)
- Test: `src/smoke.test.ts` (keep; still valid)

**Interfaces:**
- Consumes: nothing new.
- Produces: a booting SPA with routes `/` (BrowseView placeholder) and `/admin` (AdminView placeholder), Vuetify themed shell in `App.vue`. `npm run build` and `npm test` both pass.

- [ ] **Step 1: Add dependencies**

Run:
```bash
npm install vue vue-router vuetify @mdi/font
npm install -D @vitejs/plugin-vue vite-plugin-vuetify @vue/test-utils vue-tsc
```
Expected: installs succeed; `package.json` gains these deps.

- [ ] **Step 2: Update `package.json` build script to typecheck with vue-tsc**

Change the `build` script from `"tsc --noEmit && vite build"` to:
```json
"build": "vue-tsc --noEmit && vite build",
```

- [ ] **Step 3: Configure Vite for Vue + Vuetify, single entry**

`vite.config.ts` (full replacement):
```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  base: "/drivo/",
  plugins: [vue(), vuetify({ autoImport: true })],
});
```

- [ ] **Step 4: Add Vue SFC type shim and update tsconfig**

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
```

In `tsconfig.json`, add `"jsx": "preserve"` is NOT needed; ensure `"types"` still includes `"vitest/globals"` and add `"vuetify"` is auto. Replace `compilerOptions` with:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "skipLibCheck": true,
    "allowImportingTsExtensions": false
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Vuetify plugin**

`src/plugins/vuetify.ts`:
```ts
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";

export default createVuetify({
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        colors: { primary: "#1565C0", secondary: "#00897B" },
      },
    },
  },
});
```

- [ ] **Step 6: Router (hash mode) with placeholder views**

`src/router.ts`:
```ts
import { createRouter, createWebHashHistory } from "vue-router";
import BrowseView from "./views/BrowseView.vue";
import AdminView from "./views/AdminView.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "browse", component: BrowseView },
    { path: "/admin", name: "admin", component: AdminView },
  ],
});
```

`src/views/BrowseView.vue`:
```vue
<template>
  <div class="pa-4">Parcourir (à venir)</div>
</template>
<script setup lang="ts"></script>
```

`src/views/AdminView.vue`:
```vue
<template>
  <div class="pa-4">Admin (à venir)</div>
</template>
<script setup lang="ts"></script>
```

- [ ] **Step 7: App shell**

`src/App.vue`:
```vue
<template>
  <v-app>
    <v-app-bar color="primary" flat>
      <v-app-bar-title>Bibliothèque Physique</v-app-bar-title>
      <v-spacer />
      <v-btn variant="text" :to="{ name: 'browse' }">Parcourir</v-btn>
      <v-btn variant="text" :to="{ name: 'admin' }">Admin</v-btn>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
<script setup lang="ts"></script>
```

- [ ] **Step 8: SPA entry point**

`src/main.ts` (full replacement):
```ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";

createApp(App).use(router).use(vuetify).mount("#app");
```

- [ ] **Step 9: Single-page `index.html`**

`index.html` (full replacement):
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bibliothèque Physique</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 10: Remove obsolete files**

Run:
```bash
git rm admin.html src/admin.ts src/styles.css
```
(If `git rm` reports styles.css referenced elsewhere, grep first: `grep -rn "styles.css" src index.html` — expect no hits after Step 9.)

- [ ] **Step 11: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds (Vue + Vuetify compile, single `dist/index.html`); all existing `lib/*` and `api.ts` tests still pass. (The old `src/components/*.test.ts` still exist and pass here — they are removed in Task 2.)

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add Vue 3 + Vuetify SPA shell with hash router"
```

---

### Task 2: `useLibrary` composable + remove vanilla view layer

**Files:**
- Create: `src/composables/useLibrary.ts`
- Test: `src/composables/useLibrary.test.ts`
- Delete: `src/components/browse.ts`, `src/components/browse.test.ts`, `src/components/admin.ts`, `src/components/admin.test.ts`

**Interfaces:**
- Consumes: `loadLibrary` from `src/lib/loadLibrary.ts` (unchanged), `LibraryItem` from `src/lib/types.ts`.
- Produces: `useLibrary()` returning `{ items: Ref<LibraryItem[]>, loading: Ref<boolean>, stale: Ref<boolean>, error: Ref<string|null>, ensureLoaded: () => Promise<void>, reload: () => Promise<void> }`. Module-level singleton state (shared across views).

- [ ] **Step 1: Write the failing test**

`src/composables/useLibrary.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as loader from "../lib/loadLibrary";
import type { LibraryItem } from "../lib/types";

const item = (id: string): LibraryItem => ({
  fileId: id, name: id + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level: "", type: "", subject: "", chapter: "", title: "", description: "", tags: [], order: 0 },
});

beforeEach(() => vi.resetModules());
afterEach(() => vi.restoreAllMocks());

async function fresh() {
  // import after resetModules so module-level state is clean per test
  return (await import("./useLibrary")).useLibrary();
}

describe("useLibrary", () => {
  it("loads items once via ensureLoaded and sets stale/loading", async () => {
    const spy = vi.spyOn(loader, "loadLibrary").mockResolvedValue({ items: [item("1")], stale: false });
    const lib = await fresh();
    expect(lib.loading.value).toBe(false);
    await lib.ensureLoaded();
    expect(lib.items.value).toHaveLength(1);
    expect(lib.stale.value).toBe(false);
    await lib.ensureLoaded(); // second call does not refetch
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("captures stale flag", async () => {
    vi.spyOn(loader, "loadLibrary").mockResolvedValue({ items: [item("1")], stale: true });
    const lib = await fresh();
    await lib.ensureLoaded();
    expect(lib.stale.value).toBe(true);
  });

  it("sets error when loadLibrary throws", async () => {
    vi.spyOn(loader, "loadLibrary").mockRejectedValue(new Error("boom"));
    const lib = await fresh();
    await lib.ensureLoaded();
    expect(lib.error.value).toContain("boom");
    expect(lib.items.value).toEqual([]);
  });

  it("reload refetches even after a load", async () => {
    const spy = vi.spyOn(loader, "loadLibrary").mockResolvedValue({ items: [item("1")], stale: false });
    const lib = await fresh();
    await lib.ensureLoaded();
    await lib.reload();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/composables/useLibrary.test.ts`
Expected: FAIL — cannot resolve `./useLibrary`.

- [ ] **Step 3: Implement the composable**

`src/composables/useLibrary.ts`:
```ts
import { ref } from "vue";
import { loadLibrary } from "../lib/loadLibrary";
import type { LibraryItem } from "../lib/types";

const items = ref<LibraryItem[]>([]);
const loading = ref(false);
const stale = ref(false);
const error = ref<string | null>(null);
let loadedOnce = false;

async function run(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const { items: got, stale: s } = await loadLibrary();
    items.value = got;
    stale.value = s;
    loadedOnce = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

export function useLibrary() {
  async function ensureLoaded(): Promise<void> {
    if (loadedOnce || loading.value) return;
    await run();
  }
  async function reload(): Promise<void> {
    await run();
  }
  return { items, loading, stale, error, ensureLoaded, reload };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/composables/useLibrary.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Delete the vanilla view layer**

Run:
```bash
git rm src/components/browse.ts src/components/browse.test.ts src/components/admin.ts src/components/admin.test.ts
```

- [ ] **Step 6: Verify full suite + build**

Run: `npm test && npm run build`
Expected: all remaining tests pass (lib/*, api.ts, cache, loadLibrary, useLibrary, smoke); build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: useLibrary composable; remove vanilla view layer"
```

---

### Task 3: Vitest setup for Vuetify components

**Files:**
- Create: `src/test/setup.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `mountWithVuetify(component, options)` helper and a global `ResizeObserver` stub so Vuetify components render under jsdom. Exported from `src/test/setup.ts`.

- [ ] **Step 1: Create the setup + helper**

`src/test/setup.ts`:
```ts
import { vi } from "vitest";
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import type { Component } from "vue";

// Vuetify measures layout; jsdom lacks ResizeObserver.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// visualViewport is read by some Vuetify overlay components.
if (!("visualViewport" in globalThis)) {
  (globalThis as Record<string, unknown>).visualViewport = null;
}

export function mountWithVuetify<C extends Component>(
  component: C,
  options: ComponentMountingOptions<C> = {}
) {
  const vuetify = createVuetify({ components, directives });
  return mount(component, {
    ...options,
    global: { ...(options.global ?? {}), plugins: [vuetify, ...((options.global?.plugins as unknown[]) ?? [])] },
  });
}
```

- [ ] **Step 2: Register the setup file globally**

`vitest.config.ts` (full replacement):
```ts
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    server: { deps: { inline: ["vuetify"] } },
  },
});
```

- [ ] **Step 3: Verify existing tests still pass with the new config**

Run: `npm test`
Expected: PASS — all `lib/*`, `api.ts`, `useLibrary`, smoke tests still green under the Vue-enabled Vitest config. (No component tests yet; this confirms the config change is non-breaking.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: Vitest setup for mounting Vuetify components"
```

---

### Task 4: FileCard + FilterBar components

**Files:**
- Create: `src/components/FileCard.vue`, `src/components/FilterBar.vue`
- Test: `src/components/FileCard.test.ts`, `src/components/FilterBar.test.ts`

**Interfaces:**
- Consumes: `LibraryItem` (types), `Filters`/`distinctValues` (`lib/filter.ts`).
- Produces:
  - `FileCard` — prop `item: LibraryItem`. Renders `displayTitle`, a chip for `meta.type`, subtitle `[meta.level, meta.chapter].filter(Boolean).join(" · ")`, `meta.description`, and an anchor to `item.webViewLink` (`target=_blank`, `rel=noopener`) labelled "Ouvrir".
  - `FilterBar` — prop `items: LibraryItem[]`, `modelValue: Filters`; emits `update:modelValue` when any select/search changes. Four `v-select`s (level/type/subject/chapter) + a search `v-text-field`.

- [ ] **Step 1: Write the failing FileCard test**

`src/components/FileCard.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import FileCard from "./FileCard.vue";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "https://drive/1",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "Mécanique — Cours",
  meta: { fileId: "1", level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: "Mécanique", title: "Mécanique — Cours", description: "Chapitre 1", tags: [], order: 0 },
};

describe("FileCard", () => {
  it("renders title, type, subtitle, description and an open link", () => {
    const w = mountWithVuetify(FileCard, { props: { item } });
    expect(w.text()).toContain("Mécanique — Cours");
    expect(w.text()).toContain("Cours");
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("Chapitre 1");
    const a = w.get("a");
    expect(a.attributes("href")).toBe("https://drive/1");
    expect(a.attributes("target")).toBe("_blank");
    expect(a.text()).toContain("Ouvrir");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/FileCard.test.ts`
Expected: FAIL — cannot resolve `./FileCard.vue`.

- [ ] **Step 3: Implement FileCard**

`src/components/FileCard.vue`:
```vue
<template>
  <v-card variant="outlined" class="h-100 d-flex flex-column">
    <v-card-item>
      <v-chip v-if="item.meta.type" size="small" color="secondary" class="mb-2">{{ item.meta.type }}</v-chip>
      <v-card-title class="text-wrap text-body-1 font-weight-medium">{{ item.displayTitle }}</v-card-title>
      <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    </v-card-item>
    <v-card-text v-if="item.meta.description" class="text-body-2">{{ item.meta.description }}</v-card-text>
    <v-spacer />
    <v-card-actions>
      <v-btn
        :href="item.webViewLink"
        target="_blank"
        rel="noopener"
        color="primary"
        variant="text"
        append-icon="mdi-open-in-new"
      >Ouvrir</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LibraryItem } from "../lib/types";

const props = defineProps<{ item: LibraryItem }>();
const subtitle = computed(() =>
  [props.item.meta.level, props.item.meta.chapter].filter(Boolean).join(" · ")
);
</script>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/FileCard.test.ts`
Expected: PASS. (Vuetify renders `v-btn` with `href` as an `<a>`.)

- [ ] **Step 5: Write the failing FilterBar test**

`src/components/FilterBar.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import FilterBar from "./FilterBar.vue";
import type { LibraryItem } from "../lib/types";
import type { Filters } from "../lib/filter";

const mk = (id: string, level: string, type: string): LibraryItem => ({
  fileId: id, name: id, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level, type, subject: "", chapter: "", title: "", description: "", tags: [], order: 0 },
});
const items = [mk("1", "2ème Bac SM", "Cours"), mk("2", "1ère Bac", "Exercices")];

describe("FilterBar", () => {
  it("emits updated filters when search changes", async () => {
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    const input = w.get('input[type="text"]');
    await input.setValue("newton");
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1][0].search).toBe("newton");
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: FAIL — cannot resolve `./FilterBar.vue`.

- [ ] **Step 7: Implement FilterBar**

`src/components/FilterBar.vue`:
```vue
<template>
  <v-sheet class="pa-4">
    <v-row dense>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Niveau" :items="levels" v-model="local.level" clearable hide-details density="comfortable" @update:model-value="emit('update:modelValue', { ...local })" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Type" :items="types" v-model="local.type" clearable hide-details density="comfortable" @update:model-value="emit('update:modelValue', { ...local })" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Matière" :items="subjects" v-model="local.subject" clearable hide-details density="comfortable" @update:model-value="emit('update:modelValue', { ...local })" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Chapitre" :items="chapters" v-model="local.chapter" clearable hide-details density="comfortable" @update:model-value="emit('update:modelValue', { ...local })" />
      </v-col>
      <v-col cols="12">
        <v-text-field type="text" label="Recherche (titre ou tag)" v-model="local.search" clearable hide-details density="comfortable" prepend-inner-icon="mdi-magnify" @update:model-value="emit('update:modelValue', { ...local })" />
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import { distinctValues, type Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

const props = defineProps<{ items: LibraryItem[]; modelValue: Filters }>();
const emit = defineEmits<{ "update:modelValue": [Filters] }>();

const local = reactive<Filters>({ ...props.modelValue });

const levels = computed(() => distinctValues(props.items, "level"));
const types = computed(() => distinctValues(props.items, "type"));
const subjects = computed(() => distinctValues(props.items, "subject"));
const chapters = computed(() => distinctValues(props.items, "chapter"));
</script>
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/FileCard.vue src/components/FileCard.test.ts src/components/FilterBar.vue src/components/FilterBar.test.ts
git commit -m "feat: FileCard and FilterBar Vuetify components"
```

---

### Task 5: BrowseView (filters + paginated card grid)

**Files:**
- Modify: `src/views/BrowseView.vue`
- Test: `src/views/BrowseView.test.ts`

**Interfaces:**
- Consumes: `useLibrary` (T2), `FilterBar`/`FileCard` (T4), `applyFilters`/`sortItems`/`Filters` (`lib/filter.ts`).
- Produces: the browse page — loading/error/stale states, filter bar, and a `v-data-iterator` of `FileCard`s with `items-per-page = 24`.

- [ ] **Step 1: Write the failing test**

`src/views/BrowseView.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import * as loader from "../lib/loadLibrary";
import type { LibraryItem } from "../lib/types";

const mk = (id: string, type: string, title: string): LibraryItem => ({
  fileId: id, name: title, mimeType: "application/pdf", path: [], webViewLink: "https://drive/" + id,
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: { fileId: id, level: "2ème Bac SM", type, subject: "", chapter: "", title, description: "", tags: [], order: Number(id) },
});

beforeEach(() => vi.resetModules());

async function mountView(items: LibraryItem[]) {
  vi.spyOn(loader, "loadLibrary").mockResolvedValue({ items, stale: false });
  const BrowseView = (await import("./BrowseView.vue")).default;
  const w = mountWithVuetify(BrowseView);
  await flushPromises();
  return w;
}

describe("BrowseView", () => {
  it("renders a card per item once loaded", async () => {
    const w = await mountView([mk("1", "Cours", "Mécanique"), mk("2", "Exercices", "TD1")]);
    expect(w.text()).toContain("Mécanique");
    expect(w.text()).toContain("TD1");
  });

  it("paginates to items-per-page (24)", async () => {
    const many = Array.from({ length: 30 }, (_, i) => mk(String(i + 1), "Cours", "Doc " + (i + 1)));
    const w = await mountView(many);
    const cards = w.findAll(".v-card");
    expect(cards.length).toBeLessThanOrEqual(24);
    expect(cards.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/views/BrowseView.test.ts`
Expected: FAIL — current BrowseView is a placeholder with no cards.

- [ ] **Step 3: Implement BrowseView**

`src/views/BrowseView.vue`:
```vue
<template>
  <div>
    <v-alert v-if="stale" type="warning" variant="tonal" class="ma-4">Hors ligne — données en cache.</v-alert>

    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" class="ma-4">
      Impossible de charger la bibliothèque. Réessayez plus tard.
    </v-alert>

    <template v-else>
      <FilterBar :items="items" v-model="filters" />
      <v-data-iterator :items="shown" :items-per-page="24">
        <template #default="{ items: page }">
          <v-container fluid>
            <v-row>
              <v-col v-for="row in page" :key="row.raw.fileId" cols="12" sm="6" md="4" lg="3">
                <FileCard :item="row.raw" />
              </v-col>
            </v-row>
          </v-container>
        </template>
        <template #no-data>
          <div class="text-medium-emphasis pa-8 text-center">Aucun résultat.</div>
        </template>
        <template #footer="{ page, pageCount, prevPage, nextPage }">
          <div class="d-flex align-center justify-center ga-4 pa-4" v-if="pageCount > 1">
            <v-btn icon="mdi-chevron-left" variant="text" :disabled="page === 1" @click="prevPage" />
            <span>{{ page }} / {{ pageCount }}</span>
            <v-btn icon="mdi-chevron-right" variant="text" :disabled="page === pageCount" @click="nextPage" />
          </div>
        </template>
      </v-data-iterator>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import FilterBar from "../components/FilterBar.vue";
import FileCard from "../components/FileCard.vue";
import { useLibrary } from "../composables/useLibrary";
import { applyFilters, sortItems, type Filters } from "../lib/filter";

const { items, loading, stale, error, ensureLoaded } = useLibrary();
const filters = ref<Filters>({});
const shown = computed(() => sortItems(applyFilters(items.value, filters.value)));

onMounted(ensureLoaded);
</script>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/views/BrowseView.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Verify full suite + build**

Run: `npm test && npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/views/BrowseView.vue src/views/BrowseView.test.ts
git commit -m "feat: BrowseView with filters and paginated card grid"
```

---

### Task 6: PasswordGate component

**Files:**
- Create: `src/components/PasswordGate.vue`
- Test: `src/components/PasswordGate.test.ts`

**Interfaces:**
- Consumes: `saveMeta` from `src/api.ts` (used as the no-op password validator).
- Produces: `PasswordGate` — no props; on unlock calls `saveMeta(password, [])`; on `{ok:true}` emits `unlocked: [password: string]`; else shows the error and stays gated. Accepts an optional `validate` prop (defaults to `saveMeta`) for testing.

- [ ] **Step 1: Write the failing test**

`src/components/PasswordGate.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import PasswordGate from "./PasswordGate.vue";

describe("PasswordGate", () => {
  it("emits unlocked with the password when validation succeeds", async () => {
    const validate = vi.fn().mockResolvedValue({ ok: true });
    const w = mountWithVuetify(PasswordGate, { props: { validate } });
    await w.get('input[type="password"]').setValue("secret");
    await w.get('[data-test="unlock"]').trigger("click");
    await flushPromises();
    expect(validate).toHaveBeenCalledWith("secret", []);
    expect(w.emitted("unlocked")?.[0]).toEqual(["secret"]);
  });

  it("shows an error and does not emit when validation fails", async () => {
    const validate = vi.fn().mockResolvedValue({ ok: false, error: "unauthorized" });
    const w = mountWithVuetify(PasswordGate, { props: { validate } });
    await w.get('input[type="password"]').setValue("wrong");
    await w.get('[data-test="unlock"]').trigger("click");
    await flushPromises();
    expect(w.emitted("unlocked")).toBeUndefined();
    expect(w.text()).toContain("Mot de passe incorrect");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/PasswordGate.test.ts`
Expected: FAIL — cannot resolve `./PasswordGate.vue`.

- [ ] **Step 3: Implement PasswordGate**

`src/components/PasswordGate.vue`:
```vue
<template>
  <div class="d-flex flex-column align-center pa-8 ga-4" style="max-width: 420px; margin: 0 auto">
    <v-text-field
      type="password"
      label="Mot de passe"
      v-model="password"
      class="w-100"
      hide-details
      @keyup.enter="unlock"
    />
    <v-btn color="primary" data-test="unlock" :loading="busy" block @click="unlock">Déverrouiller</v-btn>
    <v-alert v-if="err" type="error" variant="tonal" class="w-100">{{ err }}</v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { saveMeta, type SaveInput } from "../api";

const props = defineProps<{
  validate?: (password: string, rows: SaveInput[]) => Promise<{ ok: boolean; error?: string }>;
}>();
const emit = defineEmits<{ unlocked: [string] }>();

const password = ref("");
const err = ref<string | null>(null);
const busy = ref(false);

async function unlock(): Promise<void> {
  busy.value = true;
  err.value = null;
  const validator = props.validate ?? saveMeta;
  const res = await validator(password.value, []);
  busy.value = false;
  if (res.ok) {
    emit("unlocked", password.value);
  } else {
    err.value = res.error === "unauthorized" ? "Mot de passe incorrect." : (res.error ?? "Erreur.");
  }
}
</script>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/PasswordGate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/PasswordGate.vue src/components/PasswordGate.test.ts
git commit -m "feat: PasswordGate component"
```

---

### Task 7: AdminView (editable paginated data table)

**Files:**
- Modify: `src/views/AdminView.vue`
- Create: `src/views/adminRows.ts` (pure row/serialization helpers)
- Test: `src/views/adminRows.test.ts`, `src/views/AdminView.test.ts`

**Interfaces:**
- Consumes: `useLibrary` (T2), `PasswordGate` (T6), `saveMeta`/`reindex`/`SaveInput` (`api.ts`), `LEVELS`/`TYPES`/`SUBJECTS` (`config.ts`), `LibraryItem` (types).
- Produces:
  - `adminRows.ts`: `type EditRow = { fileId: string; name: string; level: string; type: string; subject: string; chapter: string; title: string; description: string; tags: string; order: number }`; `toEditRow(it: LibraryItem): EditRow` (tags array → comma string); `toSaveInput(r: EditRow): SaveInput` (passthrough of the same fields).
  - `AdminView.vue`: password gate → `v-data-table` editor with pagination, save, reindex.

- [ ] **Step 1: Write the failing adminRows test**

`src/views/adminRows.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toEditRow, toSaveInput } from "./adminRows";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: "Mécanique", title: "T", description: "D", tags: ["a", "b"], order: 3 },
};

describe("adminRows", () => {
  it("toEditRow flattens tags to a comma string and copies fields", () => {
    const r = toEditRow(item);
    expect(r).toMatchObject({ fileId: "1", name: "raw.pdf", level: "2ème Bac SM", type: "Cours", title: "T", tags: "a,b", order: 3 });
  });
  it("toSaveInput passes through the editable fields", () => {
    const r = toEditRow(item);
    r.title = "New";
    const s = toSaveInput(r);
    expect(s).toEqual({ fileId: "1", level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: "Mécanique", title: "New", description: "D", tags: "a,b", order: 3 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/views/adminRows.test.ts`
Expected: FAIL — cannot resolve `./adminRows`.

- [ ] **Step 3: Implement adminRows**

`src/views/adminRows.ts`:
```ts
import type { LibraryItem } from "../lib/types";
import type { SaveInput } from "../api";

export interface EditRow {
  fileId: string;
  name: string;
  level: string;
  type: string;
  subject: string;
  chapter: string;
  title: string;
  description: string;
  tags: string; // comma-separated in the editor
  order: number;
}

export function toEditRow(it: LibraryItem): EditRow {
  const m = it.meta;
  return {
    fileId: m.fileId, name: it.name, level: m.level, type: m.type, subject: m.subject,
    chapter: m.chapter, title: m.title, description: m.description, tags: m.tags.join(","), order: m.order,
  };
}

export function toSaveInput(r: EditRow): SaveInput {
  return {
    fileId: r.fileId, level: r.level, type: r.type, subject: r.subject, chapter: r.chapter,
    title: r.title, description: r.description, tags: r.tags, order: Number(r.order) || 0,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/views/adminRows.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing AdminView test**

`src/views/AdminView.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import * as loader from "../lib/loadLibrary";
import * as api from "../api";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: "", type: "", subject: "", chapter: "", title: "", description: "", tags: [], order: 0 },
};

beforeEach(() => vi.resetModules());

async function mountAdmin() {
  vi.spyOn(loader, "loadLibrary").mockResolvedValue({ items: [item], stale: false });
  vi.spyOn(api, "saveMeta").mockResolvedValue({ ok: true });
  vi.spyOn(api, "reindex").mockResolvedValue({ ok: true, count: 1 });
  const AdminView = (await import("./AdminView.vue")).default;
  const w = mountWithVuetify(AdminView);
  await flushPromises();
  return { w, api };
}

describe("AdminView", () => {
  it("shows the gate first and no table", async () => {
    const { w } = await mountAdmin();
    expect(w.find('[data-test="unlock"]').exists()).toBe(true);
    expect(w.find(".v-data-table").exists()).toBe(false);
  });

  it("after unlocking shows the editor table with a row", async () => {
    const { w } = await mountAdmin();
    await w.get('input[type="password"]').setValue("secret");
    await w.get('[data-test="unlock"]').trigger("click");
    await flushPromises();
    expect(w.find(".v-data-table").exists()).toBe(true);
    expect(w.text()).toContain("raw.pdf");
  });

  it("save sends rows with the unlocked password", async () => {
    const { w, api } = await mountAdmin();
    await w.get('input[type="password"]').setValue("secret");
    await w.get('[data-test="unlock"]').trigger("click");
    await flushPromises();
    // saveMeta first call is the unlock validation (password, []); clear and click Save.
    (api.saveMeta as unknown as { mockClear: () => void }).mockClear();
    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();
    expect(api.saveMeta).toHaveBeenCalledTimes(1);
    const [pw, rows] = (api.saveMeta as unknown as { mock: { calls: [string, unknown[]][] } }).mock.calls[0];
    expect(pw).toBe("secret");
    expect(rows).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: FAIL — placeholder AdminView has no gate/table.

- [ ] **Step 7: Implement AdminView**

`src/views/AdminView.vue`:
```vue
<template>
  <div>
    <PasswordGate v-if="!password" @unlocked="onUnlocked" />

    <div v-else>
      <v-toolbar density="comfortable" color="surface" class="px-4" style="position: sticky; top: 64px; z-index: 2">
        <v-text-field v-model="search" placeholder="Rechercher…" prepend-inner-icon="mdi-magnify" hide-details density="compact" style="max-width: 320px" />
        <v-spacer />
        <v-btn color="primary" data-test="save" :loading="saving" @click="save">Enregistrer</v-btn>
        <v-btn class="ml-2" variant="tonal" data-test="reindex" :loading="reindexing" @click="doReindex">Réindexer Drive</v-btn>
      </v-toolbar>

      <v-alert v-if="stale" type="warning" variant="tonal" class="ma-4">Hors ligne — données en cache.</v-alert>

      <v-data-table
        :headers="headers"
        :items="rows"
        :search="search"
        item-value="fileId"
        :items-per-page="25"
        :items-per-page-options="[10, 25, 50, 100]"
        density="comfortable"
        class="px-2"
      >
        <template #item.title="{ item }">
          <v-text-field v-model="item.title" :placeholder="item.name" variant="plain" hide-details density="compact" />
        </template>
        <template #item.level="{ item }">
          <v-select v-model="item.level" :items="LEVELS" clearable variant="plain" hide-details density="compact" style="min-width: 140px" />
        </template>
        <template #item.type="{ item }">
          <v-select v-model="item.type" :items="TYPES" clearable variant="plain" hide-details density="compact" style="min-width: 120px" />
        </template>
        <template #item.subject="{ item }">
          <v-select v-model="item.subject" :items="SUBJECTS" clearable variant="plain" hide-details density="compact" style="min-width: 110px" />
        </template>
        <template #item.chapter="{ item }">
          <v-text-field v-model="item.chapter" variant="plain" hide-details density="compact" />
        </template>
        <template #item.tags="{ item }">
          <v-text-field v-model="item.tags" placeholder="a,b,c" variant="plain" hide-details density="compact" />
        </template>
        <template #item.description="{ item }">
          <v-text-field v-model="item.description" variant="plain" hide-details density="compact" />
        </template>
        <template #item.order="{ item }">
          <v-text-field v-model.number="item.order" type="number" variant="plain" hide-details density="compact" style="max-width: 80px" />
        </template>
      </v-data-table>
    </div>

    <v-snackbar v-model="snack.show" :color="snack.color" :timeout="3000">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import PasswordGate from "../components/PasswordGate.vue";
import { useLibrary } from "../composables/useLibrary";
import { saveMeta, reindex } from "../api";
import { LEVELS, TYPES, SUBJECTS } from "../config";
import { toEditRow, toSaveInput, type EditRow } from "./adminRows";

const { items, stale, ensureLoaded, reload } = useLibrary();
const password = ref("");
const search = ref("");
const saving = ref(false);
const reindexing = ref(false);
const rows = ref<EditRow[]>([]);
const snack = reactive({ show: false, text: "", color: "success" });

const headers = [
  { title: "Fichier", key: "name", sortable: true },
  { title: "Titre", key: "title" },
  { title: "Niveau", key: "level" },
  { title: "Type", key: "type" },
  { title: "Matière", key: "subject" },
  { title: "Chapitre", key: "chapter" },
  { title: "Tags", key: "tags" },
  { title: "Description", key: "description" },
  { title: "Ordre", key: "order" },
];

function rebuildRows(): void {
  rows.value = items.value.map(toEditRow);
}
watch(items, rebuildRows);

onMounted(ensureLoaded);

function notify(text: string, color: string): void {
  snack.text = text;
  snack.color = color;
  snack.show = true;
}

async function onUnlocked(pw: string): Promise<void> {
  password.value = pw;
  await ensureLoaded();
  rebuildRows();
}

async function save(): Promise<void> {
  saving.value = true;
  const res = await saveMeta(password.value, rows.value.map(toSaveInput));
  saving.value = false;
  notify(res.ok ? "Enregistré ✓" : `Erreur : ${res.error ?? "inconnue"}`, res.ok ? "success" : "error");
}

async function doReindex(): Promise<void> {
  reindexing.value = true;
  const res = await reindex(password.value);
  reindexing.value = false;
  if (res.ok) {
    notify(`Réindexé (${res.count ?? "?"} fichiers) ✓`, "success");
    await reload();
    rebuildRows();
  } else {
    notify(`Erreur : ${res.error ?? "inconnue"}`, "error");
  }
}
</script>
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Verify full suite + build**

Run: `npm test && npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/views/AdminView.vue src/views/adminRows.ts src/views/adminRows.test.ts src/views/AdminView.test.ts
git commit -m "feat: AdminView editable paginated data table with save/reindex"
```

---

### Task 8: Manual verification and cleanup

**Files:**
- Modify: `README.md` (Pages URLs → hash routes), possibly `docs`.

**Interfaces:**
- Consumes: everything above.
- Produces: verified running SPA locally; README reflects the new URLs.

- [ ] **Step 1: Local smoke test in a real browser**

Run: `npm run dev`
Then open `http://localhost:5173/drivo/` and verify:
1. Browse shows cards, filters (Niveau/Type/Matière/Chapitre) and search narrow results, pagination works, **Ouvrir** opens the Drive link.
2. Nav to Admin (`http://localhost:5173/drivo/#/admin`): wrong password → "Mot de passe incorrect."; correct password → editable table with pagination; editing a field + **Enregistrer** → "Enregistré ✓"; **Réindexer Drive** → success snackbar.

(Backend must be reachable; the deployed Apps Script URL in `config.ts` is used.)

- [ ] **Step 2: Update README Pages URLs**

In `README.md`, replace the "Pages URLs" section:
```markdown
## Pages URLs

- Browse: `https://badry-abderrahmane.github.io/drivo/`
- Admin:  `https://badry-abderrahmane.github.io/drivo/#/admin`
```
And update the local dev line to note the hash route for admin (`/drivo/#/admin`).

- [ ] **Step 3: Final full verification**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds; `dist/` contains a single `index.html`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update URLs for hash-routed SPA"
```

- [ ] **Step 5: (Deploy is via existing workflow on push to main — handled in the finishing step, not here.)**

---

## Self-Review

**Spec coverage:**
- Vue 3 + Vuetify + vue-router hash SPA → Tasks 1, 8. ✅
- Reuse core (`lib/*`, `api.ts`, `config.ts`) unchanged; preserve their tests → Global Constraints + Tasks 2/4/5/7 import them without editing. ✅
- `useLibrary` composable (shared, loads once) → Task 2. ✅
- Remove vanilla view layer + `admin.html` → Tasks 1, 2. ✅
- BrowseView: FilterBar + search + `v-data-iterator` paginated cards → Tasks 4, 5. ✅
- AdminView: PasswordGate + `v-data-table` inline edit + pagination + save + reindex + snackbar → Tasks 6, 7. ✅
- Tags serialization (array ↔ comma string; order number) → `adminRows.ts` (Task 7), matches `api.ts`. ✅
- Vuetify-under-jsdom test setup (ResizeObserver stub, plugin) → Task 3. ✅
- Component tests (FileCard, FilterBar, BrowseView pagination, PasswordGate, AdminView) → Tasks 4–7. ✅
- Build/deploy unchanged, single entry, base `/drivo/`, hash routing → Tasks 1, 8. ✅
- French labels throughout → Tasks 4–7. ✅

**Placeholder scan:** none. All steps contain concrete code/commands. "à venir" placeholders in Task 1 views are intentional and replaced in Tasks 5/7.

**Type consistency:** `EditRow` defined in Task 7 `adminRows.ts`, produced by `toEditRow`, consumed by AdminView and `toSaveInput`. `SaveInput` imported from `api.ts` (unchanged), matches the Sheet columns. `Filters` from `lib/filter.ts` used by FilterBar (T4) and BrowseView (T5). `useLibrary` return shape defined in Task 2 and consumed identically in Tasks 5, 7. `PasswordGate` emits `unlocked: [string]` (T6) and AdminView's `onUnlocked(pw: string)` matches. `mountWithVuetify` defined in Task 3, used in Tasks 4–7.
