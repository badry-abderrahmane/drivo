import { describe, it, expect } from "vitest";
import type { LibraryItem } from "./types";
import { pageTitle } from "./pageTitle";
import { enumeratePages } from "./seo";

const item = (fileId: string, title: string): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: {
    fileId, title: "", level: ["2ème Bac SM"], type: "Cours", subject: "Physique",
    chapter: ["Dipôle RC"], description: "", tags: [], order: 0,
  },
});

const items = [item("a", "Dipôle RC — Cours")];
const pages = enumeratePages(items);
const titleOf = (path: string) => pages.find((p) => p.path === path)!.title;

describe("pageTitle", () => {
  it("gives a page the title the prerender gave it", () => {
    expect(pageTitle("/menu", items)).toBe(titleOf("/menu"));
    expect(pageTitle("/", items)).toBe(titleOf("/"));
  });

  it("ignores a trailing slash and a query string", () => {
    expect(pageTitle("/menu/?q=1", items)).toBe(titleOf("/menu"));
  });

  it("names a document by its own title", () => {
    const doc = pages.find((p) => p.path.startsWith("/doc/a/"))!;
    expect(pageTitle(doc.path, items)).toContain("Dipôle RC");
  });

  it("finds a document whose slug is stale", () => {
    expect(pageTitle("/doc/a/some-old-slug", items)).toBe(titleOf("/doc/a"));
  });

  it("has nothing for a path it does not know", () => {
    expect(pageTitle("/nowhere", items)).toBeUndefined();
  });
});
