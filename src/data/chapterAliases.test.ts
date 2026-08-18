import { describe, it, expect } from "vitest";
import { CHAPTER_ALIASES, aliasesFor } from "./chapterAliases";

describe("aliasesFor", () => {
  it("returns aliases for a known chapter", () => {
    expect(aliasesFor(["Dipôle RC"])).toContain("condensateur");
  });

  it("returns nothing for an unknown chapter", () => {
    expect(aliasesFor(["Chapitre inventé"])).toEqual([]);
  });

  it("flattens aliases across several chapters", () => {
    const got = aliasesFor(["Dipôle RC", "Lois de Newton"]);
    expect(got).toContain("condensateur");
    expect(got).toContain("newton");
  });

  it("keys are real chapter labels, never empty", () => {
    for (const key of Object.keys(CHAPTER_ALIASES)) {
      expect(key.trim().length).toBeGreaterThan(0);
      expect(CHAPTER_ALIASES[key].length).toBeGreaterThan(0);
    }
  });
});
