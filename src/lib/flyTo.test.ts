import { describe, it, expect } from "vitest";
import { flyTransform, flyTo, type Box } from "./flyTo";

const box = (left: number, top: number, size: number): Box => ({
  left,
  top,
  width: size,
  height: size,
});

describe("flyTransform", () => {
  it("measures centre to centre, not corner to corner", () => {
    // 100px box at the origin -> 50px box at (200, 200). Corners would say 200,200;
    // the centres are 50,50 and 225,225.
    expect(flyTransform(box(0, 0, 100), box(200, 200, 50))).toBe(
      "translate(175px, 175px) scale(0.5)"
    );
  });

  it("scales by the width ratio", () => {
    expect(flyTransform(box(0, 0, 40), box(0, 0, 80))).toContain("scale(2)");
  });

  it("stays put when the two boxes already coincide", () => {
    expect(flyTransform(box(10, 10, 30), box(10, 10, 30))).toBe("translate(0px, 0px) scale(1)");
  });

  it("refuses to fly when the source has not laid out", () => {
    // The real case: a mark measured before its image or font has sized it. Scaling by a
    // zero width would collapse the element rather than move it.
    expect(flyTransform(box(0, 0, 0), box(50, 50, 40))).toBeNull();
  });

  it("refuses to fly when the target has not laid out", () => {
    expect(flyTransform(box(0, 0, 40), box(50, 50, 0))).toBeNull();
  });
});

describe("flyTo", () => {
  it("reports failure and touches nothing when the boxes cannot be measured", () => {
    // jsdom has no layout engine, so every rect is 0×0 — which is exactly the guard case.
    const el = document.createElement("div");
    const target = document.createElement("div");
    expect(flyTo(el, target, 380)).toBe(false);
    expect(el.style.transform).toBe("");
  });

  it("writes the transition and transform when both boxes measure", () => {
    const el = document.createElement("div");
    const target = document.createElement("div");
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    target.getBoundingClientRect = () =>
      ({ left: 300, top: 40, width: 50, height: 50 }) as DOMRect;

    expect(flyTo(el, target, 380)).toBe(true);
    expect(el.style.transform).toBe("translate(275px, 15px) scale(0.5)");
    expect(el.style.transition).toContain("380ms");
  });

  it("stops a CSS animation on the element, which would otherwise outrank the transform", () => {
    // Animation declarations beat every normal author declaration, the style attribute
    // included. An element that is breathing on a keyframe loop would swallow the flight.
    const el = document.createElement("div");
    const target = document.createElement("div");
    el.style.animation = "breathe 5s ease-in-out infinite";
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    target.getBoundingClientRect = () =>
      ({ left: 300, top: 40, width: 50, height: 50 }) as DOMRect;

    expect(flyTo(el, target, 380)).toBe(true);
    expect(el.style.animation).toBe("none");
  });
});
