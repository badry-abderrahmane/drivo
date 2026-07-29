import { describe, it, expect } from "vitest";
import { levelsOf, topicsOf, groupCourses } from "./group";
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
    fileId, level: over.level ?? [], type: over.type ?? "", subject: over.subject ?? "",
    chapter: over.chapter ?? [], title: over.title ?? "", description: "", tags: [], order: over.order ?? 0,
  },
});

describe("levelsOf", () => {
  it("uses the metadata level list when set (supports multiple)", () => {
    expect(levelsOf(mk("1", { level: ["2ème Bac SM", "2ème Bac PC"] }, ["1BAC"]))).toEqual([
      "2ème Bac SM",
      "2ème Bac PC",
    ]);
  });
  it("does not fall back to the folder path — an unset niveau yields no level", () => {
    expect(levelsOf(mk("1", {}, ["1BAC", "CHIMIE"]))).toEqual([]);
  });
  it("yields no level when nothing is set", () => {
    expect(levelsOf(mk("1", {}, []))).toEqual([]);
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
      mk("1", { level: ["2ème Bac SM"], subject: "Physique", chapter: ["Mécanique", "Ondes"] }, [], "Examen"),
      mk("2", { level: ["2ème Bac SM"], subject: "Physique", chapter: ["Mécanique"] }, [], "Cours"),
    ];
    const sections = groupCourses(items);
    expect(sections).toHaveLength(1);
    const meca = sections[0].groups.find((g) => g.label === "Physique · Mécanique")!;
    const ondes = sections[0].groups.find((g) => g.label === "Physique · Ondes")!;
    expect(meca.items.map((i) => i.fileId).sort()).toEqual(["1", "2"]);
    expect(ondes.items.map((i) => i.fileId)).toEqual(["1"]);
  });

  it("places a multi-level file under each of its levels", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM", "2ème Bac PC"], subject: "Physique", chapter: ["Ondes"] }, [], "Cours"),
    ];
    const sections = groupCourses(items);
    expect(sections.map((s) => s.level).sort()).toEqual(["2ème Bac PC", "2ème Bac SM"].sort());
    for (const s of sections) {
      expect(s.groups[0].items.map((i) => i.fileId)).toEqual(["1"]);
    }
  });

  it("counts a multi-chapter file once in the level total", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM"], chapter: ["A", "B", "C"] }, [], "Examen"),
    ];
    expect(groupCourses(items)[0].count).toBe(1);
  });

  it("orders known levels in config order, any other level after them", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM"] }, [], "y"),
      mk("2", { level: ["Tronc Commun"] }, [], "z"),
      mk("3", { level: ["2SM"] }, [], "w"), // not in config — sorts after the known ones
    ];
    const order = groupCourses(items).map((s) => s.level);
    expect(order).toEqual(["Tronc Commun", "2ème Bac SM", "2SM"]);
  });

  it("omits files with no niveau instead of grouping them under a folder name", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM"], chapter: ["Ondes"] }, [], "classé"),
      mk("2", {}, ["1BAC", "CHIMIE"], "sans niveau"), // would have become a "1BAC" section
      mk("3", {}, [], "sans rien"), // would have become "Non classé"
    ];
    const sections = groupCourses(items);
    expect(sections.map((s) => s.level)).toEqual(["2ème Bac SM"]);
    const allFiles = sections.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.fileId)));
    expect(allFiles).toEqual(["1"]);
  });

  it("returns no sections when nothing is classified", () => {
    expect(groupCourses([mk("1", {}, ["DOSSIER"], "x")])).toEqual([]);
  });
});
