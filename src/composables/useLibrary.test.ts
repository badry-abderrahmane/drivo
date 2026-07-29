import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LibraryItem } from "../lib/types";

const item = (id: string): LibraryItem => ({
  fileId: id, name: id + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level: [], type: "", subject: "", chapter: [], title: "", description: "", tags: [], order: 0 },
});

beforeEach(() => vi.resetModules());

// Reset module state per test by re-importing under a fresh module graph, and inject
// the loadLibrary mock into that graph via doMock (spyOn wouldn't reach the fresh copy).
async function load(
  loadLibrary: ReturnType<typeof vi.fn>,
  readFreshCache: () => LibraryItem[] | null = () => null
) {
  vi.doMock("../lib/loadLibrary", () => ({ loadLibrary, readFreshCache, CACHE_MAX_AGE_MS: 1 }));
  return (await import("./useLibrary")).useLibrary();
}

/** A promise plus the handle to resolve it, so a test can hold the network open. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
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

  describe("with a recent cached copy", () => {
    it("shows cached items without waiting for the network", async () => {
      const net = deferred<{ items: LibraryItem[]; stale: boolean }>();
      const loadLibrary = vi.fn().mockReturnValue(net.promise);
      const lib = await load(loadLibrary, () => [item("cached")]);

      await lib.ensureLoaded();
      // Network is still open, yet we already have something to render.
      expect(lib.items.value.map((i) => i.fileId)).toEqual(["cached"]);
      expect(lib.loading.value).toBe(false); // never blocked
      expect(lib.refreshing.value).toBe(true); // refresh in flight
    });

    it("swaps in fresh data when the background refresh lands", async () => {
      const net = deferred<{ items: LibraryItem[]; stale: boolean }>();
      const loadLibrary = vi.fn().mockReturnValue(net.promise);
      const lib = await load(loadLibrary, () => [item("cached")]);
      await lib.ensureLoaded();

      net.resolve({ items: [item("fresh")], stale: false });
      await new Promise((r) => setTimeout(r, 0));

      expect(lib.items.value.map((i) => i.fileId)).toEqual(["fresh"]);
      expect(lib.refreshing.value).toBe(false);
    });

    it("keeps the cached copy when the background refresh fails", async () => {
      const loadLibrary = vi.fn().mockRejectedValue(new Error("offline"));
      const lib = await load(loadLibrary, () => [item("cached")]);
      await lib.ensureLoaded();
      await new Promise((r) => setTimeout(r, 0));

      expect(lib.items.value.map((i) => i.fileId)).toEqual(["cached"]);
      expect(lib.error.value).toContain("offline");
      expect(lib.refreshing.value).toBe(false);
    });

    it("still refreshes exactly once even if both views mount", async () => {
      const loadLibrary = vi.fn().mockResolvedValue({ items: [item("fresh")], stale: false });
      const lib = await load(loadLibrary, () => [item("cached")]);
      await Promise.all([lib.ensureLoaded(), lib.ensureLoaded()]);
      await new Promise((r) => setTimeout(r, 0));
      expect(loadLibrary).toHaveBeenCalledTimes(1);
    });
  });
});
