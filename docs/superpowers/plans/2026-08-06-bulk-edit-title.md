# Bulk edit "titre d'affichage" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `title` as a fifth bulk-editable field in the admin bulk edit modal, applying one title uniformly to every selected file.

**Architecture:** Extend the existing "touched field" pattern already used for `level`/`type`/`subject`/`chapter`: `BulkPatch` gains an optional `title` key, `applyBulkPatch` copies it onto selected rows when present, and `BulkClassifyDialog.vue` gains a title combobox wired the same way as the other fields. `AdminView.vue`'s `onBulkApply` already forwards any `BulkPatch` generically to `applyBulkPatch` — no changes needed there.

**Tech Stack:** Vue 3 `<script setup>`, Vuetify components, Vitest + `@vue/test-utils`.

## Global Constraints

- An absent `BulkPatch` key means "don't change this field"; a present key (even `""` / `[]`) means "apply this value, including clearing it." Never branch on truthiness when building or applying the patch — spec section "Data model changes."
- Title suggestions in the bulk dialog must never depend on any single file's name (a bulk selection spans files with different names) — spec section "UI changes."
- No uniqueness/dedupe logic on title; duplicate titles across files are accepted by design — spec section "Out of scope."

---

### Task 1: `BulkPatch` and `applyBulkPatch` support `title`

**Files:**
- Modify: `src/views/adminRows.ts:84-107`
- Test: `src/views/adminRows.test.ts:100-143`

**Interfaces:**
- Produces: `BulkPatch.title?: string` — an optional field on the existing `BulkPatch` interface, consumed by Task 2's `confirm()`.
- Produces: `applyBulkPatch(rows: EditRow[], ids: Set<string>, patch: BulkPatch): number` — unchanged signature, now also copies `patch.title` onto `r.title` for every matched row when `patch.title !== undefined`.

- [ ] **Step 1: Write the failing tests**

In `src/views/adminRows.test.ts`, inside the existing `describe("applyBulkPatch", ...)` block (after the `"applies only the fields present in the patch..."` test, i.e. after line 113), add:

```ts
  it("applies a bulk title to the selected rows only", () => {
    const rs = rows();
    const n = applyBulkPatch(rs, new Set(["1"]), { title: "Nouveau titre" });
    expect(n).toBe(1);
    expect(rs[0].title).toBe("Nouveau titre");
    expect(rs[1].title).toBe("T"); // unselected row untouched
  });
```

Then extend the existing "treats a present-but-empty value as an instruction to clear the field" test (currently lines 122-127) to also cover title, by changing it to:

```ts
  it("treats a present-but-empty value as an instruction to clear the field", () => {
    const rs = rows();
    applyBulkPatch(rs, new Set(["1"]), { type: "", level: [], title: "" });
    expect(rs[0].type).toBe("");
    expect(rs[0].level).toEqual([]);
    expect(rs[0].title).toBe("");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/views/adminRows.test.ts`
Expected: FAIL — `rs[0].title` is `"T"` (unchanged), not `"Nouveau titre"` / `""`, because `BulkPatch` has no `title` key yet and `applyBulkPatch` never reads one.

- [ ] **Step 3: Implement**

In `src/views/adminRows.ts`, update the `BulkPatch` interface (lines 84-89):

```ts
export interface BulkPatch {
  level?: string[];
  type?: string;
  subject?: string;
  chapter?: string[];
  title?: string;
}
```

And update `applyBulkPatch` (lines 96-107) to also apply `title`:

```ts
export function applyBulkPatch(rows: EditRow[], ids: Set<string>, patch: BulkPatch): number {
  let touched = 0;
  for (const r of rows) {
    if (!ids.has(r.fileId)) continue;
    if (patch.title !== undefined) r.title = patch.title;
    if (patch.level !== undefined) r.level = [...patch.level];
    if (patch.type !== undefined) r.type = patch.type;
    if (patch.subject !== undefined) r.subject = patch.subject;
    if (patch.chapter !== undefined) r.chapter = [...patch.chapter];
    touched++;
  }
  return touched;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/views/adminRows.test.ts`
Expected: PASS — all tests in the file, including the two touched/added above.

- [ ] **Step 5: Commit**

```bash
git add src/views/adminRows.ts src/views/adminRows.test.ts
git commit -m "feat: support title in bulk edit patch"
```

---

### Task 2: Title field in `BulkClassifyDialog.vue`

**Files:**
- Modify: `src/components/BulkClassifyDialog.vue`
- Test: `src/views/AdminView.test.ts` (the `describe("BulkClassifyDialog", ...)` block, currently lines 428-480, and the `describe("AdminView bulk classify", ...)` block, currently lines 382-426)

**Interfaces:**
- Consumes: `BulkPatch.title?: string` and `applyBulkPatch` from Task 1 (`src/views/adminRows.ts`) — already wired generically through `AdminView.vue:756-758`'s `onBulkApply(patch: BulkPatch)`, so no change needed in `AdminView.vue`.
- Consumes: `titleSuggestions(name: string, chapters: string[], type: string, programme: string[]): string[]` from `src/views/adminRows.ts:61-77` (unchanged).
- Produces: dialog now emits `apply` events that may include a `title` key, and exposes `titleOptions` (in addition to the already-exposed `form`, `touched`, `summary`, `confirm`) so tests can assert on computed suggestions without driving Vuetify's menu in jsdom.

- [ ] **Step 1: Write the failing tests**

In `src/views/AdminView.test.ts`, inside `describe("BulkClassifyDialog", ...)`, add these tests (after the last existing test in that block, i.e. after line 479's closing of the "marks an emptied list field as vidé" test):

```ts
  it("emits a touched title", async () => {
    const w = await mountDialog();
    w.vm.form.title = "Nouveau titre";
    w.vm.touched.title = true;
    await flushPromises();
    w.vm.confirm();
    expect(w.emitted("apply")![0][0]).toEqual({ title: "Nouveau titre" });
  });

  it("emits a touched-but-emptied title so it can be cleared", async () => {
    const w = await mountDialog();
    w.vm.touched.title = true;
    w.vm.form.title = "";
    await flushPromises();
    w.vm.confirm();
    expect(w.emitted("apply")![0][0]).toEqual({ title: "" });
  });

  it("summarises a touched title with its new value, and marks an emptied one as vidé", async () => {
    const w = await mountDialog();
    w.vm.touched.title = true;
    w.vm.form.title = "Mécanique — Cours";
    await flushPromises();
    expect(w.vm.summary).toEqual(["Titre → Mécanique — Cours"]);

    w.vm.form.title = "";
    await flushPromises();
    expect(w.vm.summary).toEqual(["Titre → (vidé)"]);
  });

  it("suggests titles from the chapter(s) chosen in this dialog, never from a file name", async () => {
    const w = await mountDialog();
    w.vm.form.chapter = ["Mécanique"];
    w.vm.form.type = "Cours";
    await flushPromises();
    expect(w.vm.titleOptions).toEqual(["Mécanique", "Mécanique — Cours"]);
  });
```

Also add one end-to-end test to `describe("AdminView bulk classify", ...)`, after the existing "applies a touched field to every selected row..." test (after line 411):

```ts
  it("applies a bulk title to every selected row", async () => {
    const { w, saveMeta } = await mountAdminWith(two);
    await selectAllAndOpenBulk(w);
    const dialog = w.findComponent({ name: "BulkClassifyDialog" });
    dialog.vm.$emit("apply", { title: "Chapitre 1" });
    await flushPromises();

    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();

    const sent = saveMeta.mock.calls[0][1];
    expect(sent.every((r: { title: string }) => r.title === "Chapitre 1")).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: FAIL — `w.vm.form.title` / `w.vm.touched.title` / `w.vm.titleOptions` are all `undefined` because the dialog's `form`/`touched` reactive objects have no `title` key yet and nothing computes `titleOptions`; the summary and `confirm()` assertions fail accordingly. The end-to-end test fails too, since Task 1's `applyBulkPatch` change alone doesn't let a user reach a `title` patch through the dialog's UI-facing `confirm()`.

- [ ] **Step 3: Implement**

In `src/components/BulkClassifyDialog.vue`, add the title field to the template as the first field in the form (insert right after the opening `<v-row dense>` at line 17, before the existing "Niveau(x) d'études" `<v-col>` at line 18):

```html
            <v-col cols="12">
              <v-combobox
                v-model="form.title"
                data-test="bulk-title"
                label="Titre d'affichage"
                :items="titleOptions"
                :placeholder="untouchedLabel"
                persistent-placeholder
                :hint="titleOptions.length ? 'Suggestions d’après le(s) chapitre(s) choisi(s) ci-dessous — ou saisissez le vôtre' : 'Choisissez un chapitre pour voir des suggestions'"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-format-title"
                class="rounded-lg mb-2"
                :menu-props="{ maxHeight: 300 }"
                @update:model-value="touched.title = true"
              />
              <v-btn
                v-if="touched.title"
                size="x-small"
                variant="text"
                class="mb-2"
                data-test="reset-title"
                @click="reset('title')"
              >
                Ne pas changer
              </v-btn>
            </v-col>
```

Then, in the `<script setup>` block:

Update the import (line 207) to also pull in `titleSuggestions`:

```ts
import { chaptersFor } from "../data/chapters";
import { titleSuggestions } from "../views/adminRows";
import type { BulkPatch } from "../views/adminRows";
```

Update `form` and `touched` (line 218-219) to include `title`:

```ts
const form = reactive({ title: "", level: [] as string[], type: "", subject: "", chapter: [] as string[] });
const touched = reactive({ title: false, level: false, type: false, subject: false, chapter: false });
```

Update `reset()` (lines 224-229) so the plain-string branch also covers `title` (it already does, since `title` falls into the `else form[field] = ""` branch — no change needed there beyond the `Field` type now including `"title"` automatically via `keyof typeof touched`).

Add the `titleOptions` computed, next to `chapterOptions` (after line 249):

```ts
// Suggestions for this dialog's title field: driven by whatever chapter(s)/type are chosen
// here, never by any single file's name (a bulk selection spans files with different names).
const titleOptions = computed(() =>
  titleSuggestions("", form.chapter, form.type, chapterOptions.value)
);
```

Update `summary` (lines 251-261) to include title first, matching its position in the template:

```ts
const summary = computed(() => {
  const lines: string[] = [];
  const show = (v: string) => (v === "" ? "(vidé)" : v);
  if (touched.title) lines.push(`Titre → ${show(form.title)}`);
  if (touched.level) lines.push(`Niveau → ${form.level.length ? form.level.join(", ") : "(vidé)"}`);
  if (touched.type) lines.push(`Type → ${show(form.type)}`);
  if (touched.subject) lines.push(`Matière → ${show(form.subject)}`);
  if (touched.chapter) {
    lines.push(`Chapitre → ${form.chapter.length ? form.chapter.join(", ") : "(vidé)"}`);
  }
  return lines;
});
```

Update `confirm()` (lines 267-275) to include title in the emitted patch:

```ts
function confirm(): void {
  const patch: BulkPatch = {};
  if (touched.title) patch.title = form.title ?? "";
  if (touched.level) patch.level = [...form.level];
  if (touched.type) patch.type = form.type ?? "";
  if (touched.subject) patch.subject = form.subject ?? "";
  if (touched.chapter) patch.chapter = [...form.chapter];
  emit("apply", patch);
  close();
}
```

Update `defineExpose` (line 278) to also expose `titleOptions`:

```ts
defineExpose({ form, touched, summary, confirm, titleOptions });
```

Also update the card subtitle's field-count copy if it names the fields — check line 8-11 first; if it just says "les champs laissés sur « ne pas changer » ne seront pas modifiés" (generic, no field count), no change is needed there.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: PASS — all tests in the file, including the five added/modified above.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no regressions elsewhere (e.g. in any snapshot or type-check step the project runs alongside vitest).

- [ ] **Step 6: Commit**

```bash
git add src/components/BulkClassifyDialog.vue src/views/AdminView.test.ts
git commit -m "feat: add titre d'affichage to bulk edit modal"
```

---

## Self-Review Notes

- **Spec coverage:** `BulkPatch`/`applyBulkPatch` (Task 1) ✓; title combobox + placement + touched/reset pattern (Task 2 Step 3 template) ✓; suggestions sourced from dialog's own chapter/type, name always `""` (Task 2 `titleOptions`) ✓; hint text (Task 2 template) ✓; confirmation summary line (Task 2 `summary`) ✓; out-of-scope items (no dedupe, no per-row values, no `AdminView.vue`/single-item-modal changes) — none of the tasks touch those areas ✓.
- **Type consistency:** `BulkPatch.title?: string` (Task 1) matches `patch.title` usage in `applyBulkPatch` (Task 1) and `confirm()` (Task 2) and the test assertions (`{ title: "..." }`) throughout. `titleSuggestions` signature `(name, chapters, type, programme)` used identically to its existing call site in `AdminView.vue:743-745`.
