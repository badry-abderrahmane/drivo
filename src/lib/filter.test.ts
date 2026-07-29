import { describe, it, expect } from "vitest";
import { applyFilters, sortItems, distinctValues, distinctChapters, distinctLevels } from "./filter";
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

describe("applyFilters", () => {
  const items = [
    item({ fileId: "1", level: ["2 Bac SM"], type: "Cours" }, "Mécanique"),
    item({ fileId: "2", level: ["2 Bac SM"], type: "Exercices", tags: ["newton"] }, "TD1"),
    item({ fileId: "3", level: ["1 Bac"], type: "Cours" }, "Optique"),
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

describe("chapter filtering (chapter is a list per file)", () => {
  const items = [
    item({ fileId: "1", chapter: ["Mécanique", "Ondes"] }, "Examen"),
    item({ fileId: "2", chapter: ["Ondes"] }, "TD"),
    item({ fileId: "3", chapter: [] }, "Autre"),
  ];
  it("matches a file if the chapter is among its list", () => {
    expect(applyFilters(items, { chapter: "Mécanique" }).map((i) => i.fileId)).toEqual(["1"]);
    expect(applyFilters(items, { chapter: "Ondes" }).map((i) => i.fileId)).toEqual(["1", "2"]);
  });
});

describe("distinctChapters", () => {
  it("flattens and de-duplicates chapters across files, sorted", () => {
    const items = [
      item({ fileId: "1", chapter: ["Ondes", "Mécanique"] }),
      item({ fileId: "2", chapter: ["Ondes"] }),
      item({ fileId: "3", chapter: [] }),
    ];
    expect(distinctChapters(items)).toEqual(["Mécanique", "Ondes"]);
  });
});

describe("distinctValues", () => {
  it("returns sorted unique non-empty values", () => {
    const items = [
      item({ fileId: "1", type: "Cours" }),
      item({ fileId: "2", type: "Exercices" }),
      item({ fileId: "3", type: "" }),
      item({ fileId: "4", type: "Cours" }),
    ];
    expect(distinctValues(items, "type")).toEqual(["Cours", "Exercices"]);
  });
});

describe("level filtering (level is a list per file)", () => {
  const items = [
    item({ fileId: "1", level: ["2 Bac SM", "2 Bac PC"] }, "Partagé"),
    item({ fileId: "2", level: ["2 Bac PC"] }, "PC seul"),
    item({ fileId: "3", level: [] }, "Non classé"),
  ];
  it("matches a file if the level is among its list", () => {
    expect(applyFilters(items, { level: "2 Bac SM" }).map((i) => i.fileId)).toEqual(["1"]);
    expect(applyFilters(items, { level: "2 Bac PC" }).map((i) => i.fileId)).toEqual(["1", "2"]);
  });
  it("distinctLevels flattens and de-duplicates levels across files, sorted", () => {
    expect(distinctLevels(items)).toEqual(["2 Bac PC", "2 Bac SM"]);
  });
});
