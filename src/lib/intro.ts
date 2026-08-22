/**
 * The opening animation: shown once per browsing session, never to a visitor who asked
 * for reduced motion. The same three conditions are duplicated in the inline script in
 * index.html — that copy has to run before the bundle loads, which is the whole point of
 * the splash. Keep the two in step.
 */

export const INTRO_SESSION_KEY = "pipc:intro-played";

/** The landing gate is a separate memory: dismissing it is a choice, the splash is not. */
export const LANDING_SESSION_KEY = "pipc:landing-seen";

/**
 * The only route the landing gates. Deep links must never sit behind it — 633 prerendered
 * document pages exist for search engines, and a student arriving on one from Google wants
 * the document, not a welcome screen.
 */
export const LANDING_ROUTE = "browse";

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

/**
 * Whether to show the landing screen for the route being rendered.
 *
 * Three conditions, same shape as the splash above: the home route only, once per browsing
 * session, never to a visitor who asked for reduced motion. The content the landing carries
 * is not lost in that last case — the credit is in the footer and the counts are on the page.
 */
export function shouldShowLanding(routeName: unknown): boolean {
  if (routeName !== LANDING_ROUTE) return false;
  if (prefersReducedMotion()) return false;
  try {
    return sessionStorage.getItem(LANDING_SESSION_KEY) === null;
  } catch {
    // Private-mode storage failures must never cost the visitor the app: fail closed, so a
    // gate that cannot remember being dismissed is never raised in the first place.
    return false;
  }
}

export function markLandingSeen(): void {
  try {
    sessionStorage.setItem(LANDING_SESSION_KEY, "1");
  } catch {
    /* unavailable — the landing simply reappears next load */
  }
}
