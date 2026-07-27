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
