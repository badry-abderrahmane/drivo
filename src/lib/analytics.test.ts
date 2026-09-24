import { describe, it, expect, beforeEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { initAnalytics, track } from "./analytics";

const Stub = { template: "<div />" };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: Stub },
      { path: "/menu", name: "menu", component: Stub },
      { path: "/admin", name: "admin", component: Stub },
    ],
  });
}

/** The page_view events queued so far, as [name, params] pairs. */
function pageViews(): Array<Record<string, unknown>> {
  return (window.dataLayer ?? [])
    .map((a) => Array.from(a as ArrayLike<unknown>))
    .filter((a) => a[0] === "event" && a[1] === "page_view")
    .map((a) => a[2] as Record<string, unknown>);
}

beforeEach(() => {
  delete window.dataLayer;
  delete window.gtag;
  document.head.querySelectorAll("script[src*='googletagmanager']").forEach((s) => s.remove());
});

describe("initAnalytics", () => {
  it("does nothing without a measurement id", async () => {
    const router = makeRouter();
    initAnalytics(router, "");
    await router.push("/menu");
    expect(window.gtag).toBeUndefined();
    expect(document.head.querySelector("script[src*='googletagmanager']")).toBeNull();
  });

  it("loads gtag.js and turns off its own page_view", () => {
    initAnalytics(makeRouter(), "G-TEST123");
    const script = document.head.querySelector<HTMLScriptElement>("script[src*='googletagmanager']");
    expect(script?.src).toContain("id=G-TEST123");
    expect(script?.async).toBe(true);
    const config = window.dataLayer!.map((a) => Array.from(a as ArrayLike<unknown>)).find((a) => a[0] === "config");
    expect(config).toEqual(["config", "G-TEST123", { send_page_view: false }]);
  });

  it("sends one page_view per navigation, keyed by path", async () => {
    const router = makeRouter();
    initAnalytics(router, "G-TEST123");
    await router.push("/");
    await router.push("/menu?level=x");
    expect(pageViews().map((p) => p.page_path)).toEqual(["/", "/menu?level=x"]);
  });

  it("leaves the admin page out", async () => {
    const router = makeRouter();
    initAnalytics(router, "G-TEST123");
    await router.push("/admin");
    expect(pageViews()).toEqual([]);
  });

  it("sends the title it is given for the path", async () => {
    const router = makeRouter();
    initAnalytics(router, "G-TEST123", (path) => (path === "/menu" ? "Menu | PIPC" : undefined));
    await router.push("/menu?x=1");
    expect(pageViews()[0].page_title).toBe("Menu | PIPC");
  });
});

describe("track", () => {
  it("is a no-op when analytics never started", () => {
    expect(() => track("file_download", { doc_id: "a" })).not.toThrow();
  });

  it("queues the event once analytics is running", () => {
    initAnalytics(makeRouter(), "G-TEST123");
    track("file_download", { doc_id: "a" });
    const last = Array.from(window.dataLayer!.at(-1) as ArrayLike<unknown>);
    expect(last).toEqual(["event", "file_download", { doc_id: "a" }]);
  });
});
