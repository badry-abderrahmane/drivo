import { describe, it, expect } from "vitest";
import { isMenuReady, levelsWithMenu, buildLevelMenu } from "./menu";
import type { LibraryItem } from "./types";

const mk = (
  fileId: string,
  over: Partial<LibraryItem["meta"]>,
  order = 0
): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: over.title ?? fileId,
  meta: {
    fileId, level: over.level ?? "", type: over.type ?? "", subject: over.subject ?? "",
    chapter: over.chapter ?? [], title: over.title ?? "", description: "", tags: [], order,
  },
});

const full = (fileId: string, over: Partial<LibraryItem["meta"]>, order = 0) =>
  mk(fileId, { title: "T " + fileId, level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: ["Ondes mécaniques progressives"], ...over }, order);

describe("isMenuReady", () => {
  it("requires title, level, type, subject and at least one chapter", () => {
    expect(isMenuReady(full("1", {}))).toBe(true);
    expect(isMenuReady(full("1", { title: "" }))).toBe(false);
    expect(isMenuReady(full("1", { level: "" }))).toBe(false);
    expect(isMenuReady(full("1", { type: "" }))).toBe(false);
    expect(isMenuReady(full("1", { subject: "" }))).toBe(false);
    expect(isMenuReady(full("1", { chapter: [] }))).toBe(false);
  });
});

describe("levelsWithMenu", () => {
  it("lists levels with qualifying files, in config order, others after", () => {
    const items = [
      full("1", { level: "2ème Bac PC" }),
      full("2", { level: "Tronc Commun" }),
      full("3", { level: "Zzz Autre" }),
      mk("4", { level: "1ère Bac SM" }), // under-tagged → excluded
    ];
    expect(levelsWithMenu(items)).toEqual(["Tronc Commun", "2ème Bac PC", "Zzz Autre"]);
  });
});

describe("buildLevelMenu", () => {
  it("orders columns by TYPES config and rows by curriculum, with cells populated", () => {
    const items = [
      full("c1", { type: "Cours", chapter: ["Ondes mécaniques progressives"] }, 2),
      full("c2", { type: "Cours", chapter: ["Ondes mécaniques progressives"] }, 1),
      full("e1", { type: "Exercices", chapter: ["Ondes mécaniques progressives"] }),
      full("c3", { type: "Cours", chapter: ["Dipôle RC"] }),
      full("ch", { subject: "Chimie", type: "Cours", chapter: ["État d'équilibre d'un système chimique"] }),
    ];
    const menu = buildLevelMenu(items, "2ème Bac SM");
    // columns: Cours before Exercices (config order)
    expect(menu.types).toEqual(["Cours", "Exercices"]);
    // sections: Physique before Chimie
    expect(menu.sections.map((s) => s.subject)).toEqual(["Physique", "Chimie"]);

    const phys = menu.sections[0];
    // rows follow curriculum order: "Ondes mécaniques progressives" (index 0) before "Dipôle RC"
    expect(phys.rows.map((r) => r.chapter)).toEqual(["Ondes mécaniques progressives", "Dipôle RC"]);

    const ondes = phys.rows[0];
    // Cours cell has c1+c2 sorted by order (c2 first), Exercices cell has e1
    const coursCell = ondes.cells.find((c) => c.type === "Cours")!;
    expect(coursCell.files.map((f) => f.fileId)).toEqual(["c2", "c1"]);
    const exCell = ondes.cells.find((c) => c.type === "Exercices")!;
    expect(exCell.files.map((f) => f.fileId)).toEqual(["e1"]);
  });

  it("places a multi-chapter file in each chapter row, deduped per cell", () => {
    const items = [
      full("x", { type: "Exercices", chapter: ["Ondes mécaniques progressives", "Dipôle RC"] }),
    ];
    const menu = buildLevelMenu(items, "2ème Bac SM");
    const rows = menu.sections[0].rows;
    expect(rows.map((r) => r.chapter).sort()).toEqual(["Dipôle RC", "Ondes mécaniques progressives"].sort());
    for (const r of rows) {
      const cell = r.cells.find((c) => c.type === "Exercices")!;
      expect(cell.files.map((f) => f.fileId)).toEqual(["x"]);
    }
  });

  it("only includes qualifying files for the given level", () => {
    const items = [full("1", {}), full("2", { level: "2ème Bac PC" }), mk("3", { level: "2ème Bac SM" })];
    const menu = buildLevelMenu(items, "2ème Bac SM");
    const allFiles = menu.sections.flatMap((s) => s.rows.flatMap((r) => r.cells.flatMap((c) => c.files)));
    expect(allFiles.map((f) => f.fileId)).toEqual(["1"]);
  });
});
