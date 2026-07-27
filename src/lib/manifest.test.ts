import { describe, it, expect } from "vitest";
import { parseTags, parseChapters, normalizeMeta, buildLibrary } from "./manifest";
import type { DriveNode } from "./types";

const node = (over: Partial<DriveNode> & { fileId: string }): DriveNode => ({
  name: "raw.pdf",
  mimeType: "application/pdf",
  path: [],
  webViewLink: "https://drive/x",
  modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false,
  ...over,
});

describe("parseTags", () => {
  it("splits, trims, drops empties", () => {
    expect(parseTags("a, b ,,c")).toEqual(["a", "b", "c"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("parseChapters", () => {
  it("splits on ';' (not ',') so comma-containing titles stay intact", () => {
    expect(parseChapters("Noyaux, masse et énergie; Dipôle RC")).toEqual([
      "Noyaux, masse et énergie",
      "Dipôle RC",
    ]);
    expect(parseChapters("Mécanique")).toEqual(["Mécanique"]);
    expect(parseChapters("")).toEqual([]);
  });

  it("normalizeMeta parses the chapter cell into a list", () => {
    expect(normalizeMeta({ fileId: "1", chapter: "A; B" }).chapter).toEqual(["A", "B"]);
    expect(normalizeMeta({ fileId: "1" }).chapter).toEqual([]);
  });
});

describe("normalizeMeta", () => {
  it("fills defaults and parses tag string", () => {
    const m = normalizeMeta({ fileId: "1", tags: "x, y", order: "3" as unknown as number });
    expect(m.level).toBe("");
    expect(m.tags).toEqual(["x", "y"]);
    expect(m.order).toBe(3);
  });
});

describe("buildLibrary", () => {
  it("joins nodes to meta by fileId, skips folders, uses title fallback", () => {
    const nodes = [
      node({ fileId: "1", name: "raw.pdf" }),
      node({ fileId: "2", name: "folder", isFolder: true }),
    ];
    const meta = [{ fileId: "1", title: "Mécanique — Cours", tags: "newton", order: 2 }];
    const lib = buildLibrary(nodes, meta as any);
    expect(lib).toHaveLength(1);
    expect(lib[0].displayTitle).toBe("Mécanique — Cours");
    expect(lib[0].meta.tags).toEqual(["newton"]);
  });

  it("falls back to raw filename when no metadata title", () => {
    const lib = buildLibrary([node({ fileId: "9", name: "exam.pdf" })], []);
    expect(lib[0].displayTitle).toBe("exam.pdf");
    expect(lib[0].meta.level).toBe("");
  });
});
