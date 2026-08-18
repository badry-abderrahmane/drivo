import { describe, it, expect } from "vitest";
import { slugify, resolveSlug } from "./slug";

describe("slugify", () => {
  it("slugifies a level label", () => {
    expect(slugify("2ème Bac SM")).toBe("2eme-bac-sm");
  });

  it("slugifies a chapter with punctuation", () => {
    expect(slugify("Oscillations libres d'un circuit RLC en série")).toBe(
      "oscillations-libres-d-un-circuit-rlc-en-serie"
    );
  });

  it("collapses runs of separators and trims them", () => {
    expect(slugify("  Noyaux, masse et énergie  ")).toBe("noyaux-masse-et-energie");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("resolveSlug", () => {
  const levels = ["Tronc Commun", "2ème Bac SM", "2ème Bac PC"];

  it("finds the label whose slug matches", () => {
    expect(resolveSlug("2eme-bac-sm", levels)).toBe("2ème Bac SM");
  });

  it("returns null for an unknown slug rather than guessing", () => {
    expect(resolveSlug("3eme-bac-xyz", levels)).toBeNull();
  });

  it("returns null for an empty slug", () => {
    expect(resolveSlug("", levels)).toBeNull();
  });
});
