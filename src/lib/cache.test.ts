import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { saveManifestCache, loadManifestCache } from "./cache";

describe("manifest cache", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it("returns null when empty", () => {
    expect(loadManifestCache()).toBeNull();
  });

  it("round-trips a manifest", () => {
    const m = { files: [], meta: [{ fileId: "1", title: "x" }] };
    saveManifestCache(m as any);
    expect(loadManifestCache()?.manifest).toEqual(m);
  });

  it("stamps the save time so callers can judge freshness", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T10:00:00.000Z"));
    saveManifestCache({ files: [], meta: [] } as any);
    expect(loadManifestCache()?.savedAt).toBe(Date.parse("2026-07-30T10:00:00.000Z"));
  });

  it("reports savedAt as null for an entry written before timestamps existed", () => {
    localStorage.setItem("drivo:manifest", JSON.stringify({ files: [], meta: [] }));
    const c = loadManifestCache();
    expect(c).not.toBeNull();
    expect(c?.savedAt).toBeNull();
  });

  it("returns null on corrupt data", () => {
    localStorage.setItem("drivo:manifest", "{not json");
    expect(loadManifestCache()).toBeNull();
  });

  it("returns null when the stored shape is not a manifest", () => {
    localStorage.setItem("drivo:manifest", JSON.stringify({ savedAt: 1, files: "nope" }));
    expect(loadManifestCache()).toBeNull();
  });
});
