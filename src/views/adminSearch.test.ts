import { describe, it, expect } from "vitest";
import { searchRows } from "./adminSearch";
import type { EditRow } from "./adminRows";

const row = (over: Partial<EditRow>): EditRow => ({
  fileId: "f1",
  name: "fichier.pdf",
  mimeType: "application/pdf",
  path: ["Drive"],
  level: [],
  type: "",
  subject: "",
  chapter: [],
  title: "",
  description: "",
  tags: "",
  order: 0,
  ...over,
});

const rows: EditRow[] = [
  row({ fileId: "1", name: "2bac-sm-ondes.pdf", title: "Ondes mécaniques progressives", chapter: ["Ondes mécaniques progressives"], type: "Cours", level: ["2ème Bac SM"], subject: "Physique" }),
  row({ fileId: "2", name: "DS-electricite.pdf", title: "Devoir surveillé — Électricité", chapter: ["Le champ électrostatique"], type: "Devoir surveillé", level: ["1ère Bac SM"], subject: "Physique" }),
  row({ fileId: "3", name: "chimie-dosage.pdf", title: "Dosage acido-basique", chapter: ["Dosage acido-basique"], type: "Exercices", level: ["2ème Bac PC"], subject: "Chimie" }),
  row({ fileId: "4", name: "IMG_2043.pdf" }), // unclassified: filename only
];

const ids = (rs: EditRow[]) => rs.map((r) => r.fileId);

describe("searchRows", () => {
  it("returns every row for an empty query — this is a worklist, not an overlay", () => {
    expect(searchRows(rows, "")).toHaveLength(rows.length);
    expect(searchRows(rows, "   ")).toHaveLength(rows.length);
  });

  it("matches the raw Drive filename, which is all an unclassified file has", () => {
    expect(ids(searchRows(rows, "IMG_2043"))).toContain("4");
  });

  it("ignores accents", () => {
    expect(ids(searchRows(rows, "electricite"))).toContain("2");
    expect(ids(searchRows(rows, "mecaniques"))).toContain("1");
  });

  it("ignores case", () => {
    expect(ids(searchRows(rows, "ONDES"))).toContain("1");
  });

  it("tolerates a typo", () => {
    expect(ids(searchRows(rows, "ondse"))).toContain("1");
  });

  it("finds by chapter", () => {
    expect(ids(searchRows(rows, "champ électrostatique"))).toContain("2");
  });

  it("finds by niveau and by type, which is how a worklist gets narrowed", () => {
    expect(ids(searchRows(rows, "2ème Bac PC"))).toContain("3");
    expect(ids(searchRows(rows, "Devoir surveillé"))).toContain("2");
  });

  it("finds a title that was edited but not yet saved", () => {
    const edited = rows.map((r) => (r.fileId === "4" ? { ...r, title: "Pendule pesant" } : r));
    expect(ids(searchRows(edited, "pendule"))).toContain("4");
  });

  it("excludes rows that do not match", () => {
    expect(ids(searchRows(rows, "dosage"))).not.toContain("1");
  });

  it("returns nothing when nothing matches", () => {
    expect(searchRows(rows, "zzzzzzzz")).toHaveLength(0);
  });
});
