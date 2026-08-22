import { describe, it, expect } from "vitest";
import { chaptersFor, CHAPTERS_BY_LEVEL } from "./chapters";

describe("chaptersFor", () => {
  it("returns Physique chapters when subject is Physique", () => {
    const list = chaptersFor("2ème Bac SM", "Physique");
    expect(list).toContain("Ondes mécaniques progressives");
    expect(list).not.toContain("État d'équilibre d'un système chimique"); // a chimie chapter
  });

  it("returns Chimie chapters when subject is Chimie", () => {
    const list = chaptersFor("2ème Bac SM", "Chimie");
    expect(list).toContain("État d'équilibre d'un système chimique");
    expect(list).not.toContain("Ondes mécaniques progressives");
  });

  it("merges both when subject is unset or 'Physique & Chimie'", () => {
    const merged = chaptersFor("2ème Bac SM");
    expect(merged).toContain("Ondes mécaniques progressives");
    expect(merged).toContain("État d'équilibre d'un système chimique");
    expect(chaptersFor("2ème Bac SM", "Physique & Chimie")).toEqual(merged);
  });

  it("returns an empty list for an unknown or missing level", () => {
    expect(chaptersFor("Inconnu")).toEqual([]);
    expect(chaptersFor(undefined)).toEqual([]);
    expect(chaptersFor("")).toEqual([]);
  });

  it("covers every configured level", () => {
    for (const level of Object.keys(CHAPTERS_BY_LEVEL)) {
      expect(chaptersFor(level).length).toBeGreaterThan(0);
    }
  });
});
