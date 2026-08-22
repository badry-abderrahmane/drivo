/**
 * The pre-bundle shell is hand-written HTML that no component test can reach, yet App.vue
 * depends on its details: the id it flies the mark from, and the emblem it draws. These
 * assertions are the only thing tying index.html to config.ts — without them the splash can
 * drift to a different logo than the app wears and nothing fails.
 */
import { describe, it, expect } from "vitest";
// `?raw` rather than node:fs — this project carries no @types/node, and Vite's own raw
// import needs none.
import shell from "../index.html?raw";
import { BRAND_BADGE } from "./config";

describe("the pre-bundle shell", () => {
  it("opens on the same emblem the app wears", () => {
    // The splash mark itself, not merely the path appearing somewhere in the file.
    expect(shell).toMatch(new RegExp(`<img[^>]*id="pipc-splash-mark"[^>]*src="${BRAND_BADGE}"`));
  });

  it("preloads the emblem, so the splash paints it instead of waiting on it", () => {
    expect(shell).toMatch(
      new RegExp(`<link[^>]*rel="preload"[^>]*as="image"[^>]*href="${BRAND_BADGE}"`)
    );
  });

  it("keeps the id App.vue measures the opening flight from", () => {
    expect(shell).toContain('id="pipc-splash-mark"');
  });

  it("leaves no stroke-draw rules behind, now that the mark is an image", () => {
    expect(shell).not.toContain("pipc-draw");
    expect(shell).not.toContain("pipc-fill");
  });
});
