/**
 * A guard for one specific, silent footgun in Vue's scoped-CSS compiler.
 *
 * `:global(.some-ancestor) .local-thing { ... }` does NOT compile to
 * `.some-ancestor .local-thing[data-v-x]`. The compiler keeps the global part and DROPS the
 * descendant, emitting a bare `.some-ancestor { ... }` — a rule that now applies to whatever
 * that ancestor is, usually the app root.
 *
 * This shipped in LandingIntro.vue as `:global(.v-theme--dark) .landing { color: ... }` and
 * became `.v-theme--dark { color: rgb(var(--v-theme-on-primary)) }`. That made near-black
 * green the inherited text colour of the entire app in dark mode: nav icons, filter labels,
 * count chips, tonal chips and the "Ouvrir dans Drive" button all went nearly invisible,
 * while the component that caused it still looked correct. Three separate palettes were
 * rewritten chasing the symptom before anyone read the compiled stylesheet.
 *
 * The fix is to bind a real class on the component root and select on that instead.
 */
import { describe, it, expect } from "vitest";

// eager+raw: every SFC's source text, no component ever mounted.
const sources = import.meta.glob("../**/*.vue", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

describe("scoped component styles", () => {
  it("finds SFCs to check", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
  });

  it("never uses :global() with a descendant selector", () => {
    const offenders: string[] = [];
    for (const [file, src] of Object.entries(sources)) {
      for (const line of src.split("\n")) {
        const t = line.trim();
        if (!t.startsWith(":global(")) continue;
        // Everything after the balanced :global(...) — anything but `{` means a descendant
        // part that the compiler will silently discard.
        const after = t.slice(t.indexOf(")") + 1).trim();
        if (after && !after.startsWith("{")) offenders.push(`${file}: ${t}`);
      }
    }
    expect(offenders, `:global() with a descendant is dropped by the compiler:\n${offenders.join("\n")}`)
      .toEqual([]);
  });
});
