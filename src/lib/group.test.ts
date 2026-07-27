import { describe, it, expect } from "vitest";
import { levelOf, topicsOf, groupCourses } from "./group";
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
    chapter: over.chapter ?? [], title: over.title ?? "", description: "", tags: [], order: over.order ?? 0,
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

describe("topicsOf", () => {
  it("returns one 'subject · chapter' per chapter", () => {
    expect(topicsOf(mk("1", { subject: "Physique", chapter: ["Mécanique", "Ondes"] }))).toEqual([
      "Physique · Mécanique",
      "Physique · Ondes",
    ]);
  });
  it("uses just the subject when there are no chapters", () => {
    expect(topicsOf(mk("1", { subject: "Chimie" }))).toEqual(["Chimie"]);
  });
  it("falls back to folder path below the level segment", () => {
    expect(topicsOf(mk("1", {}, ["1BAC", "CHIMIE", "COURS"]))).toEqual(["CHIMIE / COURS"]);
  });
  it("falls back to 'Général' when no topic info exists", () => {
    expect(topicsOf(mk("1", {}, ["1BAC"]))).toEqual(["Général"]);
  });
});

describe("groupCourses", () => {
  it("places a multi-chapter file under each of its chapters", () => {
    const items = [
      mk("1", { level: "2ème Bac SM", subject: "Physique", chapter: ["Mécanique", "Ondes"] }, [], "Examen"),
      mk("2", { level: "2ème Bac SM", subject: "Physique", chapter: ["Mécanique"] }, [], "Cours"),
    ];
    const sections = groupCourses(items);
    expect(sections).toHaveLength(1);
    const meca = sections[0].groups.find((g) => g.label === "Physique · Mécanique")!;
    const ondes = sections[0].groups.find((g) => g.label === "Physique · Ondes")!;
    expect(meca.items.map((i) => i.fileId).sort()).toEqual(["1", "2"]);
    expect(ondes.items.map((i) => i.fileId)).toEqual(["1"]);
  });

  it("counts a multi-chapter file once in the level total", () => {
    const items = [
      mk("1", { level: "2ème Bac SM", chapter: ["A", "B", "C"] }, [], "Examen"),
    ];
    expect(groupCourses(items)[0].count).toBe(1);
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
