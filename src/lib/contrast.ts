/**
 * WCAG contrast maths, so the theme can be checked by measurement rather than by eye.
 *
 * This exists because eyeballing a colour is not reliable at the margins, twice over: the
 * recoloured `outline` token once looked right and measured 2.96:1 against white, under
 * the 3:1 a border needs, and a tonal chip on a tinted panel once separated from that
 * panel by 1.20:1 — the same as the unselected chip beside it, which erased the selected
 * state entirely. Both shipped through review looking fine. See theme.test.ts.
 *
 * Formulae: WCAG 2.1 relative luminance and contrast ratio.
 */

const channels = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** WCAG relative luminance: 0 for black, 1 for white. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio between two opaque colours, from 1:1 (identical) to 21:1 (black on
 * white). Symmetric — which one is the foreground makes no difference.
 */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * A translucent colour composited onto an opaque backdrop, as an opaque hex.
 *
 * Needed because the things most likely to fail are not solid: Vuetify's tonal variant
 * paints a wash of its colour over whatever is behind it, so the real question is never
 * "chip against surface" but "chip against the panel the chip is actually sitting on".
 */
export function overlay(color: string, backdrop: string, alpha: number): string {
  const f = channels(color);
  const b = channels(backdrop);
  return (
    "#" +
    f
      .map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0"))
      .join("")
  );
}
