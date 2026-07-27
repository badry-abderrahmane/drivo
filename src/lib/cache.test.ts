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
