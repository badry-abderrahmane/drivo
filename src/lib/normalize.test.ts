import { describe, it, expect } from "vitest";
import { foldText } from "./normalize";

describe("foldText", () => {
  it("strips diacritics", () => {
    expect(foldText("Électricité")).toBe("electricite");
  });

  it("lowercases", () => {
    expect(foldText("ONDES")).toBe("ondes");
  });

  it("collapses and trims whitespace", () => {
    expect(foldText("  Dipôle   RC  ")).toBe("dipole rc");
  });

  it("leaves non-latin scripts alone", () => {
    expect(foldText("الموجات")).toBe("الموجات");
  });

  it("is idempotent", () => {
    expect(foldText(foldText("Mécanique"))).toBe(foldText("Mécanique"));
  });
});
