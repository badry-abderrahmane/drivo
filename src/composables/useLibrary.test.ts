import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LibraryItem } from "../lib/types";

const item = (id: string): LibraryItem => ({
  fileId: id, name: id + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level: "", type: "", subject: "", chapter: [], title: "", description: "", tags: [], order: 0 },
});

beforeEach(() => vi.resetModules());

// Reset module state per test by re-importing under a fresh module graph, and inject
// the loadLibrary mock into that graph via doMock (spyOn wouldn't reach the fresh copy).
async function load(loadLibrary: ReturnType<typeof vi.fn>) {
  vi.doMock("../lib/loadLibrary", () => ({ loadLibrary }));
  return (await import("./useLibrary")).useLibrary();
}

describe("useLibrary", () => {
  it("loads items once via ensureLoaded and sets stale/loading", async () => {
    const loadLibrary = vi.fn().mockResolvedValue({ items: [item("1")], stale: false });
    const lib = await load(loadLibrary);
    expect(lib.loading.value).toBe(false);
    await lib.ensureLoaded();
    expect(lib.items.value).toHaveLength(1);
    expect(lib.stale.value).toBe(false);
    await lib.ensureLoaded(); // second call does not refetch
    expect(loadLibrary).toHaveBeenCalledTimes(1);
  });

  it("captures stale flag", async () => {
    const loadLibrary = vi.fn().mockResolvedValue({ items: [item("1")], stale: true });
    const lib = await load(loadLibrary);
    await lib.ensureLoaded();
    expect(lib.stale.value).toBe(true);
  });

  it("sets error when loadLibrary throws", async () => {
    const loadLibrary = vi.fn().mockRejectedValue(new Error("boom"));
    const lib = await load(loadLibrary);
    await lib.ensureLoaded();
    expect(lib.error.value).toContain("boom");
    expect(lib.items.value).toEqual([]);
  });

  it("reload refetches even after a load", async () => {
    const loadLibrary = vi.fn().mockResolvedValue({ items: [item("1")], stale: false });
    const lib = await load(loadLibrary);
    await lib.ensureLoaded();
    await lib.reload();
    expect(loadLibrary).toHaveBeenCalledTimes(2);
  });
});
