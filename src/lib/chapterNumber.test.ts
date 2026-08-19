import { describe, it, expect } from "vitest";
import { chapterNumber, chapterMatiere, sortChaptersByProgram } from "./chapterNumber";
import { CHAPTERS_BY_LEVEL } from "../data/chapters";

describe("chapterNumber", () => {
  it("numbers a chapter by its position in the official program", () => {
    expect(chapterNumber("Tronc Commun", "Physique", "La gravitation universelle")).toBe(1);
    expect(chapterNumber("Tronc Commun", "Physique", "Le mouvement")).toBe(3);
  });

  it("numbers each matière independently", () => {
    const first = CHAPTERS_BY_LEVEL["Tronc Commun"].Chimie[0];
    expect(chapterNumber("Tronc Commun", "Chimie", first)).toBe(1);
  });

  it("returns null for a chapter that is not in the program", () => {
    expect(chapterNumber("Tronc Commun", "Physique", "Chapitre inventé")).toBeNull();
  });

  it("returns null for an unknown level", () => {
    expect(chapterNumber("Niveau inconnu", "Physique", "Le mouvement")).toBeNull();
  });

  it("numbers a combined 'Physique & Chimie' subject from whichever list holds it", () => {
    const chimie = CHAPTERS_BY_LEVEL["Tronc Commun"].Chimie[1];
    expect(chapterNumber("Tronc Commun", "Physique & Chimie", "Le mouvement")).toBe(3);
    expect(chapterNumber("Tronc Commun", "Physique & Chimie", chimie)).toBe(2);
  });

  it("returns null for an unknown matière when the chapter is in neither list", () => {
    expect(chapterNumber("Tronc Commun", "Biologie", "La photosynthèse")).toBeNull();
  });

  it("ignores case and accents when matching", () => {
    expect(chapterNumber("Tronc Commun", "Physique", "LE MOUVEMENT")).toBe(3);
  });
});

describe("chapterMatiere", () => {
  it("reports which half of the program a chapter belongs to", () => {
    expect(chapterMatiere("Tronc Commun", "Le mouvement")).toBe("Physique");
    expect(chapterMatiere("Tronc Commun", CHAPTERS_BY_LEVEL["Tronc Commun"].Chimie[0])).toBe("Chimie");
  });

  it("returns null for an off-program chapter or unknown level", () => {
    expect(chapterMatiere("Tronc Commun", "Chapitre inventé")).toBeNull();
    expect(chapterMatiere("Niveau inconnu", "Le mouvement")).toBeNull();
  });
});

describe("sortChaptersByProgram", () => {
  const TC = CHAPTERS_BY_LEVEL["Tronc Commun"];

  it("orders by program position rather than alphabetically", () => {
    // Alphabetically "Exemples…" sorts first; in the program it is second.
    const input = ["Exemples d'actions mécaniques", "La gravitation universelle", "Le mouvement"];
    expect(sortChaptersByProgram(input, "Tronc Commun")).toEqual([
      "La gravitation universelle",
      "Exemples d'actions mécaniques",
      "Le mouvement",
    ]);
  });

  it("puts the whole Physique run before the Chimie run", () => {
    const input = [TC.Chimie[0], TC.Physique[2], TC.Chimie[1], TC.Physique[0]];
    expect(sortChaptersByProgram(input, "Tronc Commun")).toEqual([
      TC.Physique[0],
      TC.Physique[2],
      TC.Chimie[0],
      TC.Chimie[1],
    ]);
  });

  it("reproduces a level's own program exactly, from any starting order", () => {
    for (const level of ["1ère Bac Sc. Exp", "1ère Bac SM", "2ème Bac SM"]) {
      const program = [
        ...CHAPTERS_BY_LEVEL[level].Physique,
        ...CHAPTERS_BY_LEVEL[level].Chimie,
      ];
      expect(sortChaptersByProgram([...program].reverse(), level)).toEqual(program);
    }
  });

  it("reads the index from the selected level, not from wherever the name appears first", () => {
    // "Le champ magnétique" is #7 in Sc. Exp but #11 in SM. A single global rank table
    // would give both levels the same answer; 18 chapters differ this way.
    const shared = "Le champ magnétique";
    const expIdx = sortChaptersByProgram(
      [...CHAPTERS_BY_LEVEL["1ère Bac Sc. Exp"].Physique].reverse(),
      "1ère Bac Sc. Exp"
    ).indexOf(shared);
    const smIdx = sortChaptersByProgram(
      [...CHAPTERS_BY_LEVEL["1ère Bac SM"].Physique].reverse(),
      "1ère Bac SM"
    ).indexOf(shared);
    expect(expIdx).toBe(6);
    expect(smIdx).toBe(10);
  });

  it("falls back to curriculum order across levels when no level is selected", () => {
    const later = CHAPTERS_BY_LEVEL["2ème Bac SM"].Physique[0];
    expect(sortChaptersByProgram([later, TC.Physique[0]])).toEqual([TC.Physique[0], later]);
  });

  it("keeps off-program chapters last, alphabetically among themselves", () => {
    const input = ["Zèbre inventé", TC.Physique[1], "Alpha inventé", TC.Physique[0]];
    expect(sortChaptersByProgram(input, "Tronc Commun")).toEqual([
      TC.Physique[0],
      TC.Physique[1],
      "Alpha inventé",
      "Zèbre inventé",
    ]);
  });

  it("matches program entries ignoring case and accents", () => {
    const input = ["LE MOUVEMENT", "la gravitation universelle"];
    expect(sortChaptersByProgram(input, "Tronc Commun")).toEqual([
      "la gravitation universelle",
      "LE MOUVEMENT",
    ]);
  });

  it("falls back to alphabetical for an unknown level, and never drops or mutates input", () => {
    const input = ["Bêta", "Alpha"];
    const copy = [...input];
    expect(sortChaptersByProgram(input, "Niveau inconnu")).toEqual(["Alpha", "Bêta"]);
    expect(input).toEqual(copy);
  });
});
