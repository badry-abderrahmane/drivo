# Drive-Backed Course Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static GitHub Pages site that previews a Google Drive folder of Moroccan physics course material, organized by custom metadata, with a password-gated admin editor backed by a Google Apps Script + Google Sheet backend.

**Architecture:** A Vite + TypeScript static frontend (two pages: public Browse, gated Admin) fetches a raw manifest — `{ files: DriveNode[], meta: MetaRow[] }` — from a Google Apps Script web app. The Drive-tree ⟕ metadata **join, filtering, and sorting happen client-side** (pure, unit-tested functions). The Apps Script backend is thin I/O: it walks the Drive folder (cached ~10 min), reads/writes the metadata Sheet, checks the admin password server-side, and auto-shares files so students can open them.

**Tech Stack:** Vite, TypeScript, Vitest + jsdom (tests), GitHub Actions (deploy to Pages), Google Apps Script (`.gs`), Google Sheets, DriveApp.

## Global Constraints

- **No Google API key or secret ships to the browser.** The only backend coordinate in frontend code is the public web-app URL. The admin password lives only in Apps Script Script Properties.
- **Custom metadata only.** The app never edits Drive's native fields. Drive is read-only for file content; the Sheet is the source of truth for metadata.
- **Join key is Drive `fileId`** everywhere (frontend and Sheet).
- **UI labels are French** (Niveau, Type, Matière, Chapitre). Arabic is out of scope for v1.
- **Metadata fields (fixed schema):** `level`, `type`, `subject`, `chapter`, `title`, `description`, `tags`, `order`.
- **POST requests use `Content-Type: text/plain;charset=utf-8`** to avoid CORS preflight against Apps Script.
- **Node 20+** for the frontend toolchain.
- **Vite `base` is `/drivo/`** (GitHub project-pages path; repo name is `drivo`).
- TDD, DRY, YAGNI, frequent commits.

---

### Task 1: Project scaffold, tooling, and CI

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`
- Create: `index.html`, `admin.html`, `src/main.ts`, `src/admin.ts`, `src/styles.css`
- Create: `src/smoke.test.ts`
- Create: `.github/workflows/deploy.yml`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working build (`npm run build`), a passing test run (`npm test`), and a Pages deploy workflow. Establishes the two HTML entry points `index.html` (browse) and `admin.html` (admin).

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "drivo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "jsdom": "^24.1.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/drivo/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

- [ ] **Step 4: Create the two HTML entry points and stub scripts/styles**

`index.html`:
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bibliothèque Physique</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`admin.html` (identical but title "Admin — Bibliothèque Physique", `src/admin.ts`):
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin — Bibliothèque Physique</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/admin.ts"></script>
  </body>
</html>
```

`src/main.ts`:
```ts
document.getElementById("app")!.textContent = "Browse (à venir)";
```

`src/admin.ts`:
```ts
document.getElementById("app")!.textContent = "Admin (à venir)";
```

`src/styles.css`:
```css
:root { font-family: system-ui, sans-serif; }
body { margin: 0; }
```

- [ ] **Step 5: Write the smoke test**

`src/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Install and verify build + test**

Run: `npm install && npm test && npm run build`
Expected: test suite passes (1 test); `dist/` is produced with `index.html` and `admin.html`.

- [ ] **Step 7: Create the Pages deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Note: `npm ci` requires a committed `package-lock.json` (created by `npm install` in Step 6). Include it in the commit.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+TS project with Vitest and Pages CI"
```

---

### Task 2: Types and manifest join (pure, TDD)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/manifest.ts`
- Test: `src/lib/manifest.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types `DriveNode`, `RawRow`, `MetaRow`, `LibraryItem` (see code).
  - `parseTags(s: string): string[]`
  - `normalizeMeta(raw: Partial<RawRow> & { fileId: string }): MetaRow`
  - `buildLibrary(nodes: DriveNode[], meta: (RawRow | MetaRow)[]): LibraryItem[]`

- [ ] **Step 1: Write the failing test**

`src/lib/manifest.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseTags, normalizeMeta, buildLibrary } from "./manifest";
import type { DriveNode } from "./types";

const node = (over: Partial<DriveNode> & { fileId: string }): DriveNode => ({
  name: "raw.pdf",
  mimeType: "application/pdf",
  path: [],
  webViewLink: "https://drive/x",
  modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false,
  ...over,
});

describe("parseTags", () => {
  it("splits, trims, drops empties", () => {
    expect(parseTags("a, b ,,c")).toEqual(["a", "b", "c"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("normalizeMeta", () => {
  it("fills defaults and parses tag string", () => {
    const m = normalizeMeta({ fileId: "1", tags: "x, y", order: "3" as unknown as number });
    expect(m.level).toBe("");
    expect(m.tags).toEqual(["x", "y"]);
    expect(m.order).toBe(3);
  });
});

describe("buildLibrary", () => {
  it("joins nodes to meta by fileId, skips folders, uses title fallback", () => {
    const nodes = [
      node({ fileId: "1", name: "raw.pdf" }),
      node({ fileId: "2", name: "folder", isFolder: true }),
    ];
    const meta = [{ fileId: "1", title: "Mécanique — Cours", tags: "newton", order: 2 }];
    const lib = buildLibrary(nodes, meta as any);
    expect(lib).toHaveLength(1);
    expect(lib[0].displayTitle).toBe("Mécanique — Cours");
    expect(lib[0].meta.tags).toEqual(["newton"]);
  });

  it("falls back to raw filename when no metadata title", () => {
    const lib = buildLibrary([node({ fileId: "9", name: "exam.pdf" })], []);
    expect(lib[0].displayTitle).toBe("exam.pdf");
    expect(lib[0].meta.level).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/manifest.test.ts`
Expected: FAIL — cannot resolve `./manifest` / `./types`.

- [ ] **Step 3: Write the implementation**

`src/lib/types.ts`:
```ts
export interface DriveNode {
  fileId: string;
  name: string;
  mimeType: string;
  path: string[];
  thumbnailLink?: string;
  webViewLink: string;
  modifiedTime: string;
  isFolder: boolean;
}

/** A row exactly as the Sheet/backend returns it (tags/order may be strings). */
export interface RawRow {
  fileId: string;
  level?: string;
  type?: string;
  subject?: string;
  chapter?: string;
  title?: string;
  description?: string;
  tags?: string;
  order?: number | string;
}

export interface MetaRow {
  fileId: string;
  level: string;
  type: string;
  subject: string;
  chapter: string;
  title: string;
  description: string;
  tags: string[];
  order: number;
}

export interface LibraryItem extends DriveNode {
  meta: MetaRow;
  displayTitle: string;
}
```

`src/lib/manifest.ts`:
```ts
import type { DriveNode, RawRow, MetaRow, LibraryItem } from "./types";

export function parseTags(s: string): string[] {
  return s ? s.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

export function normalizeMeta(raw: Partial<RawRow> & { fileId: string }): MetaRow {
  const rawTags = (raw as RawRow).tags;
  const order = Number(raw.order);
  return {
    fileId: raw.fileId,
    level: raw.level ?? "",
    type: raw.type ?? "",
    subject: raw.subject ?? "",
    chapter: raw.chapter ?? "",
    title: raw.title ?? "",
    description: raw.description ?? "",
    tags: Array.isArray(rawTags) ? rawTags : parseTags(rawTags ?? ""),
    order: Number.isFinite(order) ? order : 0,
  };
}

export function buildLibrary(
  nodes: DriveNode[],
  meta: (RawRow | MetaRow)[]
): LibraryItem[] {
  const byId = new Map<string, MetaRow>();
  for (const m of meta) byId.set(m.fileId, normalizeMeta(m as RawRow));
  return nodes
    .filter((n) => !n.isFolder)
    .map((n) => {
      const m = byId.get(n.fileId) ?? normalizeMeta({ fileId: n.fileId });
      return { ...n, meta: m, displayTitle: m.title || n.name };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/manifest.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/manifest.ts src/lib/manifest.test.ts
git commit -m "feat: manifest join and metadata normalization"
```

---

### Task 3: Filter, search, sort, group (pure, TDD)

**Files:**
- Create: `src/lib/filter.ts`
- Test: `src/lib/filter.test.ts`

**Interfaces:**
- Consumes: `LibraryItem` (Task 2).
- Produces:
  - `interface Filters { level?: string; type?: string; subject?: string; chapter?: string; search?: string }`
  - `applyFilters(items: LibraryItem[], f: Filters): LibraryItem[]`
  - `sortItems(items: LibraryItem[]): LibraryItem[]`
  - `distinctValues(items: LibraryItem[], key: "level"|"type"|"subject"|"chapter"): string[]`

- [ ] **Step 1: Write the failing test**

`src/lib/filter.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { applyFilters, sortItems, distinctValues } from "./filter";
import type { LibraryItem } from "./types";

const item = (over: Partial<LibraryItem["meta"]> & { fileId: string }, title = "t"): LibraryItem => ({
  fileId: over.fileId,
  name: title,
  mimeType: "application/pdf",
  path: [],
  webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false,
  displayTitle: title,
  meta: {
    fileId: over.fileId, level: over.level ?? "", type: over.type ?? "",
    subject: over.subject ?? "", chapter: over.chapter ?? "", title: over.title ?? "",
    description: "", tags: over.tags ?? [], order: over.order ?? 0,
  },
});

describe("applyFilters", () => {
  const items = [
    item({ fileId: "1", level: "2 Bac SM", type: "Cours" }, "Mécanique"),
    item({ fileId: "2", level: "2 Bac SM", type: "Exercices", tags: ["newton"] }, "TD1"),
    item({ fileId: "3", level: "1 Bac", type: "Cours" }, "Optique"),
  ];
  it("filters by a single field", () => {
    expect(applyFilters(items, { type: "Cours" }).map((i) => i.fileId)).toEqual(["1", "3"]);
  });
  it("combines filters (AND)", () => {
    expect(applyFilters(items, { level: "2 Bac SM", type: "Cours" }).map((i) => i.fileId)).toEqual(["1"]);
  });
  it("searches title and tags, case-insensitive", () => {
    expect(applyFilters(items, { search: "newton" }).map((i) => i.fileId)).toEqual(["2"]);
    expect(applyFilters(items, { search: "méca" }).map((i) => i.fileId)).toEqual(["1"]);
  });
  it("returns all when filters empty", () => {
    expect(applyFilters(items, {})).toHaveLength(3);
  });
});

describe("sortItems", () => {
  it("sorts by order then title (fr locale)", () => {
    const items = [
      item({ fileId: "a", order: 2 }, "Zebra"),
      item({ fileId: "b", order: 1 }, "Bravo"),
      item({ fileId: "c", order: 1 }, "Alpha"),
    ];
    expect(sortItems(items).map((i) => i.fileId)).toEqual(["c", "b", "a"]);
  });
});

describe("distinctValues", () => {
  it("returns sorted unique non-empty values", () => {
    const items = [
      item({ fileId: "1", level: "2 Bac SM" }),
      item({ fileId: "2", level: "1 Bac" }),
      item({ fileId: "3", level: "" }),
      item({ fileId: "4", level: "2 Bac SM" }),
    ];
    expect(distinctValues(items, "level")).toEqual(["1 Bac", "2 Bac SM"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: FAIL — cannot resolve `./filter`.

- [ ] **Step 3: Write the implementation**

`src/lib/filter.ts`:
```ts
import type { LibraryItem } from "./types";

export interface Filters {
  level?: string;
  type?: string;
  subject?: string;
  chapter?: string;
  search?: string;
}

export function applyFilters(items: LibraryItem[], f: Filters): LibraryItem[] {
  const q = (f.search ?? "").trim().toLowerCase();
  return items.filter((it) => {
    if (f.level && it.meta.level !== f.level) return false;
    if (f.type && it.meta.type !== f.type) return false;
    if (f.subject && it.meta.subject !== f.subject) return false;
    if (f.chapter && it.meta.chapter !== f.chapter) return false;
    if (q) {
      const hay = (it.displayTitle + " " + it.meta.tags.join(" ")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortItems(items: LibraryItem[]): LibraryItem[] {
  return [...items].sort(
    (a, b) =>
      a.meta.order - b.meta.order ||
      a.displayTitle.localeCompare(b.displayTitle, "fr")
  );
}

export function distinctValues(
  items: LibraryItem[],
  key: "level" | "type" | "subject" | "chapter"
): string[] {
  const set = new Set<string>();
  for (const it of items) if (it.meta[key]) set.add(it.meta[key]);
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter.ts src/lib/filter.test.ts
git commit -m "feat: filter, search, sort, distinct-values helpers"
```

---

### Task 4: Config and API data layer (TDD with mocked fetch)

**Files:**
- Create: `src/config.ts`
- Create: `src/lib/cache.ts`
- Create: `src/api.ts`
- Test: `src/api.test.ts`
- Test: `src/lib/cache.test.ts`

**Interfaces:**
- Consumes: `DriveNode`, `RawRow` (Task 2).
- Produces:
  - `config.ts`: `export const BACKEND_URL: string` and enum lists `LEVELS`, `TYPES`, `SUBJECTS` (string[]) plus `AUTO_SHARE_NOTE`.
  - `cache.ts`: `saveManifestCache(m: RawManifest): void`, `loadManifestCache(): RawManifest | null`.
  - `api.ts`: `interface RawManifest { files: DriveNode[]; meta: RawRow[] }`; `interface SaveInput { fileId: string; level: string; type: string; subject: string; chapter: string; title: string; description: string; tags: string; order: number }`; `fetchManifest(): Promise<RawManifest>`; `saveMeta(password: string, rows: SaveInput[]): Promise<{ ok: boolean; error?: string }>`; `reindex(password: string): Promise<{ ok: boolean; error?: string; count?: number }>`.

- [ ] **Step 1: Write config (no test needed — constants)**

`src/config.ts`:
```ts
// Public web-app URL of the Apps Script backend. NOT a secret.
// Replaced with the real deployment URL in Task 8's final step.
export const BACKEND_URL = "__BACKEND_URL__";

export const LEVELS = [
  "Tronc Commun",
  "1ère Bac",
  "2ème Bac SM",
  "2ème Bac PC",
  "2ème Bac SVT",
];
export const TYPES = ["Cours", "Exercices", "Examen", "TP", "Résumé"];
export const SUBJECTS = ["Physique", "Chimie"];
```

- [ ] **Step 2: Write the failing cache test**

`src/lib/cache.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { saveManifestCache, loadManifestCache } from "./cache";

describe("manifest cache", () => {
  beforeEach(() => localStorage.clear());
  it("returns null when empty", () => {
    expect(loadManifestCache()).toBeNull();
  });
  it("round-trips a manifest", () => {
    const m = { files: [], meta: [{ fileId: "1", title: "x" }] };
    saveManifestCache(m as any);
    expect(loadManifestCache()).toEqual(m);
  });
  it("returns null on corrupt data", () => {
    localStorage.setItem("drivo:manifest", "{not json");
    expect(loadManifestCache()).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/cache.test.ts`
Expected: FAIL — cannot resolve `./cache`.

- [ ] **Step 4: Implement cache**

`src/lib/cache.ts`:
```ts
import type { DriveNode, RawRow } from "./types";

export interface RawManifest {
  files: DriveNode[];
  meta: RawRow[];
}

const KEY = "drivo:manifest";

export function saveManifestCache(m: RawManifest): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* quota or unavailable — ignore */
  }
}

export function loadManifestCache(): RawManifest | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RawManifest;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/lib/cache.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing API test**

`src/api.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchManifest, saveMeta } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("fetchManifest", () => {
  it("GETs the backend and returns parsed JSON", async () => {
    const payload = { files: [], meta: [] };
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 })
    );
    const m = await fetchManifest();
    expect(m).toEqual(payload);
    expect(spy).toHaveBeenCalledOnce();
  });
  it("throws on non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    await expect(fetchManifest()).rejects.toThrow();
  });
});

describe("saveMeta", () => {
  it("POSTs text/plain body with password + rows", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const res = await saveMeta("secret", [
      { fileId: "1", level: "", type: "Cours", subject: "", chapter: "", title: "T", description: "", tags: "a,b", order: 0 },
    ]);
    expect(res.ok).toBe(true);
    const [, init] = spy.mock.calls[0];
    expect(init!.method).toBe("POST");
    expect((init!.headers as Record<string, string>)["Content-Type"]).toContain("text/plain");
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({ action: "save", password: "secret" });
    expect(body.rows[0].fileId).toBe("1");
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npx vitest run src/api.test.ts`
Expected: FAIL — cannot resolve `./api`.

- [ ] **Step 8: Implement API**

`src/api.ts`:
```ts
import { BACKEND_URL } from "./config";
import type { RawManifest } from "./lib/cache";

export type { RawManifest };

export interface SaveInput {
  fileId: string;
  level: string;
  type: string;
  subject: string;
  chapter: string;
  title: string;
  description: string;
  tags: string; // comma-separated for the Sheet
  order: number;
}

export async function fetchManifest(): Promise<RawManifest> {
  const res = await fetch(BACKEND_URL, { method: "GET" });
  if (!res.ok) throw new Error(`GET manifest failed: ${res.status}`);
  return (await res.json()) as RawManifest;
}

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    redirect: "follow",
  });
  return (await res.json()) as T;
}

export function saveMeta(
  password: string,
  rows: SaveInput[]
): Promise<{ ok: boolean; error?: string }> {
  return post({ action: "save", password, rows });
}

export function reindex(
  password: string
): Promise<{ ok: boolean; error?: string; count?: number }> {
  return post({ action: "reindex", password });
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `npx vitest run src/api.test.ts src/lib/cache.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/config.ts src/lib/cache.ts src/api.ts src/api.test.ts src/lib/cache.test.ts
git commit -m "feat: config, localStorage manifest cache, and backend API client"
```

---

### Task 5: Browse view — components and page wiring

**Files:**
- Create: `src/components/browse.ts`
- Create: `src/lib/loadLibrary.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Test: `src/components/browse.test.ts`
- Test: `src/lib/loadLibrary.test.ts`

**Interfaces:**
- Consumes: `buildLibrary` (T2), `applyFilters`/`sortItems`/`distinctValues`/`Filters` (T3), `fetchManifest` (T4), `saveManifestCache`/`loadManifestCache` (T4).
- Produces:
  - `loadLibrary.ts`: `loadLibrary(): Promise<{ items: LibraryItem[]; stale: boolean }>` — fetches manifest, caches it, and on network failure falls back to the cached manifest with `stale: true`; throws only if there is no cache at all.
  - `browse.ts`: `renderBrowse(root: HTMLElement, items: LibraryItem[], stale: boolean): void` — renders filter bar + grid and wires interactivity internally.

- [ ] **Step 1: Write the failing loadLibrary test**

`src/lib/loadLibrary.test.ts`:
```ts
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { loadLibrary } from "./loadLibrary";
import * as api from "../api";

const manifest = {
  files: [
    { fileId: "1", name: "a.pdf", mimeType: "application/pdf", path: [], webViewLink: "u", modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false },
  ],
  meta: [{ fileId: "1", title: "Cours 1" }],
};

afterEach(() => vi.restoreAllMocks());
beforeEach(() => localStorage.clear());

describe("loadLibrary", () => {
  it("returns fresh items and caches them", async () => {
    vi.spyOn(api, "fetchManifest").mockResolvedValue(manifest as any);
    const { items, stale } = await loadLibrary();
    expect(stale).toBe(false);
    expect(items[0].displayTitle).toBe("Cours 1");
    expect(localStorage.getItem("drivo:manifest")).not.toBeNull();
  });

  it("falls back to cache and marks stale on fetch failure", async () => {
    localStorage.setItem("drivo:manifest", JSON.stringify(manifest));
    vi.spyOn(api, "fetchManifest").mockRejectedValue(new Error("offline"));
    const { items, stale } = await loadLibrary();
    expect(stale).toBe(true);
    expect(items[0].displayTitle).toBe("Cours 1");
  });

  it("rethrows when fetch fails and no cache exists", async () => {
    vi.spyOn(api, "fetchManifest").mockRejectedValue(new Error("offline"));
    await expect(loadLibrary()).rejects.toThrow("offline");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/loadLibrary.test.ts`
Expected: FAIL — cannot resolve `./loadLibrary`.

- [ ] **Step 3: Implement loadLibrary**

`src/lib/loadLibrary.ts`:
```ts
import { fetchManifest } from "../api";
import { saveManifestCache, loadManifestCache } from "./cache";
import { buildLibrary } from "./manifest";
import type { LibraryItem } from "./types";

export async function loadLibrary(): Promise<{ items: LibraryItem[]; stale: boolean }> {
  try {
    const m = await fetchManifest();
    saveManifestCache(m);
    return { items: buildLibrary(m.files, m.meta), stale: false };
  } catch (err) {
    const cached = loadManifestCache();
    if (cached) return { items: buildLibrary(cached.files, cached.meta), stale: true };
    throw err;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/loadLibrary.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing browse-component test**

`src/components/browse.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderBrowse } from "./browse";
import type { LibraryItem } from "../lib/types";

const mk = (fileId: string, over: Partial<LibraryItem["meta"]>, title: string): LibraryItem => ({
  fileId, name: title, mimeType: "application/pdf", path: [], webViewLink: "https://drive/" + fileId,
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: { fileId, level: over.level ?? "", type: over.type ?? "", subject: "", chapter: "", title: over.title ?? "", description: "", tags: over.tags ?? [], order: over.order ?? 0 },
});

const items = [
  mk("1", { level: "2ème Bac SM", type: "Cours" }, "Mécanique"),
  mk("2", { level: "2ème Bac SM", type: "Exercices", tags: ["newton"] }, "TD1"),
];

describe("renderBrowse", () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement("div"); document.body.appendChild(root); });

  it("renders one card per item with an open link", () => {
    renderBrowse(root, items, false);
    const cards = root.querySelectorAll("[data-card]");
    expect(cards).toHaveLength(2);
    const link = cards[0].querySelector("a") as HTMLAnchorElement;
    expect(link.href).toContain("https://drive/1");
    expect(link.target).toBe("_blank");
  });

  it("filters by the type select", () => {
    renderBrowse(root, items, false);
    const typeSel = root.querySelector('select[data-filter="type"]') as HTMLSelectElement;
    typeSel.value = "Exercices";
    typeSel.dispatchEvent(new Event("change"));
    const cards = root.querySelectorAll("[data-card]");
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("TD1");
  });

  it("filters by the search box (title + tags)", () => {
    renderBrowse(root, items, false);
    const search = root.querySelector('input[data-filter="search"]') as HTMLInputElement;
    search.value = "newton";
    search.dispatchEvent(new Event("input"));
    expect(root.querySelectorAll("[data-card]")).toHaveLength(1);
  });

  it("shows a stale banner when stale is true", () => {
    renderBrowse(root, items, true);
    expect(root.querySelector("[data-stale]")).not.toBeNull();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/components/browse.test.ts`
Expected: FAIL — cannot resolve `./browse`.

- [ ] **Step 7: Implement the browse component**

`src/components/browse.ts`:
```ts
import { applyFilters, sortItems, distinctValues, type Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function selectFilter(key: keyof Filters, label: string, values: string[]): HTMLElement {
  const wrap = el("label", { class: "filter" });
  wrap.appendChild(el("span", {}, label));
  const sel = el("select", { "data-filter": key }) as HTMLSelectElement;
  sel.appendChild(new Option("Tous", ""));
  for (const v of values) sel.appendChild(new Option(v, v));
  wrap.appendChild(sel);
  return wrap;
}

function card(it: LibraryItem): HTMLElement {
  const c = el("article", { "data-card": "", class: "card" });
  if (it.meta.type) c.appendChild(el("span", { class: "badge" }, it.meta.type));
  c.appendChild(el("h3", {}, it.displayTitle));
  const sub = [it.meta.level, it.meta.chapter].filter(Boolean).join(" · ");
  if (sub) c.appendChild(el("p", { class: "sub" }, sub));
  if (it.meta.description) c.appendChild(el("p", { class: "desc" }, it.meta.description));
  const a = el("a", { href: it.webViewLink, target: "_blank", rel: "noopener", class: "open" }, "Ouvrir");
  c.appendChild(a);
  return c;
}

export function renderBrowse(root: HTMLElement, items: LibraryItem[], stale: boolean): void {
  root.innerHTML = "";
  if (stale) root.appendChild(el("div", { "data-stale": "", class: "banner" }, "Hors ligne — données en cache."));

  const state: Filters = {};
  const bar = el("div", { class: "filterbar" });
  bar.appendChild(selectFilter("level", "Niveau", distinctValues(items, "level")));
  bar.appendChild(selectFilter("type", "Type", distinctValues(items, "type")));
  bar.appendChild(selectFilter("subject", "Matière", distinctValues(items, "subject")));
  bar.appendChild(selectFilter("chapter", "Chapitre", distinctValues(items, "chapter")));
  const searchWrap = el("label", { class: "filter" });
  searchWrap.appendChild(el("span", {}, "Recherche"));
  const search = el("input", { type: "search", "data-filter": "search", placeholder: "titre ou tag…" });
  searchWrap.appendChild(search);
  bar.appendChild(searchWrap);
  root.appendChild(bar);

  const grid = el("div", { class: "grid" });
  root.appendChild(grid);

  const rerender = () => {
    grid.innerHTML = "";
    const shown = sortItems(applyFilters(items, state));
    if (shown.length === 0) grid.appendChild(el("p", { class: "empty" }, "Aucun résultat."));
    for (const it of shown) grid.appendChild(card(it));
  };

  bar.querySelectorAll("select[data-filter]").forEach((s) =>
    s.addEventListener("change", (e) => {
      const t = e.target as HTMLSelectElement;
      (state as Record<string, string>)[t.dataset.filter!] = t.value;
      rerender();
    })
  );
  search.addEventListener("input", (e) => {
    state.search = (e.target as HTMLInputElement).value;
    rerender();
  });

  rerender();
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/components/browse.test.ts`
Expected: PASS.

- [ ] **Step 9: Wire the browse page and add styles**

`src/main.ts`:
```ts
import { loadLibrary } from "./lib/loadLibrary";
import { renderBrowse } from "./components/browse";

const root = document.getElementById("app")!;
root.textContent = "Chargement…";

loadLibrary()
  .then(({ items, stale }) => renderBrowse(root, items, stale))
  .catch(() => {
    root.textContent = "Impossible de charger la bibliothèque. Réessayez plus tard.";
  });
```

Append to `src/styles.css`:
```css
.filterbar { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1rem; align-items: end; }
.filter { display: flex; flex-direction: column; font-size: 0.8rem; gap: 0.25rem; }
.filter select, .filter input { padding: 0.4rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; padding: 1rem; }
.card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
.badge { align-self: start; background: #2563eb; color: #fff; border-radius: 999px; padding: 0.1rem 0.6rem; font-size: 0.7rem; }
.card h3 { margin: 0; font-size: 1rem; }
.sub { color: #555; font-size: 0.8rem; margin: 0; }
.desc { font-size: 0.85rem; margin: 0; }
.open { margin-top: auto; text-decoration: none; color: #2563eb; font-weight: 600; }
.banner { background: #fef3c7; padding: 0.6rem 1rem; }
.empty { color: #777; padding: 1rem; }
```

- [ ] **Step 10: Verify build + full test run**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/components/browse.ts src/components/browse.test.ts src/lib/loadLibrary.ts src/lib/loadLibrary.test.ts src/main.ts src/styles.css
git commit -m "feat: public browse view with filters, search, and stale fallback"
```

---

### Task 6: Admin view — password gate and metadata editor

**Files:**
- Create: `src/components/admin.ts`
- Modify: `src/admin.ts`
- Modify: `src/styles.css`
- Test: `src/components/admin.test.ts`

**Interfaces:**
- Consumes: `loadLibrary` (T5), `saveMeta`/`reindex`/`SaveInput` (T4), `LEVELS`/`TYPES`/`SUBJECTS` (T4 config), `LibraryItem` (T2).
- Produces:
  - `admin.ts` component: `renderAdmin(root: HTMLElement, deps?: AdminDeps): void` where `AdminDeps` allows injecting `load`, `save`, `reindex` for testing (defaults to the real functions).
  - `toSaveInput(item: LibraryItem): SaveInput` — serializes a library item's editable metadata back to a `SaveInput` (tags joined with commas).

- [ ] **Step 1: Write the failing test**

`src/components/admin.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderAdmin, toSaveInput } from "./admin";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: "", type: "", subject: "", chapter: "", title: "", description: "", tags: ["a", "b"], order: 0 },
};

describe("toSaveInput", () => {
  it("joins tags with commas", () => {
    expect(toSaveInput(item).tags).toBe("a,b");
  });
});

describe("renderAdmin", () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement("div"); document.body.appendChild(root); });

  it("shows the password gate first, no editor", async () => {
    renderAdmin(root, { load: vi.fn(), save: vi.fn(), reindex: vi.fn() });
    expect(root.querySelector('[data-gate]')).not.toBeNull();
    expect(root.querySelector('[data-editor]')).toBeNull();
  });

  it("loads items after unlocking and renders a row per file", async () => {
    const load = vi.fn().mockResolvedValue({ items: [item], stale: false });
    renderAdmin(root, { load, save: vi.fn(), reindex: vi.fn() });
    (root.querySelector('[data-pw]') as HTMLInputElement).value = "secret";
    (root.querySelector('[data-unlock]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector('[data-editor]')).not.toBeNull());
    expect(root.querySelectorAll('[data-row]')).toHaveLength(1);
  });

  it("calls save with the entered password and edited rows", async () => {
    const load = vi.fn().mockResolvedValue({ items: [item], stale: false });
    const save = vi.fn().mockResolvedValue({ ok: true });
    renderAdmin(root, { load, save, reindex: vi.fn() });
    (root.querySelector('[data-pw]') as HTMLInputElement).value = "secret";
    (root.querySelector('[data-unlock]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector('[data-editor]')).not.toBeNull());
    (root.querySelector('[data-field="title"]') as HTMLInputElement).value = "Nouveau titre";
    (root.querySelector('[data-save]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(save).toHaveBeenCalled());
    const [pw, rows] = save.mock.calls[0];
    expect(pw).toBe("secret");
    expect(rows[0].title).toBe("Nouveau titre");
  });

  it("shows an error and stays gated when load rejects (bad password)", async () => {
    const load = vi.fn().mockRejectedValue(new Error("unauthorized"));
    renderAdmin(root, { load, save: vi.fn(), reindex: vi.fn() });
    (root.querySelector('[data-pw]') as HTMLInputElement).value = "wrong";
    (root.querySelector('[data-unlock]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector('[data-error]')).not.toBeNull());
    expect(root.querySelector('[data-editor]')).toBeNull();
  });
});
```

Note the injected `load` here is a gate-aware loader: `renderAdmin` wraps the real `loadLibrary`/`saveMeta` so that unlocking validates the password by attempting a no-op save (or `reindex`) — see Step 3. The test's `load` mock stands in for that wrapped loader.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/admin.test.ts`
Expected: FAIL — cannot resolve `./admin`.

- [ ] **Step 3: Implement the admin component**

`src/components/admin.ts`:
```ts
import { loadLibrary } from "../lib/loadLibrary";
import { saveMeta, reindex as reindexApi, type SaveInput } from "../api";
import { LEVELS, TYPES, SUBJECTS } from "../config";
import type { LibraryItem } from "../lib/types";

export function toSaveInput(it: LibraryItem): SaveInput {
  const m = it.meta;
  return {
    fileId: m.fileId, level: m.level, type: m.type, subject: m.subject,
    chapter: m.chapter, title: m.title, description: m.description,
    tags: m.tags.join(","), order: m.order,
  };
}

export interface AdminDeps {
  load: () => Promise<{ items: LibraryItem[]; stale: boolean }>;
  save: (password: string, rows: SaveInput[]) => Promise<{ ok: boolean; error?: string }>;
  reindex: (password: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
}

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function select(field: keyof SaveInput, value: string, options: string[]): HTMLSelectElement {
  const sel = el("select", { "data-field": field }) as HTMLSelectElement;
  sel.appendChild(new Option("—", ""));
  for (const o of options) sel.appendChild(new Option(o, o));
  sel.value = value;
  return sel;
}

function input(field: keyof SaveInput, value: string, placeholder: string): HTMLInputElement {
  const i = el("input", { "data-field": field, placeholder }) as HTMLInputElement;
  i.value = value;
  return i;
}

function row(it: LibraryItem): { node: HTMLElement; read: () => SaveInput } {
  const r = el("div", { "data-row": "", class: "arow" });
  r.appendChild(el("div", { class: "arow-name" }, it.name));
  const title = input("title", it.meta.title, it.name);
  const level = select("level", it.meta.level, LEVELS);
  const type = select("type", it.meta.type, TYPES);
  const subject = select("subject", it.meta.subject, SUBJECTS);
  const chapter = input("chapter", it.meta.chapter, "Chapitre");
  const tags = input("tags", it.meta.tags.join(","), "tags,séparés,virgule");
  const desc = input("description", it.meta.description, "Description");
  const order = input("order", String(it.meta.order), "0");
  for (const f of [title, level, type, subject, chapter, tags, desc, order]) r.appendChild(f);
  const read = (): SaveInput => ({
    fileId: it.fileId, title: title.value, level: level.value, type: type.value,
    subject: subject.value, chapter: chapter.value, tags: tags.value,
    description: desc.value, order: Number(order.value) || 0,
  });
  return { node: r, read };
}

export function renderAdmin(root: HTMLElement, deps?: Partial<AdminDeps>): void {
  const d: AdminDeps = {
    load: deps?.load ?? loadLibrary,
    save: deps?.save ?? saveMeta,
    reindex: deps?.reindex ?? reindexApi,
  };
  root.innerHTML = "";
  const gate = el("div", { "data-gate": "", class: "gate" });
  const pw = el("input", { "data-pw": "", type: "password", placeholder: "Mot de passe" }) as HTMLInputElement;
  const unlock = el("button", { "data-unlock": "" }, "Déverrouiller");
  const msg = el("div", { class: "gate-msg" });
  gate.append(pw, unlock, msg);
  root.appendChild(gate);

  unlock.addEventListener("click", async () => {
    msg.textContent = "Chargement…";
    // Validate the password with a no-op save (empty rows) before showing the editor.
    const auth = await d.save(pw.value, []);
    if (!auth.ok) {
      msg.innerHTML = "";
      msg.appendChild(el("span", { "data-error": "" }, auth.error === "unauthorized" ? "Mot de passe incorrect." : (auth.error ?? "Erreur.")));
      return;
    }
    let loaded;
    try {
      loaded = await d.load();
    } catch (e) {
      msg.innerHTML = "";
      msg.appendChild(el("span", { "data-error": "" }, "Échec du chargement."));
      return;
    }
    renderEditor(root, d, pw.value, loaded.items);
  });
}

function renderEditor(root: HTMLElement, d: AdminDeps, password: string, items: LibraryItem[]): void {
  root.innerHTML = "";
  const editor = el("div", { "data-editor": "", class: "editor" });
  const toolbar = el("div", { class: "toolbar" });
  const saveBtn = el("button", { "data-save": "" }, "Enregistrer");
  const reindexBtn = el("button", { "data-reindex": "" }, "Réindexer Drive");
  const status = el("span", { class: "status" });
  toolbar.append(saveBtn, reindexBtn, status);
  editor.appendChild(toolbar);

  const rows = items.map((it) => {
    const r = row(it);
    editor.appendChild(r.node);
    return r;
  });
  root.appendChild(editor);

  saveBtn.addEventListener("click", async () => {
    status.textContent = "Enregistrement…";
    const res = await d.save(password, rows.map((r) => r.read()));
    status.textContent = res.ok ? "Enregistré ✓" : `Erreur : ${res.error ?? "inconnue"}`;
  });
  reindexBtn.addEventListener("click", async () => {
    status.textContent = "Réindexation…";
    const res = await d.reindex(password);
    status.textContent = res.ok ? `Réindexé (${res.count ?? "?"} fichiers) ✓` : `Erreur : ${res.error ?? "inconnue"}`;
  });
}
```

Note: the test injects `load` directly and expects unlocking to reach the editor. Because the real `renderAdmin` also calls `save(pw, [])` to validate, the admin tests inject `save` returning `{ ok: true }` (they do). The "bad password" test injects `load` rejecting; to make that path fire, also have its `save` mock resolve `{ ok: true }` so control reaches `load`. Update that test's deps accordingly if needed: `{ load, save: vi.fn().mockResolvedValue({ ok: true }), reindex: vi.fn() }`.

- [ ] **Step 4: Adjust the "bad password" test to reach the load path**

In `src/components/admin.test.ts`, the last test's deps become:
```ts
renderAdmin(root, { load, save: vi.fn().mockResolvedValue({ ok: true }), reindex: vi.fn() });
```
(Password validation succeeds; the failure under test is the subsequent load.) Add a second test for a genuinely rejected password:
```ts
it("stays gated when the password is rejected", async () => {
  const save = vi.fn().mockResolvedValue({ ok: false, error: "unauthorized" });
  renderAdmin(root, { load: vi.fn(), save, reindex: vi.fn() });
  (root.querySelector('[data-pw]') as HTMLInputElement).value = "wrong";
  (root.querySelector('[data-unlock]') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(root.querySelector('[data-error]')).not.toBeNull());
  expect(root.querySelector('[data-editor]')).toBeNull();
});
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/components/admin.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Wire the admin page and add styles**

`src/admin.ts`:
```ts
import { renderAdmin } from "./components/admin";
renderAdmin(document.getElementById("app")!);
```

Append to `src/styles.css`:
```css
.gate { display: flex; gap: 0.5rem; padding: 2rem; align-items: center; }
.gate-msg { color: #b91c1c; }
.toolbar { display: flex; gap: 0.5rem; padding: 1rem; align-items: center; position: sticky; top: 0; background: #fff; border-bottom: 1px solid #eee; }
.status { color: #555; }
.arow { display: grid; grid-template-columns: 160px 1.5fr 1fr 1fr 1fr 1fr 1.5fr 60px; gap: 0.4rem; padding: 0.4rem 1rem; align-items: center; }
.arow input, .arow select { padding: 0.3rem; min-width: 0; }
.arow-name { font-size: 0.75rem; color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

- [ ] **Step 7: Verify build + full test run**

Run: `npm test && npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin.ts src/components/admin.test.ts src/admin.ts src/styles.css
git commit -m "feat: password-gated admin metadata editor with reindex"
```

---

### Task 7: Google Apps Script backend

**Files:**
- Create: `apps-script/appsscript.json`
- Create: `apps-script/MetadataStore.gs`
- Create: `apps-script/DriveIndex.gs`
- Create: `apps-script/Code.gs`
- Create: `apps-script/README.md`

**Interfaces:**
- Consumes: nothing in the JS project (deployed separately to Apps Script).
- Produces: a deployed web app whose `GET` returns `{ files: DriveNode[], meta: RawRow[] }` and whose `POST` (JSON body `{ action, password, rows? }`, sent as `text/plain`) returns `{ ok, error?, count? }`. This is the contract Task 4's `api.ts` already targets.

**Testing note:** Apps Script has no local unit-test runtime here; correctness is verified by the manual checklist in Step 6 (the spec, §13, explicitly accepts this and keeps backend logic thin). The pure client-side join/filter logic is already unit-tested in Tasks 2–3.

- [ ] **Step 1: Create the Apps Script manifest**

`apps-script/appsscript.json`:
```json
{
  "timeZone": "Africa/Casablanca",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets.currentonly"
  ],
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

- [ ] **Step 2: Create the metadata store**

`apps-script/MetadataStore.gs`:
```javascript
var META_HEADERS = ['fileId', 'level', 'type', 'subject', 'chapter', 'title', 'description', 'tags', 'order'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('metadata');
  if (!sh) {
    sh = ss.insertSheet('metadata');
    sh.appendRow(META_HEADERS);
  }
  return sh;
}

function readMeta() {
  var values = getSheet_().getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][0]) continue; // skip rows without a fileId
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[i][c];
    obj.order = Number(obj.order) || 0;
    rows.push(obj);
  }
  return rows;
}

function writeMeta(rows) {
  if (!rows || !rows.length) return;
  var sh = getSheet_();
  var values = sh.getDataRange().getValues();
  var indexByFileId = {}; // fileId -> 1-based row number
  for (var i = 1; i < values.length; i++) indexByFileId[values[i][0]] = i + 1;
  rows.forEach(function (r) {
    var arr = META_HEADERS.map(function (h) { return r[h] != null ? r[h] : ''; });
    if (indexByFileId[r.fileId]) {
      sh.getRange(indexByFileId[r.fileId], 1, 1, META_HEADERS.length).setValues([arr]);
    } else {
      sh.appendRow(arr);
      indexByFileId[r.fileId] = sh.getLastRow();
    }
  });
}
```

- [ ] **Step 3: Create the Drive indexer**

`apps-script/DriveIndex.gs`:
```javascript
function walkFolder(rootId, autoShare) {
  var nodes = [];
  walk_(DriveApp.getFolderById(rootId), [], nodes, autoShare);
  return nodes;
}

function walk_(folder, path, nodes, autoShare) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (autoShare) ensureShared_(f);
    nodes.push({
      fileId: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      path: path,
      thumbnailLink: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w400',
      webViewLink: f.getUrl(),
      modifiedTime: f.getLastUpdated().toISOString(),
      isFolder: false
    });
  }
  var subs = folder.getFolders();
  while (subs.hasNext()) {
    var sf = subs.next();
    walk_(sf, path.concat([sf.getName()]), nodes, autoShare);
  }
}

function ensureShared_(f) {
  try {
    if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  } catch (e) {
    // Some files (e.g. in a shared drive without permission) can't be reshared; keep indexing.
  }
}
```

- [ ] **Step 4: Create the API entry points**

`apps-script/Code.gs`:
```javascript
var CACHE_KEY = 'manifest_v1';
var CACHE_TTL_SECONDS = 600; // 10 minutes

function doGet() {
  return json_(getManifestCached_());
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_json' });
  }
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!expected || body.password !== expected) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  if (body.action === 'save') {
    writeMeta(body.rows || []);
    CacheService.getScriptCache().remove(CACHE_KEY);
    return json_({ ok: true });
  }
  if (body.action === 'reindex') {
    var fresh = buildManifest_();
    putCache_(fresh);
    return json_({ ok: true, count: fresh.files.length });
  }
  return json_({ ok: false, error: 'unknown_action' });
}

function getManifestCached_() {
  var cached = CacheService.getScriptCache().get(CACHE_KEY);
  if (cached) return JSON.parse(cached);
  var fresh = buildManifest_();
  putCache_(fresh);
  return fresh;
}

function putCache_(payload) {
  try {
    CacheService.getScriptCache().put(CACHE_KEY, JSON.stringify(payload), CACHE_TTL_SECONDS);
  } catch (e) {
    // Payload can exceed the 100 KB cache limit for very large folders; skip caching then.
  }
}

function buildManifest_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  var autoShare = props.getProperty('AUTO_SHARE') !== 'false'; // default on
  return { files: walkFolder(folderId, autoShare), meta: readMeta() };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

- [ ] **Step 5: Write the deployment README**

`apps-script/README.md`:
```markdown
# Backend — Google Apps Script

## One-time setup
1. Create a new Google Sheet (this becomes the metadata store).
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the default `Code.gs`. Create files matching this folder: `Code.gs`,
   `DriveIndex.gs`, `MetadataStore.gs`, and paste each file's contents.
4. **Project Settings → Show `appsscript.json`**, then paste `appsscript.json` here.
5. **Project Settings → Script Properties**, add:
   - `FOLDER_ID` — the Drive folder id (from its URL).
   - `ADMIN_PASSWORD` — the admin password.
   - `AUTO_SHARE` — `true` (default) to auto-share files as anyone-with-link
     viewer, or `false` to manage sharing manually.
6. **Deploy → New deployment → Web app**:
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Deploy, authorize the scopes, and copy the **Web app URL**.

## Wire the frontend
Put the Web app URL into `src/config.ts` (`BACKEND_URL`). See the repo's
top-level plan, Task 8.

## Refresh
- The file list is cached ~10 minutes. Use the admin **"Réindexer Drive"** button
  to force an immediate refresh after adding files.

## Scale note
For libraries of many thousands of files, a full reindex may approach the 6-minute
execution limit. If that happens, reindex in batches (process N files per call and
continue on a follow-up trigger). Not needed at course-library scale.
```

- [ ] **Step 6: Manual verification checklist (perform against a real deployment)**

Run through and confirm each:
1. Put 2–3 test files (in nested subfolders) into the Drive folder.
2. Open the Web app URL in a browser → returns JSON with a `files` array containing your files (each with `webViewLink`), and `meta: []`.
3. Confirm each test file is now shared "anyone with link — viewer" in Drive (with `AUTO_SHARE=true`).
4. `POST` with a wrong password (e.g. via the admin UI in a later step, or `curl`) → `{ ok: false, error: "unauthorized" }`.
5. `POST` a `save` with the correct password → the Sheet's `metadata` tab gains/updates a row; response `{ ok: true }`.
6. `POST` a `reindex` with the correct password → `{ ok: true, count: <n> }`.

`curl` example for step 4/5 (replace URL + password):
```bash
curl -sL -X POST "$WEBAPP_URL" -H 'Content-Type: text/plain' \
  --data '{"action":"save","password":"WRONG","rows":[]}'
```

- [ ] **Step 7: Commit**

```bash
git add apps-script/
git commit -m "feat: Apps Script backend (Drive walk, Sheet store, cached manifest)"
```

---

### Task 8: End-to-end wiring, deploy, and verification

**Files:**
- Modify: `src/config.ts` (real `BACKEND_URL`)
- Create: `README.md` (repo root)

**Interfaces:**
- Consumes: everything above.
- Produces: a live site on GitHub Pages talking to the deployed backend.

- [ ] **Step 1: Set the real backend URL**

Replace `BACKEND_URL` in `src/config.ts` with the Web app URL from Task 7.
(If you prefer not to commit the URL, read it from a build-time env var instead —
but it is not a secret, so committing is fine.)

- [ ] **Step 2: Write the repo README**

`README.md`:
```markdown
# Drivo — Bibliothèque Physique

Static GitHub Pages site previewing a Google Drive folder of Moroccan physics
course material, organized by custom metadata, with a password-gated admin editor.

- **Frontend:** Vite + TypeScript (`src/`), deployed to GitHub Pages by
  `.github/workflows/deploy.yml`.
- **Backend:** Google Apps Script + Google Sheet (`apps-script/`). See
  `apps-script/README.md` to deploy it.
- **Design & plan:** `docs/superpowers/`.

## Local dev
```bash
npm install
npm run dev      # http://localhost:5173/drivo/
npm test
npm run build
```

## Pages URLs
- Browse: `https://<user>.github.io/drivo/`
- Admin:  `https://<user>.github.io/drivo/admin.html`
```

- [ ] **Step 3: Enable Pages and push**

In the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then:
```bash
git add src/config.ts README.md
git commit -m "chore: wire real backend URL and add project README"
git push
```
Confirm the **Deploy to GitHub Pages** action completes green.

- [ ] **Step 4: End-to-end manual verification**

1. Open `https://<user>.github.io/drivo/` → files appear as cards.
2. Filters (Niveau/Type/Matière/Chapitre) and search narrow the results.
3. Click **Ouvrir** → the Drive file opens/previews.
4. Open `.../drivo/admin.html`, enter the wrong password → "Mot de passe incorrect."
5. Enter the correct password → editor lists every file.
6. Edit a title/level/type, **Enregistrer** → "Enregistré ✓".
7. Reload the Browse page (wait past cache or hit **Réindexer Drive** first) → the edit shows.
8. Add a file to Drive, click **Réindexer Drive** in admin → the new file appears.

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "docs: finalize setup notes"
git push
```

---

## Self-Review

**Spec coverage:**
- Static GitHub Pages frontend → Tasks 1, 5, 6, 8. ✅
- Apps Script backend + Sheet, password server-side → Task 7. ✅
- Custom metadata schema (level/type/subject/chapter/title/description/tags/order) → Tasks 2, 6, 7. ✅
- Read merged manifest (join) → moved client-side (Task 2/5), documented; backend returns raw `{files, meta}` (Task 7). ✅
- Public browse + filters + search → Task 5. ✅
- Password-gated admin editor + reindex → Task 6, 7. ✅
- Auto-share files (anyone-with-link viewer), toggleable via `AUTO_SHARE` → Task 7. ✅
- ~10-min server cache + invalidation on save/reindex → Task 7. ✅
- localStorage stale fallback + banner → Tasks 4, 5. ✅
- French UI labels → Tasks 1, 5, 6. ✅
- No API key/secret in browser (only public web-app URL) → Tasks 4, 7, 8. ✅
- CORS-preflight avoidance (text/plain POST) → Tasks 4, 7. ✅
- Error handling (bad password, missing thumbnail fallback via type badge, deleted files drop out) → Tasks 5, 6, 7. ✅
- Scale/batching note → Task 7 README. ✅
- Testing: pure logic unit-tested; backend manual checklist → Tasks 2–6, 7. ✅

**Placeholder scan:** `BACKEND_URL = "__BACKEND_URL__"` is an intentional sentinel replaced in Task 8 Step 1 (called out explicitly), not an unfilled TODO. No other placeholders.

**Type consistency:** `DriveNode`, `RawRow`, `MetaRow`, `LibraryItem` defined in Task 2 and reused verbatim. `RawManifest` defined in Task 4 (`cache.ts`), re-exported by `api.ts`, consumed by Task 5. `SaveInput` defined in Task 4, produced by Task 6's `toSaveInput`, consumed by `saveMeta`. Backend `GET`/`POST` contract in Task 7 matches `api.ts` in Task 4 (`{files, meta}` / `{action, password, rows}` → `{ok, error?, count?}`). Field names (`fileId`, `level`, `type`, `subject`, `chapter`, `title`, `description`, `tags`, `order`) are identical across frontend types, `META_HEADERS`, and the Sheet.
