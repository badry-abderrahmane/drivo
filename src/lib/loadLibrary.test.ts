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
