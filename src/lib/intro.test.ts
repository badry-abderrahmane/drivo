import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  shouldPlayIntro,
  markIntroPlayed,
  shouldShowLanding,
  markLandingSeen,
  INTRO_SESSION_KEY,
  INTRO_DURATION_MS,
  LANDING_SESSION_KEY,
  LANDING_ROUTE,
} from "./intro";

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

describe("shouldShowLanding", () => {
  it("shows on the home route in a fresh session", () => {
    expect(shouldShowLanding(LANDING_ROUTE)).toBe(true);
  });

  it("never gates a deep link", () => {
    // The case that matters: a search result for a document must open the document.
    for (const route of ["doc", "menu", "examen-national", "level", "chapter", "admin"]) {
      expect(shouldShowLanding(route), route).toBe(false);
    }
  });

  it("does not show once dismissed in this session", () => {
    markLandingSeen();
    expect(shouldShowLanding(LANDING_ROUTE)).toBe(false);
  });

  it("does not show when reduced motion is preferred", () => {
    mockReducedMotion(true);
    expect(shouldShowLanding(LANDING_ROUTE)).toBe(false);
  });

  it("does not show when the route has no name yet", () => {
    expect(shouldShowLanding(undefined)).toBe(false);
    expect(shouldShowLanding(null)).toBe(false);
  });

  it("fails closed when session storage throws", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(shouldShowLanding(LANDING_ROUTE)).toBe(false);
    getItem.mockRestore();
  });
});

describe("markLandingSeen", () => {
  it("writes its own flag, leaving the splash's alone", () => {
    markLandingSeen();
    expect(sessionStorage.getItem(LANDING_SESSION_KEY)).toBe("1");
    expect(sessionStorage.getItem(INTRO_SESSION_KEY)).toBeNull();
  });

  it("survives storage that refuses to write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markLandingSeen()).not.toThrow();
    setItem.mockRestore();
  });
});
