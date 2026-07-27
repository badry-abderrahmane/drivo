import { describe, it, expect } from "vitest";
import { toEditRow, toSaveInput, saveKey, changedRows } from "./adminRows";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: ["Mécanique", "Ondes"], title: "T", description: "D", tags: ["a", "b"], order: 3 },
};

describe("adminRows", () => {
  it("toEditRow copies fields incl. mimeType; tags as comma string, chapter as list", () => {
    const r = toEditRow(item);
    expect(r).toMatchObject({ fileId: "1", name: "raw.pdf", mimeType: "application/pdf", level: "2ème Bac SM", type: "Cours", title: "T", tags: "a,b", order: 3 });
    expect(r.chapter).toEqual(["Mécanique", "Ondes"]);
  });
  it("toSaveInput joins chapters with ';', passes editable fields, omits mimeType/name", () => {
    const r = toEditRow(item);
    r.title = "New";
    const s = toSaveInput(r);
    expect(s).toEqual({ fileId: "1", level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: "Mécanique;Ondes", title: "New", description: "D", tags: "a,b", order: 3 });
    expect(s).not.toHaveProperty("mimeType");
    expect(s).not.toHaveProperty("name");
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
