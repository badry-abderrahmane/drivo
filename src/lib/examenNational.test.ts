import { describe, it, expect } from "vitest";
import {
  buildExamTable,
  examSession,
  isCorrige,
  examLabel,
  EXAMEN_NATIONAL_LEVELS,
} from "./examenNational";
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

/** The 4 cells of a row, keyed for readable assertions. */
const cells = (row: ReturnType<typeof buildExamTable>["rows"][number]) => ({
  nSujet: row.cells[0].files.map((f) => f.item.fileId),
  nCorrige: row.cells[1].files.map((f) => f.item.fileId),
  rSujet: row.cells[2].files.map((f) => f.item.fileId),
  rCorrige: row.cells[3].files.map((f) => f.item.fileId),
});

describe("EXAMEN_NATIONAL_LEVELS", () => {
  it("is only the 3 final-year (2ème Bac) levels", () => {
    expect(EXAMEN_NATIONAL_LEVELS).toEqual(["2ème Bac SM", "2ème Bac PC", "2ème Bac SVT"]);
  });
});

describe("examSession", () => {
  it("reads a standalone R token as the rattrapage session", () => {
    expect(examSession("PC 2025 R")).toBe("R");
    expect(examSession("PC 2025 R CORRIGÉ DÉTAILLÉ")).toBe("R");
    expect(examSession("pc 2025 r corrigé")).toBe("R");
  });

  it("reads the spelled-out 'rattrapage' as the rattrapage session", () => {
    expect(examSession("Examen National 2023 - session de rattrapage")).toBe("R");
  });

  it("falls back to the normale session for N and for titles with no session token", () => {
    expect(examSession("PC 2025 N")).toBe("N");
    expect(examSession("PC 2025 N CORRIGÉ")).toBe("N");
    expect(examSession("Examen National PC 2021")).toBe("N");
  });

  it("does not mistake an R inside a word for the session token", () => {
    expect(examSession("SVT 2024 Rappel")).toBe("N");
    expect(examSession("PHYSIQUE 2024")).toBe("N");
  });
});

describe("isCorrige", () => {
  it("is true for any spelling of corrigé", () => {
    expect(isCorrige("PC 2025 N CORRIGÉ")).toBe(true);
    expect(isCorrige("PC 2025 N CORRIGÉ DÉTAILLÉ")).toBe(true);
    expect(isCorrige("PC 2025 n corrige")).toBe(true);
  });

  it("is false for a plain subject paper", () => {
    expect(isCorrige("PC 2025 N")).toBe(false);
  });
});

describe("examLabel", () => {
  it("keeps only what distinguishes the file from the others in its cell", () => {
    expect(examLabel("PC 2025 N CORRIGÉ DÉTAILLÉ", "2025")).toBe("Corrigé détaillé");
    expect(examLabel("PC 2025 R CORRIGÉ", "2025")).toBe("Corrigé");
  });

  it("drops a spelled-out session mention too, so it never leaks into the chip", () => {
    expect(examLabel("Examen National 2023 - session de rattrapage", "2023")).toBe("Sujet");
    expect(examLabel("Examen 2023 session normale corrigé", "2023")).toBe("Corrigé");
  });

  it("falls back to the column name when nothing distinguishes the file", () => {
    expect(examLabel("PC 2025 N", "2025")).toBe("Sujet");
    expect(examLabel("PC 2025 R", "2025")).toBe("Sujet");
    expect(examLabel("Examen National PC 2021", "2021")).toBe("Sujet");
  });
});

describe("buildExamTable", () => {
  it("routes each file into the session/sujet cell its title names", () => {
    const items = [
      mk("n", { title: "PC 2025 N" }),
      mk("nc", { title: "PC 2025 N CORRIGÉ" }),
      mk("ncd", { title: "PC 2025 N CORRIGÉ DÉTAILLÉ" }),
      mk("r", { title: "PC 2025 R" }),
      mk("rcd", { title: "PC 2025 R CORRIGÉ DÉTAILLÉ" }),
    ];
    const { rows } = buildExamTable(items, "2ème Bac SM");
    expect(rows).toHaveLength(1);
    expect(rows[0].year).toBe("2025");
    expect(cells(rows[0])).toEqual({
      nSujet: ["n"],
      nCorrige: ["nc", "ncd"],
      rSujet: ["r"],
      rCorrige: ["rcd"],
    });
  });

  it("labels each file in a cell by what distinguishes it", () => {
    const items = [
      mk("nc", { title: "PC 2025 N CORRIGÉ" }),
      mk("ncd", { title: "PC 2025 N CORRIGÉ DÉTAILLÉ" }),
    ];
    const { rows } = buildExamTable(items, "2ème Bac SM");
    expect(rows[0].cells[1].files.map((f) => f.label)).toEqual(["Corrigé", "Corrigé détaillé"]);
  });

  it("always lays out the 4 cells in the same order, empty ones included", () => {
    const { rows } = buildExamTable([mk("only", { title: "PC 2025 R" })], "2ème Bac SM");
    expect(rows[0].cells.map((c) => [c.session, c.corrige])).toEqual([
      ["N", false], ["N", true], ["R", false], ["R", true],
    ]);
    expect(rows[0].cells[0].files).toEqual([]);
  });

  it("orders rows most recent year first", () => {
    const items = [
      mk("a", { title: "Examen National PC 2021" }),
      mk("b", { title: "Examen National PC 2023" }),
      mk("c", { title: "PC 2024 R" }),
    ];
    const { rows } = buildExamTable(items, "2ème Bac SM");
    expect(rows.map((r) => r.year)).toEqual(["2024", "2023", "2021"]);
  });

  it("leaves files with no year out of the table, in 'other'", () => {
    const items = [mk("dated", { title: "Sujet 2022" }), mk("undated", { title: "Sujet corrigé" })];
    const { rows, other } = buildExamTable(items, "2ème Bac SM");
    expect(rows.map((r) => r.year)).toEqual(["2022"]);
    expect(other.map((f) => f.fileId)).toEqual(["undated"]);
  });

  it("excludes files that are not classified, not Examen National, or not this level", () => {
    const items = [
      mk("unclassified", { title: "2023", chapter: [] }),
      mk("wrongtype", { title: "2023", type: "Cours" }),
      mk("wronglevel", { title: "2023", level: ["2ème Bac PC"] }),
      mk("keep", { title: "2023" }),
    ];
    const { rows, other } = buildExamTable(items, "2ème Bac SM");
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0].files.map((f) => f.item.fileId)).toEqual(["keep"]);
    expect(other).toEqual([]);
  });
});
