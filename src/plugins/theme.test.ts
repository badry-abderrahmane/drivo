import { describe, it, expect } from "vitest";
import { contrastRatio, overlay } from "../lib/contrast";
import { THEME_COLORS, LANDING_GROUND, type ThemeColors } from "./theme";
import { TYPE_COLORS } from "../lib/docType";

/**
 * Contrast guard for the palette.
 *
 * Two real regressions motivated this, both introduced by changes that looked purely
 * cosmetic and both invisible in review: an `outline` token recoloured to 2.96:1 against
 * white (a border needs 3:1), and a tonal chip that separated from its new tinted panel by
 * 1.20:1 — identical to the unselected chip beside it, which erased the selected state.
 *
 * Vuetify paints its tonal variant as a wash of the colour over whatever is behind it, so
 * chips are measured against that composite rather than against the bare surface.
 */
const TONAL_ALPHA = 0.14;

const modes = Object.entries(THEME_COLORS) as [string, ThemeColors][];

describe.each(modes)("%s theme contrast", (_mode, c) => {
  // Every on-X token has to be readable on its X. This catches the common mistake of
  // recolouring a surface and forgetting the text that sits on it.
  const paired = Object.keys(c)
    .filter((k) => k.startsWith("on-"))
    .map((on) => [on, on.slice(3)] as const)
    .filter(([, base]) => c[base]);

  it("pairs every on-* token with its base at AA (4.5:1)", () => {
    expect(paired.length).toBeGreaterThan(8);
    for (const [on, base] of paired) {
      expect(
        contrastRatio(c[on], c[base]),
        `${on} on ${base} (${c[on]} / ${c[base]})`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps muted body text readable on both surfaces it appears on", () => {
    for (const bg of ["surface", "surface-variant", "background"]) {
      expect(
        contrastRatio(c["on-surface-variant"], c[bg]),
        `on-surface-variant on ${bg}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The original failure. A border is a UI component boundary, not text: 3:1, not 4.5:1.
  it("keeps outline at the 3:1 a border needs, on surface and on background", () => {
    for (const bg of ["surface", "background"]) {
      expect(contrastRatio(c.outline, c[bg]), `outline on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the status colours readable on surface", () => {
    for (const k of ["error", "warning", "success"]) {
      expect(contrastRatio(c[k], c.surface), `${k} on surface`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The footer proverbs are primary-on-surface.
  it("keeps primary readable as text on surface", () => {
    expect(contrastRatio(c.primary, c.surface)).toBeGreaterThanOrEqual(4.5);
  });

  // The second failure. The filter bar sits on primary-container; a selected chip must
  // stay distinguishable from that panel, and its label readable on the chip.
  it("keeps a selected filter chip distinct from the tinted filter bar behind it", () => {
    expect(
      contrastRatio(c.primary, c["primary-container"]),
      "selected chip against the filter-bar tint"
    ).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c["on-primary"], c.primary)).toBeGreaterThanOrEqual(4.5);
  });

  // The landing paints a full screen of brand colour and puts a gradient wordmark, a button
  // label and captions on it. Every stop has to clear AA on that ground — the two obvious
  // candidates did not, which is the whole reason these tokens exist.
  it("keeps the landing sheen readable on the ground the landing actually uses", () => {
    const ground = c[LANDING_GROUND[_mode as "light" | "dark"]];
    expect(ground, `no landing ground for ${_mode}`).toBeDefined();
    for (const stop of ["landing-sheen-cool", "landing-sheen-warm"]) {
      expect(
        contrastRatio(c[stop], ground),
        `${stop} (${c[stop]}) on ${LANDING_GROUND[_mode as "light" | "dark"]} (${ground})`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The glass panels on the landing are a dark wash over that same ground. A white wash —
  // the usual glassmorphism recipe — lightens it and closes the gap to the text on top:
  // 4.21:1 at 12% and worse as it thickens. Deepening it instead is what keeps this legible.
  it("keeps text on the landing's frosted panels at AA", () => {
    const mode = _mode as "light" | "dark";
    const ground = c[LANDING_GROUND[mode]];
    const wash = mode === "light" ? "#0B2E1D" : "#04170E";
    const glass = overlay(wash, ground, 0.2);
    const fg = mode === "light" ? c["on-primary"] : c["on-primary-container"];
    expect(contrastRatio(fg, glass), `landing text on frosted glass (${glass})`)
      .toBeGreaterThanOrEqual(4.5);
    // The captions under each number run at 76% of that foreground — still a UI label, 3:1.
    expect(contrastRatio(overlay(fg, glass, 0.76), glass), "muted caption on frosted glass")
      .toBeGreaterThanOrEqual(3);
  });

  // The landing's Commencer button is a light gradient across these three in both themes,
  // so its label has to clear AA at every point along it. This shipped once as
  // `on-primary-container` in dark mode — the exact value of the gradient's first stop,
  // i.e. 1.00:1, a label the same colour as the button.
  it("keeps the landing button's label readable across its whole gradient", () => {
    const mode = _mode as "light" | "dark";
    const label = mode === "light" ? c.primary : c["on-primary"];
    const stops = [
      mode === "light" ? c["on-primary"] : c["on-primary-container"],
      c["landing-sheen-cool"],
      c["landing-sheen-warm"],
    ];
    for (const stop of stops) {
      expect(contrastRatio(label, stop), `button label ${label} on gradient stop ${stop}`)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps every document-type badge legible as a tonal chip", () => {
    for (const name of TYPE_COLORS) {
      const hex = c[name];
      expect(hex, `${name} is missing from the ${_mode} theme`).toBeDefined();
      expect(
        contrastRatio(hex, overlay(hex, c.surface, TONAL_ALPHA)),
        `${name} (${hex}) as a tonal chip`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // A badge is a label, not an action — see docType.ts.
  it("never lets a document-type badge wear the brand colour", () => {
    for (const name of TYPE_COLORS) {
      expect(c[name], `${name} must not be the brand colour`).not.toBe(c.primary);
    }
  });
});

describe("both themes", () => {
  it("define exactly the same set of tokens", () => {
    expect(Object.keys(THEME_COLORS.dark).sort()).toEqual(Object.keys(THEME_COLORS.light).sort());
  });

  it("write every colour as a 6-digit hex, so the maths above is meaningful", () => {
    for (const [mode, c] of modes) {
      for (const [k, v] of Object.entries(c)) {
        expect(v, `${mode}.${k}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});
