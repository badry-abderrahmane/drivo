import { describe, it, expect } from "vitest";
import { isClassified, classificationStats } from "./classification";

const row = (over: Partial<Parameters<typeof isClassified>[0]> = {}) => ({
  level: ["2ème Bac SM"], type: "Cours", subject: "Physique", chapter: ["Ondes"], ...over,
});

describe("isClassified", () => {
  it("requires level, type, subject and ≥1 chapter", () => {
    expect(isClassified(row())).toBe(true);
    expect(isClassified(row({ level: [] }))).toBe(false);
    expect(isClassified(row({ type: "" }))).toBe(false);
    expect(isClassified(row({ subject: "" }))).toBe(false);
    expect(isClassified(row({ chapter: [] }))).toBe(false);
  });
});

describe("classificationStats", () => {
  it("counts classified files and computes a rounded percentage", () => {
    const items = [row(), row(), row({ chapter: [] }), row({ level: [] })];
    expect(classificationStats(items)).toEqual({ classified: 2, total: 4, percent: 50 });
  });
  it("is 0% for an empty list (no division by zero)", () => {
    expect(classificationStats([])).toEqual({ classified: 0, total: 0, percent: 0 });
  });
});
