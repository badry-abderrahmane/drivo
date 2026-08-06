# Home Page Rework (BrowseView + FilterBar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slim the `BrowseView.vue` hero, consolidate level/type filtering into one quick-pill filter surface in `FilterBar.vue`, and make the Chapitre dropdown depend on the selected Niveau.

**Architecture:** Two files change. `FilterBar.vue` gains a Niveau quick-pill row (mirroring the existing Type row), drops the redundant Niveau/Type selects from its "Filtres avancés" panel, and filters its Chapitre options by the selected level. `BrowseView.vue` loses its bordered hero card, the duplicate level-pill control, and the now-dead `toggleLevel`/`allLevels` code — level selection lives only in `FilterBar` from here on.

**Tech Stack:** Vue 3 `<script setup>`, Vuetify 3 components, Vitest + `@vue/test-utils` (via `mountWithVuetify` in `src/test/setup.ts`).

## Global Constraints

- UI copy is French only (e.g. "Niveau", "Tous", "Filtres avancés") — match existing wording style in the file being edited.
- Follow the existing quick-pill pattern already used for Type in `FilterBar.vue` (`v-chip`, `size="small"`, `variant="tonal"`, `:color="... ? 'primary' : 'default'"`, `filter-chip` class) for the new Niveau row — don't invent a new visual style.
- Run tests with `npm test` (= `vitest run`); run a single file with `npx vitest run <path>`.
- No changes to `src/views/MenuView.vue`, `src/App.vue`, `src/lib/filter.ts`, `src/composables/useLibrary.ts`, or classification logic — out of scope per the design spec (`docs/superpowers/specs/2026-08-06-browse-home-page-rework-design.md`).

---

### Task 1: FilterBar — add Niveau quick-pill row

**Files:**
- Modify: `src/components/FilterBar.vue`
- Test: `src/components/FilterBar.test.ts`

**Interfaces:**
- Consumes: existing `levels` computed (`computed(() => distinctLevels(props.items))`, already present at the bottom of the `<script setup>` block), existing `local` reactive `Filters` object, existing `emitChange()`.
- Produces: new `selectLevel(lvl: string): void` function, mirroring the existing `selectType`. Task 2 and Task 3 build on this same quick-pill row.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/FilterBar.test.ts` (new `items` fixture needs a second level; reuse the existing one, which already has `"2ème Bac SM"` and `"1ère Bac"`):

```ts
  it("emits the selected level when a Niveau quick-pill is clicked", async () => {
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    await w.get('[data-test="level-2ème Bac SM"]').trigger("click");
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBe("2ème Bac SM");
  });

  it("clears the level when the Niveau 'Tous' pill is clicked", async () => {
    const w = mountWithVuetify(FilterBar, {
      props: { items, modelValue: { level: "2ème Bac SM" } as Filters },
    });
    await w.get('[data-test="level-all"]').trigger("click");
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: FAIL — no element matches `[data-test="level-2ème Bac SM"]` or `[data-test="level-all"]`.

- [ ] **Step 3: Add the Niveau quick-pill row and `selectLevel`**

In `src/components/FilterBar.vue`, insert a new row directly after the search `v-text-field` and before the existing `<!-- Quick Type Filter Chips & Advanced Toggle -->` div:

```html
      <!-- Quick Niveau Filter Chips -->
      <div v-if="levels.length > 0" class="d-flex align-center flex-wrap ga-2 mb-3">
        <span class="text-caption text-medium-emphasis font-weight-medium mr-1 d-none d-sm-inline">
          Niveau :
        </span>
        <v-chip
          size="small"
          variant="tonal"
          :color="!local.level ? 'primary' : 'default'"
          :class="{ 'font-weight-bold': !local.level }"
          class="filter-chip"
          data-test="level-all"
          @click="selectLevel('')"
        >
          Tous
        </v-chip>
        <v-chip
          v-for="lvl in levels"
          :key="lvl"
          size="small"
          variant="tonal"
          :color="local.level === lvl ? 'primary' : 'default'"
          :class="{ 'font-weight-bold': local.level === lvl }"
          class="filter-chip"
          :data-test="`level-${lvl}`"
          @click="selectLevel(lvl)"
        >
          <v-icon icon="mdi-school-outline" size="14" class="mr-1" />
          {{ lvl }}
        </v-chip>
      </div>
```

In the `<script setup>` block, add `selectLevel` right after the existing `selectType`:

```ts
function selectLevel(lvl: string): void {
  local.level = lvl || undefined;
  emitChange();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Commit**

```bash
git add src/components/FilterBar.vue src/components/FilterBar.test.ts
git commit -m "feat: add Niveau quick-pill row to FilterBar"
```

---

### Task 2: FilterBar — drop redundant Niveau/Type from advanced filters

**Files:**
- Modify: `src/components/FilterBar.vue`
- Test: `src/components/FilterBar.test.ts`

**Interfaces:**
- Consumes: `showAdvanced` ref, existing `levels`/`types`/`subjects`/`chapters` computeds — all unchanged.
- Produces: nothing new; this task only removes markup.

- [ ] **Step 1: Write the failing test**

Add to `src/components/FilterBar.test.ts`. Assert on the advanced panel's `v-select` `label`s rather than page text, since Task 1's Niveau quick-pill row also renders the word "Niveau" (as a `<span>Niveau :</span>` caption) and would make a plain text-content assertion ambiguous:

```ts
  it("no longer shows Niveau or Type selects in Filtres avancés (covered by quick pills)", async () => {
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    const toggle = w.findAll("button").find((b) => b.text().includes("Filtres avancés"))!;
    await toggle.trigger("click");
    const labels = w.findAll("label").map((l) => l.text());
    expect(labels).not.toContain("Niveau");
    expect(labels).not.toContain("Type");
    expect(labels).toContain("Matière");
    expect(labels).toContain("Chapitre");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: FAIL — `labels` currently contains `"Niveau"` and `"Type"`.

- [ ] **Step 3: Remove the Niveau and Type columns from "Filtres avancés"**

In `src/components/FilterBar.vue`, inside the `<v-expand-transition>` block, delete the two `v-col` entries for Niveau and Type:

```html
            <v-col cols="12" sm="6" md="3">
              <v-select
                label="Niveau"
                :items="levels"
                v-model="local.level"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-school-outline"
                @update:model-value="emitChange"
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-select
                label="Type"
                :items="types"
                v-model="local.type"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-file-document-outline"
                @update:model-value="emitChange"
              />
            </v-col>
```

Widen the remaining two columns from `md="3"` to `md="6"`:

```html
          <v-row dense>
            <v-col cols="12" sm="6" md="6">
              <v-select
                label="Matière"
                :items="subjects"
                v-model="local.subject"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-book-open-variant"
                @update:model-value="emitChange"
              />
            </v-col>
            <v-col cols="12" sm="6" md="6">
              <v-select
                label="Chapitre"
                :items="chapters"
                v-model="local.chapter"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-bookmark-outline"
                @update:model-value="emitChange"
              />
            </v-col>
          </v-row>
```

`types` computed stays (still used by the existing Type quick-pill row); only the advanced `v-select` for it is removed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/FilterBar.vue src/components/FilterBar.test.ts
git commit -m "refactor: drop redundant Niveau/Type selects from Filtres avancés"
```

---

### Task 3: FilterBar — filter Chapitre options by selected Niveau

**Files:**
- Modify: `src/components/FilterBar.vue`
- Test: `src/components/FilterBar.test.ts`

**Interfaces:**
- Consumes: `local.level`, `local.chapter`, `props.items`, `distinctChapters` (already imported from `../lib/filter`), `watch` (add to the existing `vue` import).
- Produces: updated `chapters` computed (same name, same consumers — the advanced `v-select` from Task 2 keeps using `:items="chapters"` unchanged).

- [ ] **Step 1: Write the failing tests**

Add to `src/components/FilterBar.test.ts`. This needs items with distinct chapters per level — the shared `mk` fixture hardcodes `chapter: []`, so add a small fixture at the top of the file, alongside the existing `mk`/`items` declarations (not inside `describe`), instead of changing `mk` itself. Assert on the Chapitre `v-select`'s `items` prop rather than page text: `v-select` menu content is teleported/lazy in real Vuetify, so a DOM-text assertion would be unreliable, while the `items` prop is set synchronously and directly reflects what the dropdown will offer.

```ts
const withChapter = (id: string, level: string[], chapter: string): LibraryItem => ({
  fileId: id, name: id, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level, type: "Cours", subject: "", chapter: [chapter], title: "", description: "", tags: [], order: 0 },
});
const chapterItems = [
  withChapter("a", ["2ème Bac SM"], "Mécanique"),
  withChapter("b", ["1ère Bac"], "Optique"),
];
```

Then add these two tests inside the existing `describe("FilterBar", ...)` block:

```ts
  it("narrows Chapitre options to the selected Niveau's chapters", async () => {
    const w = mountWithVuetify(FilterBar, { props: { items: chapterItems, modelValue: {} as Filters } });
    const chapterSelect = () => w.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === "Chapitre")!;

    await w.findAll("button").find((b) => b.text().includes("Filtres avancés"))!.trigger("click");
    expect(chapterSelect().props("items")).toEqual(["Mécanique", "Optique"]);

    await w.get('[data-test="level-2ème Bac SM"]').trigger("click");
    expect(chapterSelect().props("items")).toEqual(["Mécanique"]);
  });

  it("clears an already-selected chapter that no longer matches the new Niveau", async () => {
    const w = mountWithVuetify(FilterBar, {
      props: { items: chapterItems, modelValue: { level: "1ère Bac", chapter: "Optique" } as Filters },
    });
    await w.get('[data-test="level-2ème Bac SM"]').trigger("click");
    const events = w.emitted("update:modelValue") as Filters[][];
    const last = events[events.length - 1][0];
    expect(last.level).toBe("2ème Bac SM");
    expect(last.chapter).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: FAIL — `chapters` currently ignores `local.level`, so both tests fail (options don't narrow; chapter isn't cleared).

- [ ] **Step 3: Make `chapters` depend on `local.level`, and clear an invalidated selection**

In `src/components/FilterBar.vue`, change the `vue` import to include `watch`:

```ts
import { ref, reactive, computed, watch } from "vue";
```

Replace the `chapters` computed:

```ts
const chapters = computed(() => {
  const scoped = local.level
    ? props.items.filter((it) => it.meta.level.includes(local.level!))
    : props.items;
  return distinctChapters(scoped);
});

watch(
  () => local.level,
  () => {
    if (local.chapter && !chapters.value.includes(local.chapter)) {
      local.chapter = undefined;
      emitChange();
    }
  }
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/FilterBar.test.ts`
Expected: PASS (full file).

- [ ] **Step 5: Commit**

```bash
git add src/components/FilterBar.vue src/components/FilterBar.test.ts
git commit -m "feat: filter Chapitre options by selected Niveau"
```

---

### Task 4: BrowseView — slim the hero and remove the duplicate level control

**Files:**
- Modify: `src/views/BrowseView.vue`
- Test: `src/views/BrowseView.test.ts`

**Interfaces:**
- Consumes: `FilterBar`'s new Niveau quick-pill row (Task 1) as the sole level control from here on.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Write the failing test**

Add to `src/views/BrowseView.test.ts`:

```ts
  it("has no standalone hero-level control (level selection lives in FilterBar)", async () => {
    const w = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")]);
    expect(w.find(".level-pill").exists()).toBe(false);
    expect(w.find(".hero-section").exists()).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/BrowseView.test.ts`
Expected: FAIL — `.hero-section` and `.level-pill` still exist.

- [ ] **Step 3: Replace the hero block**

In `src/views/BrowseView.vue`, replace the entire `<!-- Hero Header -->` block (from `<div class="hero-section ...">` through its closing `</div>`) with:

```html
    <!-- Hero Header -->
    <div class="text-center py-4 px-4 mb-4">
      <h1 class="text-h4 text-md-h3 font-weight-black tracking-tight mb-2 text-gradient">
        Bibliothèque de Cours
      </h1>
      <p class="text-body-2 text-medium-emphasis mx-auto">
        {{ published.length }} Ressource{{ published.length > 1 ? "s" : "" }} disponible{{ published.length > 1 ? "s" : "" }}
        — organisées par niveau et chapitre.
      </p>
    </div>
```

- [ ] **Step 4: Remove the now-dead script and style code**

In the `<script setup>` block, delete `allLevels` and `toggleLevel`:

```ts
const allLevels = computed(() => distinctLevels(published.value));

function toggleLevel(lvl: string): void {
  if (filters.value.level === lvl) {
    filters.value = { ...filters.value, level: undefined };
  } else {
    filters.value = { ...filters.value, level: lvl };
  }
}
```

Remove `distinctLevels` from the `import { applyFilters, sortItems, distinctLevels, type Filters } from "../lib/filter";` line (becomes `import { applyFilters, sortItems, type Filters } from "../lib/filter";`) — `distinctLevels` is now only used inside `FilterBar.vue`.

In the `<style scoped>` block, delete these now-unused rules: `.hero-section`, `.bg-primary-subtle`, `.max-w-600`, `.level-pill`, `.level-pill:hover`. Keep `.browse-view`, `.text-gradient`, `.max-w-400`, `.tracking-tight` — all still used (`.browse-view` on the root container, `.text-gradient`/`.tracking-tight` on the `<h1>`, `.max-w-400` on the empty-state cards).

- [ ] **Step 5: Run tests to verify everything passes**

Run: `npx vitest run src/views/BrowseView.test.ts`
Expected: PASS (full file, including the pre-existing "1 Ressource disponible" and "Aucun résultat" assertions — the interpolation text is unchanged, only wrapped in a shorter paragraph).

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green (`FilterBar.test.ts`, `BrowseView.test.ts`, and every other existing test file untouched by this plan).

- [ ] **Step 7: Commit**

```bash
git add src/views/BrowseView.vue src/views/BrowseView.test.ts
git commit -m "refactor: slim BrowseView hero, remove duplicate level control"
```
