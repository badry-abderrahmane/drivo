import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchItems } from "./search";
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
    fileId: over.fileId, level: over.level ?? [], type: over.type ?? "",
    subject: over.subject ?? "", chapter: over.chapter ?? [], title: over.title ?? "",
    description: "", tags: over.tags ?? [], order: over.order ?? 0,
  },
});

describe("searchItems", () => {
  const items = [
    item({ fileId: "1" }, "Mécanique du point"),
    item({ fileId: "2", tags: ["newton"] }, "TD1"),
    item({ fileId: "3", chapter: ["Le champ magnétique"] }, "Exercices"),
    item({ fileId: "4" }, "Optique géométrique"),
  ];
  const index = buildSearchIndex(items);

  it("matches on title, case-insensitive and substring-tolerant", () => {
    expect(searchItems(index, "méca").map((i) => i.fileId)).toContain("1");
  });

  it("matches on tags", () => {
    expect(searchItems(index, "newton").map((i) => i.fileId)).toContain("2");
  });

  it("matches on chapter", () => {
    expect(searchItems(index, "champ magnétique").map((i) => i.fileId)).toContain("3");
  });

  it("returns nothing for an empty or whitespace-only query", () => {
    expect(searchItems(index, "")).toEqual([]);
    expect(searchItems(index, "   ")).toEqual([]);
  });

  it("does not match unrelated items", () => {
    expect(searchItems(index, "méca").map((i) => i.fileId)).not.toContain("4");
  });
});
