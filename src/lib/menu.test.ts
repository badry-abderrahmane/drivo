import { describe, it, expect } from "vitest";
import { isMenuReady, menuLevels, buildLevelMenu } from "./menu";
import { CHAPTERS_BY_LEVEL } from "../data/chapters";
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

describe("menuLevels", () => {
  it("returns all official program levels in config order", () => {
    expect(menuLevels()).toEqual([
      "Tronc Commun",
      "1ère Bac Sc. Exp",
      "1ère Bac SM",
      "2ème Bac SM",
      "2ème Bac PC",
      "2ème Bac SVT",
    ]);
  });
});

describe("buildLevelMenu", () => {
  it("shows the full official program as rows (Physique then Chimie), even empty", () => {
    const menu = buildLevelMenu([], "2ème Bac SM");
    expect(menu.sections.map((s) => s.subject)).toEqual(["Physique", "Chimie"]);
    expect(menu.sections[0].rows.map((r) => r.chapter)).toEqual(CHAPTERS_BY_LEVEL["2ème Bac SM"].Physique);
    expect(menu.sections[1].rows.map((r) => r.chapter)).toEqual(CHAPTERS_BY_LEVEL["2ème Bac SM"].Chimie);
    expect(menu.types).toEqual([]); // no files → no columns
  });

  it("columns are only the types present, ordered by config", () => {
    const items = [
      full("e", { type: "Exercices" }),
      full("c", { type: "Cours" }),
      full("v", { type: "Vidéo" }),
    ];
    expect(buildLevelMenu(items, "2ème Bac SM").types).toEqual(["Cours", "Exercices", "Vidéo"]);
  });

  it("fills cells by chapter + type; empty where no file; sorts by order", () => {
    const items = [
      full("c1", { type: "Cours", chapter: ["Ondes mécaniques progressives"] }, 2),
      full("c2", { type: "Cours", chapter: ["Ondes mécaniques progressives"] }, 1),
      full("e1", { type: "Exercices", chapter: ["Dipôle RC"] }),
    ];
    const menu = buildLevelMenu(items, "2ème Bac SM");
    const phys = menu.sections[0];
    const ondes = phys.rows.find((r) => r.chapter === "Ondes mécaniques progressives")!;
    const coursCell = ondes.cells.find((c) => c.type === "Cours")!;
    expect(coursCell.files.map((f) => f.fileId)).toEqual(["c2", "c1"]); // order 1 before 2
    // Ondes has no Exercices file → empty cell
    expect(ondes.cells.find((c) => c.type === "Exercices")!.files).toEqual([]);
    // Dipôle RC row has the exercices file
    const rc = phys.rows.find((r) => r.chapter === "Dipôle RC")!;
    expect(rc.cells.find((c) => c.type === "Exercices")!.files.map((f) => f.fileId)).toEqual(["e1"]);
  });

  it("places a multi-chapter file under each of its official chapters", () => {
    const items = [full("x", { type: "Exercices", chapter: ["Ondes mécaniques progressives", "Dipôle RC"] })];
    const phys = buildLevelMenu(items, "2ème Bac SM").sections[0];
    const inOndes = phys.rows.find((r) => r.chapter === "Ondes mécaniques progressives")!.cells.find((c) => c.type === "Exercices")!;
    const inRc = phys.rows.find((r) => r.chapter === "Dipôle RC")!.cells.find((c) => c.type === "Exercices")!;
    expect(inOndes.files.map((f) => f.fileId)).toEqual(["x"]);
    expect(inRc.files.map((f) => f.fileId)).toEqual(["x"]);
  });

  it("ignores off-program chapters and other levels", () => {
    const items = [
      full("keep", { type: "Cours", chapter: ["Ondes mécaniques progressives"] }),
      full("offprog", { type: "Cours", chapter: ["Chapitre Inventé"] }),
      full("other", { level: "2ème Bac PC", type: "Cours", chapter: ["Ondes mécaniques progressives"] }),
    ];
    const menu = buildLevelMenu(items, "2ème Bac SM");
    const allFiles = menu.sections.flatMap((s) => s.rows.flatMap((r) => r.cells.flatMap((c) => c.files)));
    expect([...new Set(allFiles.map((f) => f.fileId))]).toEqual(["keep"]);
  });
});
