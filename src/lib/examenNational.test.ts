import { describe, it, expect } from "vitest";
import { groupExamsByYear, EXAMEN_NATIONAL_LEVELS } from "./examenNational";
import type { LibraryItem } from "./types";

const mk = (fileId: string, over: Partial<LibraryItem["meta"]>): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: over.title ?? fileId,
  meta: {
    fileId, level: ["2ème Bac SM"], type: "Examen National", subject: "Physique",
    chapter: ["Ondes mécaniques progressives"], title: over.title ?? fileId, description: "", tags: [], order: 0,
    ...over,
  },
});

describe("EXAMEN_NATIONAL_LEVELS", () => {
  it("is only the 3 final-year (2ème Bac) levels", () => {
    expect(EXAMEN_NATIONAL_LEVELS).toEqual(["2ème Bac SM", "2ème Bac PC", "2ème Bac SVT"]);
  });
});

describe("groupExamsByYear", () => {
  it("groups by the first 4-digit year found in the title, most recent first", () => {
    const items = [
      mk("a", { title: "Examen National PC 2021" }),
      mk("b", { title: "Examen National PC 2023" }),
      mk("c", { title: "Session normale 2023 - rattrapage" }),
    ];
    const groups = groupExamsByYear(items, "2ème Bac SM");
    expect(groups.map((g) => g.year)).toEqual(["2023", "2021"]);
    expect(groups[0].items.map((f) => f.fileId).sort()).toEqual(["b", "c"]);
  });

  it("puts titles with no year in a trailing 'Autres' group", () => {
    const items = [mk("dated", { title: "Sujet 2022" }), mk("undated", { title: "Sujet corrigé" })];
    const groups = groupExamsByYear(items, "2ème Bac SM");
    expect(groups.map((g) => g.year)).toEqual(["2022", "Autres"]);
    expect(groups[1].items.map((f) => f.fileId)).toEqual(["undated"]);
  });

  it("excludes files that are not classified, not Examen National, or not this level", () => {
    const items = [
      mk("unclassified", { title: "2023", chapter: [] }),
      mk("wrongtype", { title: "2023", type: "Cours" }),
      mk("wronglevel", { title: "2023", level: ["2ème Bac PC"] }),
      mk("keep", { title: "2023" }),
    ];
    const groups = groupExamsByYear(items, "2ème Bac SM");
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((f) => f.fileId)).toEqual(["keep"]);
  });
});
