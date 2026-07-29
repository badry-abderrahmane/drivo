import { describe, it, expect } from "vitest";
import { levelsOf, subjectOf, chaptersOf, groupCourses } from "./group";
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

describe("subjectOf", () => {
  it("uses the metadata subject", () => {
    expect(subjectOf(mk("1", { subject: "Chimie" }))).toBe("Chimie");
  });
  it("falls back to 'Autres' when unset", () => {
    expect(subjectOf(mk("1", {}))).toBe("Autres");
  });
});

describe("chaptersOf", () => {
  it("returns one label per chapter", () => {
    expect(chaptersOf(mk("1", { chapter: ["Mécanique", "Ondes"] }))).toEqual([
      "Mécanique",
      "Ondes",
    ]);
  });
  it("falls back to the folder path below the level segment", () => {
    expect(chaptersOf(mk("1", {}, ["1BAC", "CHIMIE", "COURS"]))).toEqual(["CHIMIE / COURS"]);
  });
  it("falls back to 'Général' when nothing else is available", () => {
    expect(chaptersOf(mk("1", {}, ["1BAC"]))).toEqual(["Général"]);
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
    const phys = sections[0].subjects.find((s) => s.subject === "Physique")!;
    const meca = phys.groups.find((g) => g.label === "Mécanique")!;
    const ondes = phys.groups.find((g) => g.label === "Ondes")!;
    expect(meca.items.map((i) => i.fileId).sort()).toEqual(["1", "2"]);
    expect(ondes.items.map((i) => i.fileId)).toEqual(["1"]);
  });

  it("divides a level into one block per matière", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM"], subject: "Physique", chapter: ["Ondes"] }, [], "a"),
      mk("2", { level: ["2ème Bac SM"], subject: "Chimie", chapter: ["Acides"] }, [], "b"),
      mk("3", { level: ["2ème Bac SM"], subject: "Chimie", chapter: ["Piles"] }, [], "c"),
    ];
    const [section] = groupCourses(items);
    // SUBJECTS config order: Physique before Chimie.
    expect(section.subjects.map((s) => s.subject)).toEqual(["Physique", "Chimie"]);
    const chimie = section.subjects.find((s) => s.subject === "Chimie")!;
    expect(chimie.groups.map((g) => g.label)).toEqual(["Acides", "Piles"]);
    expect(chimie.count).toBe(2);
  });

  it("counts a file once per matière even across several of its chapters", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM"], subject: "Physique", chapter: ["A", "B"] }, [], "a"),
    ];
    expect(groupCourses(items)[0].subjects[0].count).toBe(1);
  });

  it("puts an unknown matière after the configured ones", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM"], subject: "Astronomie", chapter: ["X"] }, [], "a"),
      mk("2", { level: ["2ème Bac SM"], subject: "Chimie", chapter: ["Y"] }, [], "b"),
    ];
    expect(groupCourses(items)[0].subjects.map((s) => s.subject)).toEqual([
      "Chimie",
      "Astronomie",
    ]);
  });

  it("places a multi-level file under each of its levels", () => {
    const items = [
      mk("1", { level: ["2ème Bac SM", "2ème Bac PC"], subject: "Physique", chapter: ["Ondes"] }, [], "Cours"),
    ];
    const sections = groupCourses(items);
    expect(sections.map((s) => s.level).sort()).toEqual(["2ème Bac PC", "2ème Bac SM"].sort());
    for (const s of sections) {
      expect(s.subjects[0].groups[0].items.map((i) => i.fileId)).toEqual(["1"]);
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
    const allFiles = sections.flatMap((s) =>
      s.subjects.flatMap((sub) => sub.groups.flatMap((g) => g.items.map((i) => i.fileId)))
    );
    expect(allFiles).toEqual(["1"]);
  });

  it("returns no sections when nothing is classified", () => {
    expect(groupCourses([mk("1", {}, ["DOSSIER"], "x")])).toEqual([]);
  });
});
