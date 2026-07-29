import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { loadLibrary, readFreshCache, CACHE_MAX_AGE_MS } from "./loadLibrary";
import { saveManifestCache } from "./cache";
import * as api from "../api";

const manifest = {
  files: [
    { fileId: "1", name: "a.pdf", mimeType: "application/pdf", path: [], webViewLink: "u", modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false },
  ],
  meta: [{ fileId: "1", title: "Cours 1" }],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
beforeEach(() => {
  localStorage.clear();
  // Fake timers so cache-age assertions can move the clock deterministically.
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-30T10:00:00.000Z"));
});

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

  it("falls back to a copy older than the instant-render window", async () => {
    saveManifestCache(manifest as any);
    vi.setSystemTime(Date.now() + CACHE_MAX_AGE_MS + 60_000);
    vi.spyOn(api, "fetchManifest").mockRejectedValue(new Error("offline"));
    const { items, stale } = await loadLibrary();
    expect(stale).toBe(true);
    expect(items[0].displayTitle).toBe("Cours 1");
  });
});

describe("readFreshCache", () => {
  it("returns null with no cache at all", () => {
    expect(readFreshCache()).toBeNull();
  });

  it("returns the cached library when it was saved recently", () => {
    saveManifestCache(manifest as any);
    const items = readFreshCache();
    expect(items).not.toBeNull();
    expect(items![0].displayTitle).toBe("Cours 1");
  });

  it("returns null once the copy is older than the max age", () => {
    saveManifestCache(manifest as any);
    vi.setSystemTime(Date.now() + CACHE_MAX_AGE_MS + 1);
    expect(readFreshCache()).toBeNull();
  });

  it("still accepts a copy just inside the max age", () => {
    saveManifestCache(manifest as any);
    vi.setSystemTime(Date.now() + CACHE_MAX_AGE_MS - 1000);
    expect(readFreshCache()).not.toBeNull();
  });

  it("refuses an entry with no timestamp (written before timestamps existed)", () => {
    localStorage.setItem("drivo:manifest", JSON.stringify(manifest));
    expect(readFreshCache()).toBeNull();
  });

  it("refuses a copy stamped in the future, since the clock cannot be trusted", () => {
    saveManifestCache(manifest as any);
    vi.setSystemTime(Date.now() - 60_000);
    expect(readFreshCache()).toBeNull();
  });
});
