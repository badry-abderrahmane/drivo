import { describe, it, expect } from "vitest";
import { buildFolderTree, filesUnder, type FolderFile } from "./folderTree";

// A file at `path`; `done: true` makes it pass isClassified (all four fields set).
const f = (path: string[], done = false): FolderFile => ({
  path,
  level: done ? ["2ème Bac SM"] : [],
  type: done ? "Cours" : "",
  subject: done ? "Physique" : "",
  chapter: done ? ["Ondes"] : [],
});

describe("buildFolderTree", () => {
  it("nests folders from the path segments", () => {
    const root = buildFolderTree([f(["2BAC-SM", "PHYSIQUE", "Mécanique"])]);
    expect(root.name).toBe("Tout");
    expect(root.path).toEqual([]);
    const bac = root.children[0];
    expect(bac.name).toBe("2BAC-SM");
    expect(bac.path).toEqual(["2BAC-SM"]);
    const phys = bac.children[0];
    expect(phys.name).toBe("PHYSIQUE");
    expect(phys.path).toEqual(["2BAC-SM", "PHYSIQUE"]);
    expect(phys.children[0].name).toBe("Mécanique");
    expect(phys.children[0].children).toEqual([]);
  });

  it("counts files recursively on every ancestor, including the root", () => {
    const root = buildFolderTree([
      f(["2BAC-SM", "PHYSIQUE", "Mécanique"]),
      f(["2BAC-SM", "PHYSIQUE", "Ondes"]),
      f(["2BAC-SM", "CHIMIE"]),
    ]);
    expect(root.fileCount).toBe(3);
    const bac = root.children.find((c) => c.name === "2BAC-SM")!;
    expect(bac.fileCount).toBe(3);
    const phys = bac.children.find((c) => c.name === "PHYSIQUE")!;
    expect(phys.fileCount).toBe(2);
    expect(phys.children.find((c) => c.name === "Ondes")!.fileCount).toBe(1);
  });

  it("counts classified files and computes a rounded percent", () => {
    const root = buildFolderTree([f(["A"], true), f(["A"], true), f(["A"], false)]);
    const a = root.children[0];
    expect(a.classified).toBe(2);
    expect(a.fileCount).toBe(3);
    expect(a.percent).toBe(67); // 66.67 rounds to 67
  });

  it("reports 0% for a folder with no files rather than dividing by zero", () => {
    const root = buildFolderTree([]);
    expect(root.fileCount).toBe(0);
    expect(root.percent).toBe(0);
    expect(root.children).toEqual([]);
  });

  it("counts a file sitting at the Drive root under 'Tout' but creates no folder", () => {
    const root = buildFolderTree([f([], true), f(["A"])]);
    expect(root.fileCount).toBe(2);
    expect(root.classified).toBe(1);
    expect(root.children.map((c) => c.name)).toEqual(["A"]);
  });

  it("sorts sibling folders alphabetically (fr locale)", () => {
    const root = buildFolderTree([f(["Zoo"]), f(["Élan"]), f(["Abc"])]);
    expect(root.children.map((c) => c.name)).toEqual(["Abc", "Élan", "Zoo"]);
  });

  it("handles a mixed drive: a flat dump folder beside a tidy nested branch", () => {
    const root = buildFolderTree([
      f(["2BAC-SM", "PHYSIQUE", "Mécanique"], true),
      f(["TELECHARGEMENTS"]),
      f(["TELECHARGEMENTS"]),
    ]);
    const dump = root.children.find((c) => c.name === "TELECHARGEMENTS")!;
    expect(dump.children).toEqual([]);
    expect(dump.fileCount).toBe(2);
    expect(dump.percent).toBe(0);
    const bac = root.children.find((c) => c.name === "2BAC-SM")!;
    expect(bac.percent).toBe(100);
  });
});

describe("filesUnder", () => {
  const items = [
    f(["2BAC-SM", "PHYSIQUE", "Mécanique"]),
    f(["2BAC-SM", "PHYSIQUE", "Ondes"]),
    f(["2BAC-SM", "PHYSIQUE"]),
    f(["2BAC-SM", "CHIMIE"]),
    f([]),
  ];

  it("recursive: returns every file beneath the path", () => {
    expect(filesUnder(items, ["2BAC-SM", "PHYSIQUE"], true)).toHaveLength(3);
  });

  it("non-recursive: returns only files sitting directly in the path", () => {
    const direct = filesUnder(items, ["2BAC-SM", "PHYSIQUE"], false);
    expect(direct).toHaveLength(1);
    expect(direct[0].path).toEqual(["2BAC-SM", "PHYSIQUE"]);
  });

  it("an empty path recursively means everything", () => {
    expect(filesUnder(items, [], true)).toHaveLength(5);
  });

  it("an empty path non-recursively means only files at the Drive root", () => {
    expect(filesUnder(items, [], false)).toHaveLength(1);
  });

  it("does not match a folder whose name merely starts with the same text", () => {
    const rows = [f(["PHYSIQUE-2"]), f(["PHYSIQUE"])];
    expect(filesUnder(rows, ["PHYSIQUE"], true)).toHaveLength(1);
  });
});
