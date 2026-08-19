import { describe, it, expect } from "vitest";
import { chapterNumber } from "./chapterNumber";
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

  it("returns null for an unknown matière", () => {
    expect(chapterNumber("Tronc Commun", "Biologie", "Le mouvement")).toBeNull();
  });

  it("ignores case and accents when matching", () => {
    expect(chapterNumber("Tronc Commun", "Physique", "LE MOUVEMENT")).toBe(3);
  });
});
