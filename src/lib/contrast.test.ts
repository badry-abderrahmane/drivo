import { describe, it, expect } from "vitest";
import { relativeLuminance, contrastRatio, overlay } from "./contrast";

describe("relativeLuminance", () => {
  it("anchors at 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBe(1);
  });

  it("accepts a hex colour in either case", () => {
    expect(relativeLuminance("#ffffff")).toBe(relativeLuminance("#FFFFFF"));
  });
});

describe("contrastRatio", () => {
  it("gives 21:1 for black on white and 1:1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 4);
    expect(contrastRatio("#3A7B2C", "#3A7B2C")).toBeCloseTo(1, 4);
  });

  it("is symmetric — order of the two colours does not matter", () => {
    expect(contrastRatio("#14528C", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#14528C"),
      10
    );
  });

  it("matches the reference value for #767676, the lightest grey that passes AA on white", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.5);
  });
});

describe("overlay", () => {
  it("returns the backdrop at 0 opacity and the colour at full opacity", () => {
    expect(overlay("#FF0000", "#FFFFFF", 0)).toBe("#ffffff");
    expect(overlay("#FF0000", "#FFFFFF", 1)).toBe("#ff0000");
  });

  it("composites a partially transparent colour onto its backdrop", () => {
    // Half of #000000 over #FFFFFF lands on the midpoint, rounded.
    expect(overlay("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});
