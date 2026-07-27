import { describe, it, expect } from "vitest";
import { levelOf, topicOf, groupCourses } from "./group";
import type { LibraryItem } from "./types";

const mk = (
  fileId: string,
  over: Partial<LibraryItem["meta"]>,
  path: string[] = [],
  title = "t"
): LibraryItem => ({
  fileId, name: title, mimeType: "application/pdf", path, webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: {
    fileId, level: over.level ?? "", type: over.type ?? "", subject: over.subject ?? "",
    chapter: over.chapter ?? "", title: over.title ?? "", description: "", tags: [], order: over.order ?? 0,
  },
});

describe("levelOf", () => {
  it("uses metadata level when set", () => {
    expect(levelOf(mk("1", { level: "2ème Bac SM" }, ["1BAC"]))).toBe("2ème Bac SM");
  });
  it("falls back to the first folder path segment", () => {
    expect(levelOf(mk("1", {}, ["1BAC", "CHIMIE"]))).toBe("1BAC");
  });
  it("falls back to 'Non classé' when nothing is available", () => {
    expect(levelOf(mk("1", {}, []))).toBe("Non classé");
  });
});

describe("topicOf", () => {
  it("uses subject · chapter when set", () => {
    expect(topicOf(mk("1", { subject: "Physique", chapter: "Mécanique" }))).toBe("Physique · Mécanique");
  });
  it("uses just the set metadata field", () => {
    expect(topicOf(mk("1", { chapter: "Ondes" }))).toBe("Ondes");
  });
  it("falls back to folder path below the level segment", () => {
    expect(topicOf(mk("1", {}, ["1BAC", "CHIMIE", "COURS"]))).toBe("CHIMIE / COURS");
  });
  it("falls back to 'Général' when no topic info exists", () => {
    expect(topicOf(mk("1", {}, ["1BAC"]))).toBe("Général");
  });
});

describe("groupCourses", () => {
  it("groups by level then topic", () => {
    const items = [
      mk("1", { level: "2ème Bac SM", subject: "Physique", chapter: "Mécanique" }, [], "Cours 1"),
      mk("2", { level: "2ème Bac SM", subject: "Physique", chapter: "Mécanique" }, [], "Cours 2"),
      mk("3", { level: "2ème Bac SM", subject: "Chimie", chapter: "Dosage" }, [], "TD"),
    ];
    const sections = groupCourses(items);
    expect(sections).toHaveLength(1);
    expect(sections[0].level).toBe("2ème Bac SM");
    expect(sections[0].count).toBe(3);
    const labels = sections[0].groups.map((g) => g.label);
    expect(labels).toContain("Physique · Mécanique");
    expect(labels).toContain("Chimie · Dosage");
    const meca = sections[0].groups.find((g) => g.label === "Physique · Mécanique")!;
    expect(meca.items).toHaveLength(2);
  });

  it("orders known levels first (config order), then others, then 'Non classé' last", () => {
    const items = [
      mk("1", {}, [], "x"),                       // Non classé
      mk("2", { level: "2ème Bac SM" }, [], "y"),
      mk("3", { level: "Tronc Commun" }, [], "z"),
      mk("4", {}, ["2SM"], "w"),                  // path-derived "2SM" (other)
    ];
    const order = groupCourses(items).map((s) => s.level);
    expect(order).toEqual(["Tronc Commun", "2ème Bac SM", "2SM", "Non classé"]);
  });
});
