import { describe, it, expect } from "vitest";
import { typeColor, TYPE_COLORS } from "./docType";
import { TYPES } from "../config";

describe("typeColor", () => {
  it("gives each configured type its own colour", () => {
    const colors = TYPES.map((t) => typeColor(t));
    expect(new Set(colors).size).toBe(TYPES.length);
  });

  it("maps the known types", () => {
    expect(typeColor("Cours")).toBe("type-cours");
    expect(typeColor("Exercices")).toBe("type-exercices");
    expect(typeColor("Devoir surveillé")).toBe("type-devoir");
    expect(typeColor("Examen National")).toBe("type-examen");
    expect(typeColor("Vidéo")).toBe("type-video");
  });

  it("ignores case and accents", () => {
    expect(typeColor("devoir surveille")).toBe("type-devoir");
    expect(typeColor("VIDEO")).toBe("type-video");
  });

  it("falls back to a neutral colour for an unknown or empty type", () => {
    expect(typeColor("Fiche méthode")).toBe("type-autre");
    expect(typeColor("")).toBe("type-autre");
  });

  it("never returns the action colour, so orange stays reserved for actions", () => {
    for (const t of [...TYPES, "", "Inconnu"]) {
      expect(typeColor(t)).not.toBe("primary");
    }
  });

  it("declares every colour it can return", () => {
    for (const t of [...TYPES, "", "Inconnu"]) {
      expect(TYPE_COLORS).toContain(typeColor(t));
    }
  });
});
