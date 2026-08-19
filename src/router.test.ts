import { describe, it, expect, afterEach } from "vitest";
import router from "./router";
import type { RouteLocationNormalized } from "vue-router";

const route = (path: string) => ({ path, fullPath: path }) as RouteLocationNormalized;

/** The router's scrollBehavior, configured in ./router. */
const scroll = router.options.scrollBehavior!;

/** jsdom reports scrollHeight 0, so the height gate has to be told what the page is. */
function setPageHeight(px: number): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: px,
    configurable: true,
  });
}

afterEach(() => setPageHeight(0));

describe("scrollBehavior", () => {
  it("starts a new destination at the top", async () => {
    expect(await scroll(route("/doc/1/x"), route("/niveau/2eme-bac-sm"), null)).toEqual({ top: 0 });
  });

  it("starts at the top for a query-only change, since the results are different content", async () => {
    expect(await scroll(route("/?search=ondes"), route("/?search=rlc"), null)).toEqual({ top: 0 });
  });

  it("restores the saved offset on back or forward, once the page can hold it", async () => {
    setPageHeight(4000);
    const saved = { left: 0, top: 840 };
    expect(await scroll(route("/niveau/2eme-bac-sm"), route("/doc/1/x"), saved)).toEqual(saved);
  });

  it("waits for the page to grow before restoring, instead of being clamped", async () => {
    // Too short for the offset: the incoming view has not laid out yet.
    setPageHeight(200);
    let settled = false;
    const pending = Promise.resolve(scroll(route("/"), route("/doc/1/x"), { left: 0, top: 900 })).then(
      (r) => {
        settled = true;
        return r;
      }
    );

    await new Promise((r) => setTimeout(r, 60));
    expect(settled).toBe(false);

    // The list renders and the page becomes tall enough.
    setPageHeight(4000);
    expect(await pending).toEqual({ left: 0, top: 900 });
  });

  it("gives up rather than hanging when the page never grows", async () => {
    setPageHeight(100);
    const saved = { left: 0, top: 5000 };
    const started = Date.now();
    expect(await scroll(route("/"), route("/doc/1/x"), saved)).toEqual(saved);
    // Bounded by RESTORE_TIMEOUT_MS rather than waiting forever.
    expect(Date.now() - started).toBeLessThan(3000);
  }, 5000);
});
