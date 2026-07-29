# Admin Folder Navigation & Bulk Classification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin navigate the Drive folder tree with per-folder classification progress, scope the file table to a folder, and classify a whole selection of files in one action.

**Architecture:** A new pure module `src/lib/folderTree.ts` derives a folder tree from the `path` array each file already carries, so no backend change is needed. Two new components — `FolderTree.vue` (recursive sidebar) and `BulkClassifyDialog.vue` — keep `AdminView.vue` (already 618 lines, the largest file in the repo) from growing unmanageable. Bulk edits mutate the same local `rows` the per-file modal writes to, so the existing `changedRows`/`baseline`/`save` diffing machinery works unchanged.

**Tech Stack:** Vue 3 (`<script setup>`, Composition API), Vuetify 3.12.11, TypeScript, Vitest + @vue/test-utils, Vite.

**Spec:** `docs/superpowers/specs/2026-07-29-admin-folder-navigation-design.md`

## Global Constraints

- **UI language is French.** Every user-visible string is French. No i18n framework — strings are inline literals, matching the rest of the app.
- **No backend change.** Do not touch `apps-script/`. No new API endpoint, no change to `SaveInput`, no change to the wire format.
- **The four classification fields are Niveau, Type, Matière, Chapitre.** `level: string[]`, `type: string`, `subject: string`, `chapter: string[]`. `title` is a display label and is NOT a classification field.
- **One definition of "classé".** Always use `isClassified` from `src/lib/classification.ts`. Never re-implement the check.
- **Canonical field order** wherever fields are listed: Niveau, Type, Matière, Chapitre.
- **List fields replace, never merge**, on bulk apply.
- **Pure logic lives in `src/lib/*.ts` with its own `*.test.ts`.** Views/components are tested by mounting, via `mountWithVuetify` from `src/test/setup.ts`.
- **Verification commands:** `npx vitest run` (all tests) and `npm run build` (runs `vue-tsc --noEmit` then `vite build`). Both must pass before any commit.
- **Commit style:** `feat:` / `test:` / `refactor:` prefix, French-free English subject line, and every commit ends with the trailer:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```
- **Do not push.** Committing to the current branch is the end of each task.

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `src/lib/folderTree.ts` | create | Pure: build the folder tree from file paths; select files under a path. |
| `src/lib/folderTree.test.ts` | create | Unit tests for the above. |
| `src/lib/classification.ts` | modify | Add `missingFields`. |
| `src/lib/classification.test.ts` | modify | Tests for `missingFields`. |
| `src/views/adminRows.ts` | modify | Add `BulkPatch` + `applyBulkPatch`. |
| `src/views/adminRows.test.ts` | modify | Tests for `applyBulkPatch`. |
| `src/components/FolderTree.vue` | create | Recursive presentational sidebar tree. |
| `src/components/BulkClassifyDialog.vue` | create | Bulk-edit form + confirmation step. |
| `src/views/AdminView.vue` | modify | State + wiring: folder scope, status filter, selection, bulk apply. |
| `src/views/AdminView.test.ts` | modify | Mount-level tests for scoping, filtering, selection, bulk apply. |

---

### Task 1: Pure folder-tree module

**Files:**
- Create: `src/lib/folderTree.ts`
- Test: `src/lib/folderTree.test.ts`

**Interfaces:**
- Consumes: `Classifiable` and `isClassified` from `src/lib/classification.ts`.
- Produces:
  - `interface FolderNode { name: string; path: string[]; children: FolderNode[]; fileCount: number; classified: number; percent: number }`
  - `type FolderFile = Classifiable & { path: string[] }`
  - `buildFolderTree(files: FolderFile[]): FolderNode` — returns the synthetic root (`name: "Tout"`, `path: []`).
  - `filesUnder<T extends { path: string[] }>(files: T[], path: string[], recursive: boolean): T[]`

**Background:** Each file carries `path: string[]` — the chain of Drive folder names from the root down to its parent, e.g. `["2BAC-SM", "PHYSIQUE", "Mécanique"]`. A file sitting at the Drive root has `path: []`. Folders are not themselves library items (`buildLibrary` drops `isFolder` nodes), so the tree is derived purely from these arrays. Counts are **recursive**: a node counts every file anywhere beneath it, plus files directly in it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/folderTree.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildFolderTree, filesUnder, type FolderFile } from "./folderTree";

// A file at `path`; `done: true` makes it pass isClassified (all four fields set).
const f = (path: string[], done = false): FolderFile => ({
  path,
  level: done ? ["2ème Bac SM"] : [],
  type: done ? "Cours" : "",
  subject: done ? "Physique" : "",
  chapter: done ? ["Ondes"] : [],
});

describe("buildFolderTree", () => {
  it("nests folders from the path segments", () => {
    const root = buildFolderTree([f(["2BAC-SM", "PHYSIQUE", "Mécanique"])]);
    expect(root.name).toBe("Tout");
    expect(root.path).toEqual([]);
    const bac = root.children[0];
    expect(bac.name).toBe("2BAC-SM");
    expect(bac.path).toEqual(["2BAC-SM"]);
    const phys = bac.children[0];
    expect(phys.name).toBe("PHYSIQUE");
    expect(phys.path).toEqual(["2BAC-SM", "PHYSIQUE"]);
    expect(phys.children[0].name).toBe("Mécanique");
    expect(phys.children[0].children).toEqual([]);
  });

  it("counts files recursively on every ancestor, including the root", () => {
    const root = buildFolderTree([
      f(["2BAC-SM", "PHYSIQUE", "Mécanique"]),
      f(["2BAC-SM", "PHYSIQUE", "Ondes"]),
      f(["2BAC-SM", "CHIMIE"]),
    ]);
    expect(root.fileCount).toBe(3);
    const bac = root.children.find((c) => c.name === "2BAC-SM")!;
    expect(bac.fileCount).toBe(3);
    const phys = bac.children.find((c) => c.name === "PHYSIQUE")!;
    expect(phys.fileCount).toBe(2);
    expect(phys.children.find((c) => c.name === "Ondes")!.fileCount).toBe(1);
  });

  it("counts classified files and computes a rounded percent", () => {
    const root = buildFolderTree([
      f(["A"], true),
      f(["A"], true),
      f(["A"], false),
    ]);
    const a = root.children[0];
    expect(a.classified).toBe(2);
    expect(a.fileCount).toBe(3);
    expect(a.percent).toBe(67); // 66.67 rounds to 67
  });

  it("reports 0% for a folder with no files rather than dividing by zero", () => {
    const root = buildFolderTree([]);
    expect(root.fileCount).toBe(0);
    expect(root.percent).toBe(0);
    expect(root.children).toEqual([]);
  });

  it("counts a file sitting at the Drive root under 'Tout' but creates no folder", () => {
    const root = buildFolderTree([f([], true), f(["A"])]);
    expect(root.fileCount).toBe(2);
    expect(root.classified).toBe(1);
    expect(root.children.map((c) => c.name)).toEqual(["A"]);
  });

  it("sorts sibling folders alphabetically (fr locale)", () => {
    const root = buildFolderTree([f(["Zoo"]), f(["Élan"]), f(["Abc"])]);
    expect(root.children.map((c) => c.name)).toEqual(["Abc", "Élan", "Zoo"]);
  });

  it("handles a mixed drive: a flat dump folder beside a tidy nested branch", () => {
    const root = buildFolderTree([
      f(["2BAC-SM", "PHYSIQUE", "Mécanique"], true),
      f(["TELECHARGEMENTS"]),
      f(["TELECHARGEMENTS"]),
    ]);
    const dump = root.children.find((c) => c.name === "TELECHARGEMENTS")!;
    expect(dump.children).toEqual([]);
    expect(dump.fileCount).toBe(2);
    expect(dump.percent).toBe(0);
    const bac = root.children.find((c) => c.name === "2BAC-SM")!;
    expect(bac.percent).toBe(100);
  });
});

describe("filesUnder", () => {
  const items = [
    f(["2BAC-SM", "PHYSIQUE", "Mécanique"]),
    f(["2BAC-SM", "PHYSIQUE", "Ondes"]),
    f(["2BAC-SM", "PHYSIQUE"]),
    f(["2BAC-SM", "CHIMIE"]),
    f([]),
  ];

  it("recursive: returns every file beneath the path", () => {
    expect(filesUnder(items, ["2BAC-SM", "PHYSIQUE"], true)).toHaveLength(3);
  });

  it("non-recursive: returns only files sitting directly in the path", () => {
    const direct = filesUnder(items, ["2BAC-SM", "PHYSIQUE"], false);
    expect(direct).toHaveLength(1);
    expect(direct[0].path).toEqual(["2BAC-SM", "PHYSIQUE"]);
  });

  it("an empty path recursively means everything", () => {
    expect(filesUnder(items, [], true)).toHaveLength(5);
  });

  it("an empty path non-recursively means only files at the Drive root", () => {
    expect(filesUnder(items, [], false)).toHaveLength(1);
  });

  it("does not match a folder whose name merely starts with the same text", () => {
    const rows = [f(["PHYSIQUE-2"]), f(["PHYSIQUE"])];
    expect(filesUnder(rows, ["PHYSIQUE"], true)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/folderTree.test.ts`
Expected: FAIL — `Failed to resolve import "./folderTree"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/folderTree.ts`:

```ts
// The Drive folder tree, derived on the client from the `path` each file carries.
// Folders are not library items of their own (buildLibrary drops isFolder nodes), so a
// folder holding no files anywhere beneath it simply never appears here — which is right,
// since an empty folder has nothing to classify.

import { isClassified, type Classifiable } from "./classification";

export interface FolderNode {
  name: string;
  /** Path from the Drive root; also this node's identity. Empty for the root. */
  path: string[];
  children: FolderNode[];
  /** Recursive: files anywhere beneath this node, plus files directly in it. */
  fileCount: number;
  classified: number;
  /** Rounded; 0 when fileCount is 0. */
  percent: number;
}

/** Everything the tree needs from a file: where it sits, and its four fields. */
export type FolderFile = Classifiable & { path: string[] };

function node(name: string, path: string[]): FolderNode {
  return { name, path, children: [], fileCount: 0, classified: 0, percent: 0 };
}

function finalize(n: FolderNode): void {
  n.percent = n.fileCount === 0 ? 0 : Math.round((n.classified / n.fileCount) * 100);
  n.children.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  for (const c of n.children) finalize(c);
}

/** Build the tree. Returns the synthetic root, which holds every file. */
export function buildFolderTree(files: FolderFile[]): FolderNode {
  const root = node("Tout", []);
  for (const file of files) {
    const done = isClassified(file);
    let current = root;
    current.fileCount++;
    if (done) current.classified++;
    for (let i = 0; i < file.path.length; i++) {
      const name = file.path[i];
      let child = current.children.find((c) => c.name === name);
      if (!child) {
        child = node(name, file.path.slice(0, i + 1));
        current.children.push(child);
      }
      child.fileCount++;
      if (done) child.classified++;
      current = child;
    }
  }
  finalize(root);
  return root;
}

/**
 * Files under `path`. Recursive matches the whole subtree (an empty path means
 * everything); non-recursive matches only files sitting directly in that folder.
 */
export function filesUnder<T extends { path: string[] }>(
  files: T[],
  path: string[],
  recursive: boolean
): T[] {
  return files.filter((f) => {
    if (!recursive && f.path.length !== path.length) return false;
    return path.every((seg, i) => f.path[i] === seg);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/folderTree.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Verify the whole suite and the build**

Run: `npx vitest run && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/folderTree.ts src/lib/folderTree.test.ts
git commit -m "feat: derive a Drive folder tree with recursive classification counts

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `missingFields` helper

**Files:**
- Modify: `src/lib/classification.ts`
- Test: `src/lib/classification.test.ts`

**Interfaces:**
- Consumes: existing `Classifiable`, `isClassified`.
- Produces: `missingFields(x: Classifiable): string[]` — French labels of absent fields, always in the canonical order Niveau, Type, Matière, Chapitre. Returns `[]` exactly when `isClassified(x)` is `true`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/classification.test.ts` (the file already defines the `row` helper at the top — reuse it; it builds a fully classified row that you override):

```ts
describe("missingFields", () => {
  it("returns nothing for a fully classified row", () => {
    expect(missingFields(row())).toEqual([]);
  });

  it("names the absent fields in canonical order", () => {
    expect(missingFields(row({ level: [], subject: "" }))).toEqual(["Niveau", "Matière"]);
    expect(missingFields(row({ chapter: [], type: "" }))).toEqual(["Type", "Chapitre"]);
  });

  it("names all four when nothing is set", () => {
    expect(missingFields(row({ level: [], type: "", subject: "", chapter: [] }))).toEqual([
      "Niveau",
      "Type",
      "Matière",
      "Chapitre",
    ]);
  });

  it("is empty exactly when isClassified is true", () => {
    const rows = [row(), row({ type: "" }), row({ chapter: [] })];
    for (const r of rows) {
      expect(missingFields(r).length === 0).toBe(isClassified(r));
    }
  });
});
```

Update the import at the top of the file:

```ts
import { isClassified, classificationStats, missingFields } from "./classification";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/classification.test.ts`
Expected: FAIL — `missingFields is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/classification.ts`:

```ts
/**
 * French labels of the classification fields this row is still missing, in the canonical
 * order used throughout the UI. Empty exactly when isClassified is true — the two live
 * side by side so they cannot drift apart.
 */
export function missingFields(x: Classifiable): string[] {
  const missing: string[] = [];
  if (x.level.length === 0) missing.push("Niveau");
  if (!x.type) missing.push("Type");
  if (!x.subject) missing.push("Matière");
  if (x.chapter.length === 0) missing.push("Chapitre");
  return missing;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/classification.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the whole suite and the build**

Run: `npx vitest run && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/lib/classification.ts src/lib/classification.test.ts
git commit -m "feat: add missingFields to name a row's unfilled classification fields

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Bulk patch application

**Files:**
- Modify: `src/views/adminRows.ts`
- Test: `src/views/adminRows.test.ts`

**Interfaces:**
- Consumes: existing `EditRow` from the same file.
- Produces:
  - `interface BulkPatch { level?: string[]; type?: string; subject?: string; chapter?: string[] }`
  - `applyBulkPatch(rows: EditRow[], ids: Set<string>, patch: BulkPatch): number` — mutates matching rows in place, returns how many were changed.

**Why a key being absent matters:** the dialog distinguishes "ne pas changer" (key absent) from "vider ce champ" (key present, value empty). `applyBulkPatch` must branch on `!== undefined`, never on truthiness — otherwise clearing a field would silently do nothing.

- [ ] **Step 1: Write the failing test**

Append to `src/views/adminRows.test.ts`:

```ts
describe("applyBulkPatch", () => {
  const rows = () => [
    toEditRow({ ...item, fileId: "1", meta: { ...item.meta, fileId: "1" } }),
    toEditRow({ ...item, fileId: "2", meta: { ...item.meta, fileId: "2" } }),
  ];

  it("applies only the fields present in the patch, to the selected rows only", () => {
    const rs = rows();
    const n = applyBulkPatch(rs, new Set(["1"]), { subject: "Chimie" });
    expect(n).toBe(1);
    expect(rs[0].subject).toBe("Chimie");
    expect(rs[0].type).toBe("Cours"); // untouched field survives
    expect(rs[1].subject).toBe("Physique"); // unselected row untouched
  });

  it("replaces list fields rather than merging them", () => {
    const rs = rows();
    applyBulkPatch(rs, new Set(["1"]), { level: ["1ère Bac SM"], chapter: ["Optique"] });
    expect(rs[0].level).toEqual(["1ère Bac SM"]);
    expect(rs[0].chapter).toEqual(["Optique"]);
  });

  it("treats a present-but-empty value as an instruction to clear the field", () => {
    const rs = rows();
    applyBulkPatch(rs, new Set(["1"]), { type: "", level: [] });
    expect(rs[0].type).toBe("");
    expect(rs[0].level).toEqual([]);
  });

  it("clones list values so patched rows never share an array", () => {
    const rs = rows();
    const shared = ["2ème Bac SM"];
    applyBulkPatch(rs, new Set(["1", "2"]), { level: shared });
    rs[0].level.push("MUTATED");
    expect(rs[1].level).toEqual(["2ème Bac SM"]);
    expect(shared).toEqual(["2ème Bac SM"]);
  });

  it("returns 0 and changes nothing for an empty selection", () => {
    const rs = rows();
    expect(applyBulkPatch(rs, new Set(), { subject: "Chimie" })).toBe(0);
    expect(rs[0].subject).toBe("Physique");
  });
});
```

Update the import at the top of the file:

```ts
import { toEditRow, toSaveInput, saveKey, changedRows, applyBulkPatch } from "./adminRows";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/views/adminRows.test.ts`
Expected: FAIL — `applyBulkPatch is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/views/adminRows.ts`:

```ts
/**
 * A bulk edit. An ABSENT key means "ne pas changer"; a PRESENT key is applied even when
 * its value is empty, which is how "vider ce champ" is expressed. Never branch on
 * truthiness here — that would make clearing a field impossible.
 */
export interface BulkPatch {
  level?: string[];
  type?: string;
  subject?: string;
  chapter?: string[];
}

/**
 * Apply `patch` to every row whose fileId is in `ids`, in place. List fields are replaced
 * (never merged) and cloned, so patched rows never share an array. Returns the number of
 * rows touched.
 */
export function applyBulkPatch(rows: EditRow[], ids: Set<string>, patch: BulkPatch): number {
  let touched = 0;
  for (const r of rows) {
    if (!ids.has(r.fileId)) continue;
    if (patch.level !== undefined) r.level = [...patch.level];
    if (patch.type !== undefined) r.type = patch.type;
    if (patch.subject !== undefined) r.subject = patch.subject;
    if (patch.chapter !== undefined) r.chapter = [...patch.chapter];
    touched++;
  }
  return touched;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/views/adminRows.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the whole suite and the build**

Run: `npx vitest run && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/views/adminRows.ts src/views/adminRows.test.ts
git commit -m "feat: add applyBulkPatch for classifying many rows at once

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Folder sidebar and table scoping

**Files:**
- Create: `src/components/FolderTree.vue`
- Modify: `src/views/AdminView.vue`
- Test: `src/views/AdminView.test.ts`

**Interfaces:**
- Consumes: `buildFolderTree`, `filesUnder`, `FolderNode` from Task 1.
- Produces (in `AdminView.vue`, used by Tasks 5–6): the refs `selectedPath: Ref<string[]>`, `recursive: Ref<boolean>`, and the computed `scopedRows: ComputedRef<EditRow[]>` — the rows under the current folder, before any status filtering.
- Produces (component): `FolderTree.vue` with props `{ node: FolderNode; selected: string[]; depth?: number }` and emit `select(path: string[])`.

**Test-id conventions** used by all remaining tasks (the existing file already uses `data-test` on `unlock`, `save`, `reindex`, `edit-row`, `apply-edit`):

| id | element |
| --- | --- |
| `folder-node` | one row in the tree |
| `folder-recursive` | the "inclure les sous-dossiers" switch |
| `breadcrumb` | the path bar above the table |

- [ ] **Step 1: Write the failing test**

The existing `mountAdmin` helper mounts with a single fixed `item`. Add a variant that takes items, then the scoping tests. Append to `src/views/AdminView.test.ts`:

```ts
// A row at `path`, classified when `done`.
const fileAt = (fileId: string, path: string[], done = false): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path,
  webViewLink: "u", modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false,
  displayTitle: fileId + ".pdf",
  meta: {
    fileId,
    level: done ? ["2ème Bac SM"] : [],
    type: done ? "Cours" : "",
    subject: done ? "Physique" : "",
    chapter: done ? ["Ondes"] : [],
    title: "", description: "", tags: [], order: 0,
  },
});

async function mountAdminWith(items: LibraryItem[]) {
  const saveMeta = vi.fn().mockResolvedValue({ ok: true });
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
  }));
  vi.doMock("../api", () => ({ saveMeta, reindex: vi.fn() }));
  sessionStorage.setItem("drivo:admin_pw", "secret"); // skip the gate
  const AdminView = (await import("./AdminView.vue")).default;
  const w = mountWithVuetify(AdminView);
  await flushPromises();
  return { w, saveMeta };
}

// Click the tree row whose text contains `name`.
async function openFolder(w: any, name: string) {
  const node = w.findAll('[data-test="folder-node"]').find((n: any) => n.text().includes(name));
  await node.trigger("click");
  await flushPromises();
}

describe("AdminView folder navigation", () => {
  const drive = [
    fileAt("meca1", ["2BAC-SM", "PHYSIQUE", "Mécanique"]),
    fileAt("ondes1", ["2BAC-SM", "PHYSIQUE", "Ondes"]),
    fileAt("chimie1", ["2BAC-SM", "CHIMIE"]),
    fileAt("dump1", ["TELECHARGEMENTS"]),
  ];

  it("lists the top-level folders with their file counts", async () => {
    const { w } = await mountAdminWith(drive);
    const names = w.findAll('[data-test="folder-node"]').map((n) => n.text());
    expect(names.some((t) => t.includes("2BAC-SM"))).toBe(true);
    expect(names.some((t) => t.includes("TELECHARGEMENTS"))).toBe(true);
  });

  it("shows every file before a folder is chosen", async () => {
    const { w } = await mountAdminWith(drive);
    expect(w.text()).toContain("meca1.pdf");
    expect(w.text()).toContain("dump1.pdf");
  });

  it("scopes the table to the chosen folder, recursively", async () => {
    const { w } = await mountAdminWith(drive);
    await openFolder(w, "2BAC-SM");
    await openFolder(w, "PHYSIQUE");
    expect(w.text()).toContain("meca1.pdf");
    expect(w.text()).toContain("ondes1.pdf"); // subfolder file included
    expect(w.text()).not.toContain("chimie1.pdf");
    expect(w.text()).not.toContain("dump1.pdf");
  });

  it("shows the folder progress for the selected folder", async () => {
    const { w } = await mountAdminWith([
      fileAt("a", ["A"], true),
      fileAt("b", ["A"], false),
    ]);
    await openFolder(w, "A");
    expect(w.get('[data-test="progress"]').text()).toContain("1 / 2");
  });

  it("shows the selected path as a breadcrumb", async () => {
    const { w } = await mountAdminWith(drive);
    await openFolder(w, "2BAC-SM");
    expect(w.get('[data-test="breadcrumb"]').text()).toContain("2BAC-SM");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: FAIL — no element matches `[data-test="folder-node"]`.

- [ ] **Step 3: Create the tree component**

Create `src/components/FolderTree.vue`:

```vue
<template>
  <div class="folder-tree">
    <div
      data-test="folder-node"
      class="folder-row d-flex align-center ga-1 rounded-lg px-2 py-1"
      :class="{ 'folder-row--selected': isSelected }"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="emit('select', node.path)"
    >
      <v-icon
        v-if="node.children.length"
        :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        size="16"
        class="flex-shrink-0"
        @click.stop="expanded = !expanded"
      />
      <span v-else class="chevron-spacer flex-shrink-0" />

      <v-icon icon="mdi-folder-outline" size="16" class="flex-shrink-0" />

      <div class="d-flex flex-column flex-grow-1 overflow-hidden">
        <div class="d-flex align-center justify-space-between ga-2">
          <span class="text-caption font-weight-medium text-truncate" :title="node.name">
            {{ node.name }}
          </span>
          <span class="text-caption text-disabled flex-shrink-0">{{ node.percent }}%</span>
        </div>
        <v-progress-linear
          :model-value="node.percent"
          :color="barColor"
          height="3"
          rounded
          class="mt-1"
        />
      </div>
    </div>

    <template v-if="expanded">
      <FolderTree
        v-for="child in node.children"
        :key="child.path.join('/')"
        :node="child"
        :selected="selected"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
// Recursive, presentational: renders whatever tree it is handed and emits the path that
// was clicked. No store access, so it can be reasoned about (and tested) on its own.
import { ref, computed, watch } from "vue";
import type { FolderNode } from "../lib/folderTree";

const props = withDefaults(
  defineProps<{ node: FolderNode; selected: string[]; depth?: number }>(),
  { depth: 0 }
);
const emit = defineEmits<{ select: [path: string[]] }>();

const key = computed(() => props.node.path.join("/"));
const selectedKey = computed(() => props.selected.join("/"));

const isSelected = computed(() => key.value === selectedKey.value);

/** True when this node is an ancestor of (or is) the selection. */
const onSelectedBranch = computed(
  () => key.value === "" || selectedKey.value === key.value || selectedKey.value.startsWith(key.value + "/")
);

// The root starts open; everything else opens only along the selected branch, because 99
// folders expanded at once is unusable.
const expanded = ref(props.depth === 0 || onSelectedBranch.value);
watch(onSelectedBranch, (on) => {
  if (on) expanded.value = true;
});

const barColor = computed(() => {
  if (props.node.percent === 100) return "success";
  return props.node.percent === 0 ? "grey-lighten-1" : "primary";
});
</script>

<style scoped>
.folder-row {
  cursor: pointer;
}
.folder-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.folder-row--selected {
  background: rgba(var(--v-theme-primary), 0.12);
}
.chevron-spacer {
  width: 16px;
}
</style>
```

- [ ] **Step 4: Wire the sidebar into AdminView**

In `src/views/AdminView.vue`:

**4a.** Add to the `<script setup>` imports (after the existing `classificationStats` import):

```ts
import FolderTree from "../components/FolderTree.vue";
import { buildFolderTree, filesUnder } from "../lib/folderTree";
```

**4b.** Add state next to the existing `const search = ref("")`:

```ts
// Folder navigation. An empty path is the synthetic "Tout" root.
const selectedPath = ref<string[]>([]);
const recursive = ref(true);
const folderDrawer = ref(false); // mobile only

// The tree is built from `rows`, not `items`, so its percentages move as you classify
// and before you save — matching the global progress bar.
const tree = computed(() => buildFolderTree(rows.value));

/** Rows under the selected folder, before status filtering. */
const scopedRows = computed(() => filesUnder(rows.value, selectedPath.value, recursive.value));

function onSelectFolder(path: string[]): void {
  selectedPath.value = path;
  folderDrawer.value = false;
}
```

**4c.** Point the progress card at the scope. Replace:

```ts
const stats = computed(() => classificationStats(rows.value));
```

with:

```ts
// Progress for the folder currently in view ("Tout" = the whole library).
const stats = computed(() => classificationStats(scopedRows.value));
```

**4d.** In the template, replace the single `<v-data-table :items="rows">` binding with `:items="scopedRows"`:

```html
<v-data-table
  :headers="headers"
  :items="scopedRows"
  :search="search"
  ...
```

**4e.** Wrap the progress card and the table card in a two-column layout, with the sidebar as the first column.

This is a **move, not a rewrite**. In the current file, the region running from the
`<!-- Classification progress -->` comment (line ~89) through the `</v-card>` that closes
the data-table card (line ~206) becomes the second column of a new `v-row`. The
`<v-data-table>` element and every one of its `#item.*` slot templates are moved verbatim —
the only edit inside it is the `:items` binding from step 4d. Do not retype the slot
templates; cut and paste them.

Replace that region with:

```html
      <v-row class="ma-0">
        <!-- Folder sidebar (md and up) -->
        <v-col cols="12" md="3" class="pa-0 pr-md-4 d-none d-md-block">
          <v-card class="rounded-xl border pa-2 folder-pane" elevation="0">
            <div class="text-overline px-2 pb-1 text-medium-emphasis">Dossiers</div>
            <FolderTree :node="tree" :selected="selectedPath" @select="onSelectFolder" />
          </v-card>
        </v-col>

        <v-col cols="12" md="9" class="pa-0">
          <!-- Classification progress (scoped to the selected folder) -->
          <v-card v-show="rows.length > 0" class="rounded-xl border pa-4 mb-4" elevation="0" data-test="progress">
            <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
              <span class="text-body-2 font-weight-medium d-flex align-center ga-2">
                <v-icon icon="mdi-progress-check" size="18" color="primary" />
                Fichiers classés (Niveau · Type · Matière · Chapitre)
              </span>
              <span class="text-body-2 font-weight-bold">
                {{ stats.classified }} / {{ stats.total }}
                <span :class="stats.percent === 100 ? 'text-success' : 'text-primary'">({{ stats.percent }}%)</span>
              </span>
            </div>
            <v-progress-linear
              :model-value="stats.percent"
              :color="stats.percent === 100 ? 'success' : 'primary'"
              height="8"
              rounded
            />
          </v-card>

          <!-- Breadcrumb + scope toggle -->
          <v-card v-show="rows.length > 0" class="rounded-xl border pa-3 mb-4" elevation="0">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
              <div data-test="breadcrumb" class="d-flex align-center flex-wrap ga-1">
                <v-btn size="small" variant="text" class="rounded-pill px-2" @click="onSelectFolder([])">
                  <v-icon icon="mdi-folder-home-outline" size="16" class="mr-1" />
                  Tout
                </v-btn>
                <template v-for="(seg, i) in selectedPath" :key="i">
                  <span class="text-disabled">/</span>
                  <v-btn size="small" variant="text" class="rounded-pill px-2" @click="onSelectFolder(selectedPath.slice(0, i + 1))">
                    {{ seg }}
                  </v-btn>
                </template>
              </div>

              <div class="d-flex align-center ga-3">
                <v-btn
                  class="d-md-none rounded-pill"
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-folder-outline"
                  @click="folderDrawer = true"
                >
                  Dossiers
                </v-btn>
                <v-switch
                  v-model="recursive"
                  data-test="folder-recursive"
                  label="Inclure les sous-dossiers"
                  color="primary"
                  density="compact"
                  hide-details
                  class="flex-grow-0"
                />
              </div>
            </div>
          </v-card>

          <!-- Data Table Card — the existing card, moved here unchanged. Its <v-data-table>
               keeps all four #item.* slot templates (name, level, chapter, actions) exactly
               as they are today; only :items changes, per step 4d. -->
          <v-card v-show="rows.length > 0" class="rounded-2xl border pa-2 overflow-hidden shadow-sm" elevation="0">
            <v-data-table
              :headers="headers"
              :items="scopedRows"
              :search="search"
              :loading="loading"
              item-value="fileId"
              :items-per-page="25"
              :items-per-page-options="[10, 25, 50, 100]"
              density="comfortable"
              hover
              class="admin-table"
            >
              <!-- moved verbatim: #item.name, #item.level, #item.chapter, #item.actions -->
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>

      <!-- Folder sidebar as a drawer on small screens -->
      <v-navigation-drawer v-model="folderDrawer" temporary location="left" width="300">
        <div class="text-overline px-4 py-2 text-medium-emphasis">Dossiers</div>
        <FolderTree :node="tree" :selected="selectedPath" @select="onSelectFolder" />
      </v-navigation-drawer>
```

**4f.** Add to the component's `<style scoped>` block:

```css
.folder-pane {
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: PASS — the new `AdminView folder navigation` block plus all pre-existing AdminView tests.

If the pre-existing test `"after unlocking shows the editor table with a row"` fails, check that `:items="scopedRows"` still shows everything when `selectedPath` is `[]` — the default scope must be the whole library.

- [ ] **Step 6: Verify the whole suite and the build**

Run: `npx vitest run && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/components/FolderTree.vue src/views/AdminView.vue src/views/AdminView.test.ts
git commit -m "feat: folder sidebar with per-folder progress, scoping the admin table

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Status filter and missing-field chips

**Files:**
- Modify: `src/views/AdminView.vue`
- Test: `src/views/AdminView.test.ts`

**Interfaces:**
- Consumes: `scopedRows` (Task 4), `missingFields` and `isClassified` (Task 2).
- Produces: `statusFilter: Ref<"todo" | "done" | "all">` and the computed `visibleRows: ComputedRef<EditRow[]>` — `scopedRows` narrowed by status. Task 6 binds the table and select-all to `visibleRows`.

**Rules from the spec:**
- Default is `"todo"` (À classer).
- The filter is **sticky across folder changes** — never reset it in `onSelectFolder`.
- The three counts are computed from `scopedRows` and **ignore the search box**, so they answer "how much is left in this folder" and don't shift while typing.

- [ ] **Step 1: Write the failing test**

Append to `src/views/AdminView.test.ts`:

```ts
describe("AdminView status filter", () => {
  const mixed = [
    fileAt("done1", ["A"], true),
    fileAt("todo1", ["A"], false),
  ];

  it("defaults to 'À classer' and hides classified rows", async () => {
    const { w } = await mountAdminWith(mixed);
    expect(w.text()).toContain("todo1.pdf");
    expect(w.text()).not.toContain("done1.pdf");
  });

  it("shows classified rows under 'Classés' and both under 'Tous'", async () => {
    const { w } = await mountAdminWith(mixed);
    await w.get('[data-test="status-done"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("done1.pdf");
    expect(w.text()).not.toContain("todo1.pdf");

    await w.get('[data-test="status-all"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("done1.pdf");
    expect(w.text()).toContain("todo1.pdf");
  });

  it("keeps the chosen status when moving to another folder", async () => {
    const { w } = await mountAdminWith([
      ...mixed,
      fileAt("done2", ["B"], true),
    ]);
    await w.get('[data-test="status-done"]').trigger("click");
    await flushPromises();
    await openFolder(w, "B");
    expect(w.text()).toContain("done2.pdf"); // still on "Classés", not reset to "À classer"
  });

  it("counts the folder scope and ignores the search box", async () => {
    const { w } = await mountAdminWith(mixed);
    const before = w.get('[data-test="status-todo"]').text();
    expect(before).toContain("1");
    await w.get('[data-test="search"] input').setValue("zzz-no-match");
    await flushPromises();
    expect(w.get('[data-test="status-todo"]').text()).toBe(before);
  });

  it("names the fields an unclassified row is missing", async () => {
    const { w } = await mountAdminWith([fileAt("todo1", ["A"], false)]);
    expect(w.text()).toContain("Niveau");
    expect(w.text()).toContain("Chapitre");
  });
});
```

Note: this needs `data-test="search"` on the existing search field, which does not have it yet — add it in Step 3.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/views/AdminView.test.ts -t "status filter"`
Expected: FAIL — no element matches `[data-test="status-done"]`.

- [ ] **Step 3: Write the implementation**

**3a.** Add `data-test="search"` to the existing search `v-text-field` in the toolbar (around line 9):

```html
          <v-text-field
            v-model="search"
            data-test="search"
            placeholder="Rechercher par fichier, titre, niveau..."
```

**3b.** Add to `<script setup>`, after the folder state from Task 4:

```ts
import { isClassified, classificationStats, missingFields } from "../lib/classification";
```

(replacing the existing `classificationStats`-only import), then:

```ts
// Sticky across folder changes: the workflow is moving folder to folder hunting
// unclassified files, so resetting this on every hop would fight the user.
const statusFilter = ref<"todo" | "done" | "all">("todo");

/** Counts for the three buttons: scoped to the folder, deliberately ignoring `search`. */
const statusCounts = computed(() => {
  const done = scopedRows.value.filter(isClassified).length;
  return { todo: scopedRows.value.length - done, done, all: scopedRows.value.length };
});

/** Rows actually shown: folder scope narrowed by status. `search` is applied by the table. */
const visibleRows = computed(() => {
  if (statusFilter.value === "all") return scopedRows.value;
  const wantClassified = statusFilter.value === "done";
  return scopedRows.value.filter((r) => isClassified(r) === wantClassified);
});
```

**3c.** Bind the table to `visibleRows` instead of `scopedRows`:

```html
<v-data-table
  :headers="headers"
  :items="visibleRows"
```

**3d.** Add the filter buttons inside the breadcrumb card from Task 4, as a new row beneath the breadcrumb `div`:

```html
              <v-btn-toggle
                v-model="statusFilter"
                mandatory
                density="compact"
                variant="outlined"
                divided
                class="rounded-pill"
              >
                <v-btn value="todo" size="small" data-test="status-todo" class="px-3">
                  À classer ({{ statusCounts.todo }})
                </v-btn>
                <v-btn value="done" size="small" data-test="status-done" class="px-3">
                  Classés ({{ statusCounts.done }})
                </v-btn>
                <v-btn value="all" size="small" data-test="status-all" class="px-3">
                  Tous ({{ statusCounts.all }})
                </v-btn>
              </v-btn-toggle>
```

**3e.** Add the missing-field chips to the Niveau/Type cell template, replacing the existing `<span v-if="!item.level.length && !item.type">—</span>` line:

```html
              <div v-if="missingFields(item).length" class="d-flex flex-wrap ga-1 mt-1">
                <v-chip
                  v-for="f in missingFields(item)"
                  :key="f"
                  size="x-small"
                  color="warning"
                  variant="tonal"
                  prepend-icon="mdi-alert-outline"
                >
                  {{ f }}
                </v-chip>
              </div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: PASS.

Watch for a pre-existing test breaking here: `"after unlocking shows the editor table with a row"` uses the unclassified `item`, which the default `"todo"` filter still shows — so it should stay green. If a test that expects a *classified* row to be visible fails, that test must click `[data-test="status-all"]` first.

- [ ] **Step 5: Verify the whole suite and the build**

Run: `npx vitest run && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/views/AdminView.vue src/views/AdminView.test.ts
git commit -m "feat: à classer/classés filter and per-row missing-field chips

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Row selection

**Files:**
- Modify: `src/views/AdminView.vue`
- Test: `src/views/AdminView.test.ts`

**Interfaces:**
- Consumes: `visibleRows` (Task 5), `selectedPath` (Task 4).
- Produces: `selectedIds: Ref<string[]>` — fileIds of checked rows. Task 7 turns this into the `Set` that `applyBulkPatch` consumes.

**The select-all rule:** Vuetify's default `select-strategy` is `"page"`, so the header checkbox would tick only the visible page — meaning "select all" in a 40-file folder at 25 rows/page silently means the first 25. Set `select-strategy="all"` so it covers the entire filtered set.

- [ ] **Step 1: Write the failing test**

Append to `src/views/AdminView.test.ts`:

```ts
describe("AdminView row selection", () => {
  // 30 unclassified files in one folder: more than one page at 25 per page.
  const many = Array.from({ length: 30 }, (_, i) => fileAt(`f${i}`, ["A"], false));

  it("selects every row in the filtered scope, not just the visible page", async () => {
    const { w } = await mountAdminWith(many);
    await w.get('[data-test="select-all"] input').setValue(true);
    await flushPromises();
    expect(w.get('[data-test="selection-bar"]').text()).toContain("30");
  });

  it("clears the selection when the folder changes", async () => {
    const { w } = await mountAdminWith([
      fileAt("a1", ["A"]),
      fileAt("b1", ["B"]),
    ]);
    await openFolder(w, "A");
    await w.get('[data-test="select-all"] input').setValue(true);
    await flushPromises();
    expect(w.find('[data-test="selection-bar"]').exists()).toBe(true);

    await openFolder(w, "B");
    expect(w.find('[data-test="selection-bar"]').exists()).toBe(false);
  });

  it("hides the selection bar when nothing is selected", async () => {
    const { w } = await mountAdminWith([fileAt("a1", ["A"])]);
    expect(w.find('[data-test="selection-bar"]').exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/views/AdminView.test.ts -t "row selection"`
Expected: FAIL — no element matches `[data-test="select-all"]`.

- [ ] **Step 3: Write the implementation**

**3a.** Add state to `<script setup>`:

```ts
const selectedIds = ref<string[]>([]);
```

**3b.** Clear the selection on folder change — a stale selection must never be bulk-applied to files that are no longer on screen. Update `onSelectFolder` from Task 4:

```ts
function onSelectFolder(path: string[]): void {
  selectedPath.value = path;
  selectedIds.value = [];
  folderDrawer.value = false;
}
```

**3c.** Enable selection on the table:

```html
<v-data-table
  v-model="selectedIds"
  :headers="headers"
  :items="visibleRows"
  :search="search"
  :loading="loading"
  item-value="fileId"
  show-select
  select-strategy="all"
  ...
```

**3d.** Add the header-checkbox test hook. Vuetify renders the select-all checkbox in the header; give it a stable hook with a header slot template placed just inside `<v-data-table>`, before the existing `#item.name` template:

```html
          <template #header.data-table-select="{ allSelected, selectAll }">
            <v-checkbox-btn
              data-test="select-all"
              :model-value="allSelected"
              @update:model-value="selectAll(!allSelected)"
            />
          </template>
```

**3e.** Add the selection bar directly above the data-table card, inside the same `v-col`:

```html
          <v-card
            v-if="selectedIds.length > 0"
            data-test="selection-bar"
            class="rounded-xl border pa-3 mb-4 d-flex align-center flex-wrap ga-3"
            color="primary"
            variant="tonal"
            elevation="0"
          >
            <span class="font-weight-bold">
              {{ selectedIds.length }} fichier{{ selectedIds.length > 1 ? "s" : "" }} sélectionné{{ selectedIds.length > 1 ? "s" : "" }}
            </span>
            <v-spacer />
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              class="rounded-pill px-4 font-weight-bold"
              prepend-icon="mdi-tag-multiple-outline"
              data-test="open-bulk"
              @click="bulkDialog = true"
            >
              Classer la sélection
            </v-btn>
            <v-btn size="small" variant="text" class="rounded-pill" @click="selectedIds = []">
              Désélectionner
            </v-btn>
          </v-card>
```

**3f.** `bulkDialog` is introduced in Task 7. To keep this task's build green, declare it now alongside `selectedIds`:

```ts
const bulkDialog = ref(false);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the whole suite and the build**

Run: `npx vitest run && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/views/AdminView.vue src/views/AdminView.test.ts
git commit -m "feat: select rows across the whole filtered scope, with a selection bar

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Bulk classify dialog

**Files:**
- Create: `src/components/BulkClassifyDialog.vue`
- Modify: `src/views/AdminView.vue`
- Test: `src/views/AdminView.test.ts`

**Interfaces:**
- Consumes: `BulkPatch` + `applyBulkPatch` (Task 3), `selectedIds` + `bulkDialog` (Task 6), `LEVELS`/`TYPES`/`SUBJECTS` from `src/config.ts`, `chaptersFor` from `src/data/chapters.ts`.
- Produces: `BulkClassifyDialog.vue` with `v-model` (open state), prop `count: number`, emit `apply(patch: BulkPatch)`.

**The core rule:** each of the four fields has a `touched` flag. A field is included in the emitted patch **only if touched**. Touched-but-empty means "vider ce champ" and must still be emitted. Never derive the patch from whether a value is empty.

- [ ] **Step 1: Write the failing test**

Append to `src/views/AdminView.test.ts`. The dialog is teleported to `document.body`, so query it through `document`, the way the existing `editTitleViaModal` helper does:

```ts
describe("AdminView bulk classify", () => {
  const two = [fileAt("a1", ["A"]), fileAt("a2", ["A"])];

  async function selectAllAndOpenBulk(w: any) {
    await w.get('[data-test="select-all"] input').setValue(true);
    await flushPromises();
    await w.get('[data-test="open-bulk"]').trigger("click");
    await flushPromises();
  }

  it("applies a touched field to every selected row and leaves the rest alone", async () => {
    const { w, saveMeta } = await mountAdminWith(two);
    await selectAllAndOpenBulk(w);

    // Choose Matière = Chimie, then confirm.
    (document.querySelector('[data-test="bulk-subject"] input') as HTMLInputElement).value = "Chimie";
    document
      .querySelector('[data-test="bulk-subject"] input')!
      .dispatchEvent(new Event("input"));
    await flushPromises();
    (document.querySelector('[data-test="bulk-apply"]') as HTMLButtonElement).click();
    await flushPromises();
    (document.querySelector('[data-test="bulk-confirm"]') as HTMLButtonElement).click();
    await flushPromises();

    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();

    const sent = saveMeta.mock.calls[0][1];
    expect(sent).toHaveLength(2);
    expect(sent.every((r: any) => r.subject === "Chimie")).toBe(true);
    expect(sent.every((r: any) => r.type === "")).toBe(true); // untouched stays empty
  });

  it("does not change anything until the confirmation is accepted", async () => {
    const { w } = await mountAdminWith(two);
    await selectAllAndOpenBulk(w);
    (document.querySelector('[data-test="bulk-subject"] input') as HTMLInputElement).value = "Chimie";
    document.querySelector('[data-test="bulk-subject"] input')!.dispatchEvent(new Event("input"));
    await flushPromises();
    (document.querySelector('[data-test="bulk-apply"]') as HTMLButtonElement).click();
    await flushPromises();

    // Confirmation is showing, but nothing has been written yet.
    expect(w.text()).not.toContain("2 modifications non enregistrées");
  });

  it("reports the count in the confirmation", async () => {
    const { w } = await mountAdminWith(two);
    await selectAllAndOpenBulk(w);
    (document.querySelector('[data-test="bulk-subject"] input') as HTMLInputElement).value = "Chimie";
    document.querySelector('[data-test="bulk-subject"] input')!.dispatchEvent(new Event("input"));
    await flushPromises();
    (document.querySelector('[data-test="bulk-apply"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(document.querySelector('[data-test="bulk-confirm-text"]')!.textContent).toContain("2");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/views/AdminView.test.ts -t "bulk classify"`
Expected: FAIL — `[data-test="bulk-subject"]` is null.

- [ ] **Step 3: Create the dialog component**

Create `src/components/BulkClassifyDialog.vue`:

```vue
<template>
  <v-dialog :model-value="modelValue" max-width="640" persistent @update:model-value="close">
    <v-card class="rounded-2xl pa-2">
      <!-- Step 1: the form -->
      <template v-if="!confirming">
        <v-card-item class="pb-2">
          <v-card-title class="text-h6 font-weight-bold">Classer la sélection</v-card-title>
          <v-card-subtitle>
            {{ count }} fichier{{ count > 1 ? "s" : "" }} · les champs laissés sur
            « ne pas changer » ne seront pas modifiés
          </v-card-subtitle>
        </v-card-item>

        <v-divider class="my-2" />

        <v-card-text class="pt-2">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.level"
                data-test="bulk-level"
                label="Niveau(x) d'études"
                :items="LEVELS"
                :placeholder="untouchedLabel"
                persistent-placeholder
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-school-outline"
                class="rounded-lg mb-2"
                @update:model-value="touched.level = true"
              >
                <template #append>
                  <v-btn
                    v-if="touched.level"
                    size="x-small"
                    variant="text"
                    @click="reset('level')"
                  >
                    Ne pas changer
                  </v-btn>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.type"
                data-test="bulk-type"
                label="Type de document"
                :items="TYPES"
                :placeholder="untouchedLabel"
                persistent-placeholder
                clearable
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-file-document-outline"
                class="rounded-lg mb-2"
                @update:model-value="touched.type = true"
              >
                <template #append>
                  <v-btn v-if="touched.type" size="x-small" variant="text" @click="reset('type')">
                    Ne pas changer
                  </v-btn>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.subject"
                data-test="bulk-subject"
                label="Matière"
                :items="SUBJECTS"
                :placeholder="untouchedLabel"
                persistent-placeholder
                clearable
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-book-open-variant"
                class="rounded-lg mb-2"
                @update:model-value="touched.subject = true"
              >
                <template #append>
                  <v-btn v-if="touched.subject" size="x-small" variant="text" @click="reset('subject')">
                    Ne pas changer
                  </v-btn>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12" sm="6">
              <v-combobox
                v-model="form.chapter"
                data-test="bulk-chapter"
                label="Chapitre(s)"
                :items="chapterOptions"
                :placeholder="untouchedLabel"
                persistent-placeholder
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-bookmark-outline"
                class="rounded-lg mb-2"
                @update:model-value="touched.chapter = true"
              >
                <template #append>
                  <v-btn v-if="touched.chapter" size="x-small" variant="text" @click="reset('chapter')">
                    Ne pas changer
                  </v-btn>
                </template>
              </v-combobox>
            </v-col>
          </v-row>

          <v-alert
            v-if="!anyTouched"
            type="info"
            variant="tonal"
            density="compact"
            class="rounded-lg mt-2"
          >
            Modifiez au moins un champ pour pouvoir appliquer.
          </v-alert>
        </v-card-text>

        <v-divider class="my-1" />

        <v-card-actions class="pa-4">
          <v-btn variant="text" class="rounded-pill px-4" @click="close">Annuler</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="rounded-pill px-6 font-weight-bold"
            prepend-icon="mdi-check"
            data-test="bulk-apply"
            :disabled="!anyTouched"
            @click="confirming = true"
          >
            Appliquer
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Step 2: the confirmation -->
      <template v-else>
        <v-card-item class="pb-2">
          <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
            <v-icon icon="mdi-alert-outline" color="warning" />
            Appliquer à {{ count }} fichier{{ count > 1 ? "s" : "" }} ?
          </v-card-title>
        </v-card-item>

        <v-card-text data-test="bulk-confirm-text">
          <div v-for="line in summary" :key="line" class="text-body-2 mb-1">• {{ line }}</div>
          <div class="text-body-2 mt-3 font-weight-medium">
            {{ count }} fichier{{ count > 1 ? "s" : "" }} {{ count > 1 ? "seront modifiés" : "sera modifié" }}.
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-btn variant="text" class="rounded-pill px-4" @click="confirming = false">Retour</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="rounded-pill px-6 font-weight-bold"
            data-test="bulk-confirm"
            @click="confirm"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// Bulk edit of the four classification fields.
//
// A field is emitted ONLY when it has been touched. "Touched but empty" is a real
// instruction ("vider ce champ") and is still emitted — which is why the patch is built
// from the `touched` flags and never from whether a value looks empty.
import { ref, reactive, computed, watch } from "vue";
import { LEVELS, TYPES, SUBJECTS } from "../config";
import { chaptersFor } from "../data/chapters";
import type { BulkPatch } from "../views/adminRows";

const props = defineProps<{ modelValue: boolean; count: number }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [patch: BulkPatch];
}>();

const untouchedLabel = "— ne pas changer —";

const form = reactive({ level: [] as string[], type: "", subject: "", chapter: [] as string[] });
const touched = reactive({ level: false, type: false, subject: false, chapter: false });
const confirming = ref(false);

type Field = keyof typeof touched;

function reset(field: Field): void {
  touched[field] = false;
  if (field === "level") form.level = [];
  else if (field === "chapter") form.chapter = [];
  else form[field] = "";
}

function resetAll(): void {
  (Object.keys(touched) as Field[]).forEach(reset);
  confirming.value = false;
}

// Start clean every time the dialog opens, so a previous edit never leaks into the next.
watch(
  () => props.modelValue,
  (open) => {
    if (open) resetAll();
  }
);

const anyTouched = computed(() => Object.values(touched).some(Boolean));

// Chapters of the official programme for whichever levels are chosen here.
const chapterOptions = computed(() => [
  ...new Set(form.level.flatMap((l) => chaptersFor(l, form.subject))),
]);

const summary = computed(() => {
  const lines: string[] = [];
  const show = (v: string) => (v === "" ? "(vidé)" : v);
  if (touched.level) lines.push(`Niveau → ${form.level.length ? form.level.join(", ") : "(vidé)"}`);
  if (touched.type) lines.push(`Type → ${show(form.type)}`);
  if (touched.subject) lines.push(`Matière → ${show(form.subject)}`);
  if (touched.chapter) {
    lines.push(`Chapitre → ${form.chapter.length ? form.chapter.join(", ") : "(vidé)"}`);
  }
  return lines;
});

function close(): void {
  emit("update:modelValue", false);
}

function confirm(): void {
  const patch: BulkPatch = {};
  if (touched.level) patch.level = [...form.level];
  if (touched.type) patch.type = form.type ?? "";
  if (touched.subject) patch.subject = form.subject ?? "";
  if (touched.chapter) patch.chapter = [...form.chapter];
  emit("apply", patch);
  close();
}
</script>
```

- [ ] **Step 4: Wire it into AdminView**

**4a.** Add imports:

```ts
import BulkClassifyDialog from "../components/BulkClassifyDialog.vue";
import { toEditRow, toSaveInput, saveKey, changedRows, applyBulkPatch, type EditRow, type BulkPatch } from "./adminRows";
```

(the existing `adminRows` import already brings in the first four names and `EditRow` — extend it rather than adding a second import line).

**4b.** Add the handler beside `applyModalEdits`:

```ts
function onBulkApply(patch: BulkPatch): void {
  const n = applyBulkPatch(rows.value, new Set(selectedIds.value), patch);
  selectedIds.value = [];
  notify(`Appliqué à ${n} fichier${n > 1 ? "s" : ""} ✓`, "success");
}
```

**4c.** Mount the dialog next to the existing edit dialog, just before the `<!-- Global Feedback Snackbar -->` comment:

```html
    <BulkClassifyDialog v-model="bulkDialog" :count="selectedIds.length" @apply="onBulkApply" />
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/views/AdminView.test.ts`
Expected: PASS.

If the `v-select` value cannot be driven by setting `input.value` in jsdom, drive the component directly instead — find it with `w.findComponent` is not possible here (teleported), so use the exposed emit path:

```ts
const dialog = w.findComponent({ name: "BulkClassifyDialog" });
dialog.vm.$emit("apply", { subject: "Chimie" });
await flushPromises();
```

That still exercises `onBulkApply` + `applyBulkPatch` + the save diff, which is the behaviour under test; the form's internal wiring is then covered by the confirmation-text assertion alone.

- [ ] **Step 6: Verify the whole suite and the build**

Run: `npx vitest run && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/BulkClassifyDialog.vue src/views/AdminView.vue src/views/AdminView.test.ts
git commit -m "feat: bulk-classify a selection with a confirmation step

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification

After Task 7, run `npm run dev`, open `http://localhost:5173/drivo/#/admin`, unlock, and confirm:

1. The folder sidebar lists the real Drive structure, each folder showing a percentage.
2. Clicking a folder scopes the table; the breadcrumb updates; the progress card shows that folder's numbers.
3. Turning off "Inclure les sous-dossiers" narrows the table to files sitting directly in the folder.
4. "À classer" is the default and hides finished files; the counts don't move while typing in the search box.
5. Select-all in a folder with more than 25 files reports the full count, not 25.
6. Bulk-applying Niveau + Matière to a tidy folder shows the confirmation with both lines, then bumps the unsaved-changes badge by the full count.
7. "Enregistrer" persists them; reloading the page shows the values still there.
8. Narrow the window below `md`: the sidebar collapses and the "Dossiers" button opens it as a drawer.

## Out of scope

Per the spec, do NOT build: drag-and-drop between folders, renaming or moving files in Drive, per-folder saved rules, auto-classification from folder names, undo of a bulk apply, or any change to the student-facing Browse/Menu views.
