import { describe, it, expect } from "vitest";
import { QUOTES, randomQuote } from "./quotes";

describe("QUOTES", () => {
  it("has text for every entry", () => {
    for (const q of QUOTES) expect(q.text.trim().length).toBeGreaterThan(0);
  });

  it("has no duplicates", () => {
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length);
  });

  it("attributes a quote or marks it a proverb, never leaves it ambiguous", () => {
    for (const q of QUOTES) {
      expect(q.author === undefined || q.author.trim().length > 0).toBe(true);
    }
  });
});

describe("randomQuote", () => {
  it("returns one of the quotes", () => {
    expect(QUOTES).toContain(randomQuote());
  });

  it("picks by the injected random value", () => {
    expect(randomQuote(() => 0)).toBe(QUOTES[0]);
    expect(randomQuote(() => 0.999999)).toBe(QUOTES[QUOTES.length - 1]);
  });

  it("can reach every quote", () => {
    const seen = new Set(QUOTES.map((_, i) => randomQuote(() => i / QUOTES.length)));
    expect(seen.size).toBe(QUOTES.length);
  });

  it("never falls off the end when the generator returns exactly 1", () => {
    expect(QUOTES).toContain(randomQuote(() => 1));
  });
});
