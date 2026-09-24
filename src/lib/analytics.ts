import type { Router } from "vue-router";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** Routes left out of the numbers: the professor's own tooling is not audience. */
const UNTRACKED_ROUTES = new Set(["admin"]);

/**
 * Google Analytics 4 for a single-page app. gtag.js only counts the page it was loaded on,
 * so its automatic page_view is switched off and one is sent per router navigation
 * instead — otherwise every visit would read as a single page, whatever the student opened.
 *
 * Injected at runtime rather than written into index.html: the prerender copies that shell
 * into ~1100 static pages, and a tag there would also fire for every crawler that renders.
 */
export function initAnalytics(
  router: Router,
  measurementId: string,
  titleFor: (path: string) => string | undefined = () => undefined,
  doc: Document = document
): void {
  if (!measurementId) return;

  const w = doc.defaultView as Window;
  w.dataLayer = w.dataLayer || [];
  // gtag.js reads the `arguments` object off the queue, not an array, so this must stay a
  // plain function rather than a rest-args arrow.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", measurementId, { send_page_view: false });

  const script = doc.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  doc.head.appendChild(script);

  router.afterEach((to, _from, failure) => {
    if (failure) return;
    if (typeof to.name === "string" && UNTRACKED_ROUTES.has(to.name)) return;
    // The title is resolved here, not read off document.title: App.vue retitles the tab in
    // a watcher that runs after this hook, so the tab would still carry the previous page's.
    // Undefined (library not loaded yet) lets gtag fall back to the prerendered title.
    w.gtag!("event", "page_view", {
      page_path: to.fullPath,
      page_location: w.location.origin + to.fullPath,
      page_title: titleFor(to.path),
    });
  });
}

/**
 * One named event, e.g. a download. A no-op wherever analytics never started — dev, tests,
 * or an empty measurement ID — so callers need not check.
 */
export function track(event: string, params: Record<string, unknown> = {}): void {
  window.gtag?.("event", event, params);
}
