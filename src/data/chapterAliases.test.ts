import { describe, it, expect } from "vitest";
import { CHAPTER_ALIASES, RETIRED_CHAPTERS, aliasesFor } from "./chapterAliases";
import { CHAPTERS_BY_LEVEL } from "./chapters";

/** Every chapter name the programme currently carries, across all levels and subjects. */
const onProgramme = new Set(
  Object.values(CHAPTERS_BY_LEVEL).flatMap((lvl) => [...lvl.Physique, ...lvl.Chimie])
);

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

  it("reaches the merged modulation chapter, which students still call 'modulation'", () => {
    const merged = "Ondes électromagnétiques - Modulation et démodulation d'amplitude";
    expect(onProgramme.has(merged)).toBe(true);
    const got = aliasesFor([merged]);
    expect(got).toContain("modulation");
    expect(got).toContain("electromagnetique");
  });

  it("keys the programme no longer carries are retired on purpose, not by accident", () => {
    // The drift this catches is silent: rename a chapter in chapters.ts and its aliases go
    // on pointing at a name nothing uses, while the new name is unsearchable. A key may
    // outlive the programme — files in Drive keep their old tag — but it has to be listed.
    const retired = new Set<string>(RETIRED_CHAPTERS);
    for (const key of Object.keys(CHAPTER_ALIASES)) {
      expect(onProgramme.has(key) || retired.has(key), `orphaned alias key: ${key}`).toBe(true);
    }
  });

  it("retires only names the programme has actually dropped", () => {
    for (const name of RETIRED_CHAPTERS) {
      expect(onProgramme.has(name), `still on the programme: ${name}`).toBe(false);
    }
  });
});
