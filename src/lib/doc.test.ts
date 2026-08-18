import { describe, it, expect } from "vitest";
import { findDoc, relatedDocs, docSlug } from "./doc";
import type { LibraryItem } from "./types";

const make = (fileId: string, over: Partial<LibraryItem["meta"]> = {}, title = "Titre"): LibraryItem => ({
  fileId,
  name: `${fileId}.pdf`,
  mimeType: "application/pdf",
  path: [],
  webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false,
  displayTitle: title,
  meta: {
    fileId,
    level: over.level ?? ["2ème Bac SM"],
    type: over.type ?? "Cours",
    subject: over.subject ?? "Physique",
    chapter: over.chapter ?? ["Dipôle RC"],
    title: over.title ?? "",
    description: over.description ?? "",
    tags: over.tags ?? [],
    order: over.order ?? 0,
  },
});

describe("findDoc", () => {
  it("finds a classified document by id", () => {
    const items = [make("a"), make("b")];
    expect(findDoc(items, "b")?.fileId).toBe("b");
  });

  it("returns null for an unknown id", () => {
    expect(findDoc([make("a")], "zzz")).toBeNull();
  });

  it("returns null for an unclassified document, so it stays unpublished", () => {
    const unclassified = make("c", { chapter: [] });
    expect(findDoc([unclassified], "c")).toBeNull();
  });
});

describe("relatedDocs", () => {
  it("returns documents sharing a level and a chapter", () => {
    const target = make("a");
    const sibling = make("b");
    expect(relatedDocs([target, sibling], target).map((i) => i.fileId)).toEqual(["b"]);
  });

  it("excludes the document itself", () => {
    const target = make("a");
    expect(relatedDocs([target], target)).toEqual([]);
  });

  it("excludes documents from another chapter", () => {
    const target = make("a");
    const other = make("b", { chapter: ["Lois de Newton"] });
    expect(relatedDocs([target, other], target)).toEqual([]);
  });

  it("excludes documents from another level", () => {
    const target = make("a");
    const other = make("b", { level: ["2ème Bac PC"] });
    expect(relatedDocs([target, other], target)).toEqual([]);
  });

  it("excludes unclassified documents", () => {
    const target = make("a");
    const draft = make("b", { type: "" });
    expect(relatedDocs([target, draft], target)).toEqual([]);
  });

  it("caps the result at the limit", () => {
    const target = make("a");
    const siblings = Array.from({ length: 12 }, (_, i) => make(`s${i}`));
    expect(relatedDocs([target, ...siblings], target).length).toBe(8);
    expect(relatedDocs([target, ...siblings], target, 3).length).toBe(3);
  });
});

describe("docSlug", () => {
  it("slugifies the display title", () => {
    expect(docSlug(make("a", {}, "Dipôle RC — Cours"))).toBe("dipole-rc-cours");
  });
});
