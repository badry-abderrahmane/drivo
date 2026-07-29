import { describe, it, expect } from "vitest";
import {
  toEditRow, toSaveInput, saveKey, changedRows, applyBulkPatch, titleSuggestions,
} from "./adminRows";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: ["1BAC", "CHIMIE"], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: ["2ème Bac SM"], type: "Cours", subject: "Physique", chapter: ["Mécanique", "Ondes"], title: "T", description: "D", tags: ["a", "b"], order: 3 },
};

describe("adminRows", () => {
  it("toEditRow copies fields incl. mimeType + path; tags as comma string, chapter as list", () => {
    const r = toEditRow(item);
    expect(r).toMatchObject({ fileId: "1", name: "raw.pdf", mimeType: "application/pdf", type: "Cours", title: "T", tags: "a,b", order: 3 });
    expect(r.level).toEqual(["2ème Bac SM"]);
    expect(r.chapter).toEqual(["Mécanique", "Ondes"]);
    expect(r.path).toEqual(["1BAC", "CHIMIE"]);
  });
  it("toSaveInput joins chapters with ';', passes editable fields, omits mimeType/name/path", () => {
    const r = toEditRow(item);
    r.title = "New";
    const s = toSaveInput(r);
    expect(s).toEqual({ fileId: "1", level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: "Mécanique;Ondes", title: "New", description: "D", tags: "a,b", order: 3 });
    expect(s).not.toHaveProperty("mimeType");
    expect(s).not.toHaveProperty("name");
    expect(s).not.toHaveProperty("path");
  });

  it("toSaveInput joins several levels with ';' (course shared across branches)", () => {
    const r = toEditRow({ ...item, meta: { ...item.meta, level: ["2ème Bac SM", "2ème Bac PC"] } });
    expect(toSaveInput(r).level).toBe("2ème Bac SM;2ème Bac PC");
  });

  it("changedRows returns only rows that differ from the baseline", () => {
    const a = toEditRow({ ...item, fileId: "1" } as LibraryItem);
    const b = toEditRow({ ...item, fileId: "2", meta: { ...item.meta, fileId: "2" } } as LibraryItem);
    const baseline = new Map([[a.fileId, saveKey(a)], [b.fileId, saveKey(b)]]);
    expect(changedRows([a, b], baseline)).toEqual([]); // nothing edited
    a.title = "Edited";
    expect(changedRows([a, b], baseline)).toEqual([a]); // only the edited row
  });

  it("changedRows treats a row missing from the baseline as changed", () => {
    const a = toEditRow(item);
    expect(changedRows([a], new Map())).toEqual([a]);
  });
});

describe("titleSuggestions", () => {
  it("offers each assigned chapter plain and combined with the type", () => {
    expect(titleSuggestions(["Ondes mécaniques"], "Cours", [])).toEqual([
      "Ondes mécaniques",
      "Ondes mécaniques — Cours",
    ]);
  });

  it("covers every assigned chapter", () => {
    expect(titleSuggestions(["A", "B"], "TD", [])).toEqual(["A", "A — TD", "B", "B — TD"]);
  });

  it("omits the combined form when no type is set", () => {
    expect(titleSuggestions(["A"], "", [])).toEqual(["A"]);
  });

  it("falls back to the programme when the file has no chapter yet", () => {
    expect(titleSuggestions([], "Cours", ["P1"])).toEqual(["P1", "P1 — Cours"]);
  });

  it("prefers the file's own chapters over the programme", () => {
    expect(titleSuggestions(["Mine"], "", ["P1", "P2"])).toEqual(["Mine"]);
  });

  it("is empty when there is nothing to suggest", () => {
    expect(titleSuggestions([], "Cours", [])).toEqual([]);
  });

  it("drops empty chapter entries and de-duplicates", () => {
    expect(titleSuggestions(["A", "", "A"], "", [])).toEqual(["A"]);
  });
});

describe("applyBulkPatch", () => {
  const rows = () => [
    toEditRow({ ...item, fileId: "1", meta: { ...item.meta, fileId: "1" } }),
    toEditRow({ ...item, fileId: "2", meta: { ...item.meta, fileId: "2" } }),
  ];

  it("applies only the fields present in the patch, to the selected rows only", () => {
    const rs = rows();
    const n = applyBulkPatch(rs, new Set(["1"]), { subject: "Chimie" });
    expect(n).toBe(1);
    expect(rs[0].subject).toBe("Chimie");
    expect(rs[0].type).toBe("Cours"); // untouched field survives
    expect(rs[1].subject).toBe("Physique"); // unselected row untouched
  });

  it("replaces list fields rather than merging them", () => {
    const rs = rows();
    applyBulkPatch(rs, new Set(["1"]), { level: ["1ère Bac SM"], chapter: ["Optique"] });
    expect(rs[0].level).toEqual(["1ère Bac SM"]);
    expect(rs[0].chapter).toEqual(["Optique"]);
  });

  it("treats a present-but-empty value as an instruction to clear the field", () => {
    const rs = rows();
    applyBulkPatch(rs, new Set(["1"]), { type: "", level: [] });
    expect(rs[0].type).toBe("");
    expect(rs[0].level).toEqual([]);
  });

  it("clones list values so patched rows never share an array", () => {
    const rs = rows();
    const shared = ["2ème Bac SM"];
    applyBulkPatch(rs, new Set(["1", "2"]), { level: shared });
    rs[0].level.push("MUTATED");
    expect(rs[1].level).toEqual(["2ème Bac SM"]);
    expect(shared).toEqual(["2ème Bac SM"]);
  });

  it("returns 0 and changes nothing for an empty selection", () => {
    const rs = rows();
    expect(applyBulkPatch(rs, new Set(), { subject: "Chimie" })).toBe(0);
    expect(rs[0].subject).toBe("Physique");
  });
});
