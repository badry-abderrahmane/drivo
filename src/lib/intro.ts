/**
 * The opening animation: shown once per browsing session, never to a visitor who asked
 * for reduced motion. The same three conditions are duplicated in the inline script in
 * index.html — that copy has to run before the bundle loads, which is the whole point of
 * the splash. Keep the two in step.
 */

export const INTRO_SESSION_KEY = "pipc:intro-played";

/** How long the splash holds before its exit begins. */
export const INTRO_DURATION_MS = 1400;

/** The exit itself: fade plus the flight into the header mark. */
export const INTRO_EXIT_MS = 380;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldPlayIntro(): boolean {
  if (prefersReducedMotion()) return false;
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === null;
  } catch {
    // Private-mode storage failures must never cost the visitor the app.
    return false;
  }
}

export function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
  } catch {
    /* unavailable — the intro simply replays next load */
  }
}
