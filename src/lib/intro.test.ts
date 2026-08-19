import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { shouldPlayIntro, markIntroPlayed, INTRO_SESSION_KEY, INTRO_DURATION_MS } from "./intro";

function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: reduce,
      media: "",
      addEventListener() {},
      removeEventListener() {},
    })
  );
}

beforeEach(() => {
  sessionStorage.clear();
  mockReducedMotion(false);
});
afterEach(() => vi.unstubAllGlobals());

describe("shouldPlayIntro", () => {
  it("plays on a fresh session", () => {
    expect(shouldPlayIntro()).toBe(true);
  });

  it("does not play once the session flag is set", () => {
    markIntroPlayed();
    expect(shouldPlayIntro()).toBe(false);
  });

  it("does not play when reduced motion is preferred", () => {
    mockReducedMotion(true);
    expect(shouldPlayIntro()).toBe(false);
  });

  it("runs for 1400ms", () => {
    expect(INTRO_DURATION_MS).toBe(1400);
  });
});

describe("markIntroPlayed", () => {
  it("writes the session flag", () => {
    markIntroPlayed();
    expect(sessionStorage.getItem(INTRO_SESSION_KEY)).toBe("1");
  });
});
