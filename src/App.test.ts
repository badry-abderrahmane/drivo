import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "./test/setup";
import App from "./App.vue";
import { AUTHOR_NAME, AUTHOR_ROLE } from "./config";
import { LANDING_SESSION_KEY } from "./lib/intro";

function mockReducedMotion(reduce: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: reduce, media: "", addEventListener() {}, removeEventListener() {},
    })
  );
}

beforeEach(() => {
  sessionStorage.clear();
  mockReducedMotion(false);
});
afterEach(() => vi.unstubAllGlobals());

async function mountApp(path = "/") {
  const router = createRouter({
    history: createMemoryHistory(),
    // The header links to these by name, so every one the app bar references has to exist
    // or VBtn's useLink throws while resolving the :to.
    routes: [
      { path: "/", name: "browse", component: { template: "<div>page</div>" } },
      { path: "/doc/:fileId", name: "doc", component: { template: "<div/>" } },
      { path: "/menu", name: "menu", component: { template: "<div/>" } },
      { path: "/examen-national", name: "examen-national", component: { template: "<div/>" } },
      { path: "/admin", name: "admin", component: { template: "<div/>" } },
    ],
  });
  router.push(path);
  await router.isReady();
  const w = mountWithVuetify(App, { global: { plugins: [router] } });
  await flushPromises();
  return w;
}

describe("App footer", () => {
  it("keeps the site copyright", async () => {
    const w = await mountApp();
    expect(w.text()).toContain("PIPC — Portail Interactif de Physique-Chimie");
  });

  it("signs off with the teacher, once, in the footer", async () => {
    const w = await mountApp();
    // Scoped to the footer: the landing carries its own copy while it is up, and the two
    // are never on screen together — it covers the page it is sitting on.
    const credit = w.findAll('.app-footer [data-test="author-credit"]');
    expect(credit).toHaveLength(1);
    expect(credit[0].text()).toContain(`M. ${AUTHOR_NAME}`);
    expect(credit[0].text()).toContain(AUTHOR_ROLE);
  });

  it("leaves exactly one credit on the page once the landing is gone", async () => {
    sessionStorage.setItem(LANDING_SESSION_KEY, "1");
    const w = await mountApp();
    expect(w.findAll('[data-test="author-credit"]')).toHaveLength(1);
  });

  it("carries no second, hard-coded copy of the credit line", async () => {
    const w = await mountApp();
    expect(w.find('[data-test="footer-credit"]').exists()).toBe(false);
  });
});

describe("the app bar", () => {
  it("wears the emblem, hidden from assistive tech", async () => {
    // "PIPC" sits beside it as real text, so announcing the image too would say it twice.
    const w = await mountApp();
    const mark = w.get('[data-test="brand-mark"]');
    expect(mark.attributes("src")).toBe("/pipc-badge.png");
    expect(mark.attributes("aria-hidden")).toBe("true");
    expect(mark.attributes("alt")).toBe("");
  });

  it("keeps the class the opening flight measures", async () => {
    // flyTo() looks the header mark up by this class; renaming it silently breaks the
    // landing's exit into a jump cut.
    const w = await mountApp();
    expect(w.get('[data-test="brand-mark"]').classes()).toContain("header-mark");
  });
});

describe("the landing gate", () => {
  it("greets a fresh visitor on the home route", async () => {
    const w = await mountApp("/");
    expect(w.find('[data-test="landing"]').exists()).toBe(true);
  });

  it("tells the gate to wait while the shell splash is still covering it", async () => {
    // The gate mounts *under* the splash on purpose — the opening flight needs its emblem
    // to land on — so it must be told not to start typing, counting or listening for keys
    // until the curtain is actually gone.
    const splash = document.createElement("div");
    splash.id = "pipc-splash";
    document.body.appendChild(splash);
    try {
      const w = await mountApp("/");
      expect(w.getComponent({ name: "LandingIntro" }).props("ready")).toBe(false);
    } finally {
      splash.remove();
    }
  });

  it("wakes the gate when there was no splash to wait for", async () => {
    const w = await mountApp("/");
    expect(w.getComponent({ name: "LandingIntro" }).props("ready")).toBe(true);
  });

  it("appears even though main.ts mounts before the router has resolved", async () => {
    // Regression: main.ts is `createApp(App).use(router).mount()` with no isReady() await,
    // so at setup the route is still START_LOCATION — name undefined. Deciding straight
    // from route.name there means the gate never appears in production, while every test
    // that awaits isReady() before mounting passes happily.
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "browse", component: { template: "<div/>" } },
        { path: "/doc/:fileId", name: "doc", component: { template: "<div/>" } },
        { path: "/menu", name: "menu", component: { template: "<div/>" } },
        { path: "/examen-national", name: "examen-national", component: { template: "<div/>" } },
        { path: "/admin", name: "admin", component: { template: "<div/>" } },
      ],
    });
    // Production's boot order: mount without awaiting the router, exactly as main.ts does.
    router.push("/");
    const w = mountWithVuetify(App, { global: { plugins: [router] } });

    // The heart of it: at setup the route still has no name, so anything that reads
    // route.name here decides "no landing" and can never change its mind.
    expect(w.vm.$route.name).toBeUndefined();

    // Then the boot navigation lands, as it does on its own in a browser.
    await router.isReady();
    await flushPromises();

    expect(w.vm.$route.name).toBe("browse");
    expect(w.find('[data-test="landing"]').exists()).toBe(true);
  });

  it("never stands between a search result and its document", async () => {
    // 633 prerendered document pages exist for Google. A gate on them would put a click
    // between a search hit and the thing the student came for.
    const w = await mountApp("/doc/abc");
    expect(w.find('[data-test="landing"]').exists()).toBe(false);
  });

  it("stays away once it has been dismissed this session", async () => {
    sessionStorage.setItem(LANDING_SESSION_KEY, "1");
    const w = await mountApp("/");
    expect(w.find('[data-test="landing"]').exists()).toBe(false);
  });

  it("stays away for a visitor who asked for reduced motion", async () => {
    mockReducedMotion(true);
    const w = await mountApp("/");
    expect(w.find('[data-test="landing"]').exists()).toBe(false);
  });

  it("remembers the dismissal and clears itself out of the way", async () => {
    vi.useFakeTimers();
    const w = await mountApp("/");
    await w.get('[data-test="landing-start"]').trigger("click");

    expect(sessionStorage.getItem(LANDING_SESSION_KEY)).toBe("1");
    await vi.advanceTimersByTimeAsync(700);
    expect(w.find('[data-test="landing"]').exists()).toBe(false);
    vi.useRealTimers();
  });

  it("does not raise the gate again when the visitor navigates home", async () => {
    // The landing answers "how did you arrive", not "where are you now" — recomputing it
    // per navigation would gate every click on the logo.
    vi.useFakeTimers();
    const w = await mountApp("/");
    await w.get('[data-test="landing-start"]').trigger("click");
    await vi.advanceTimersByTimeAsync(700);
    vi.useRealTimers();

    const router = w.vm.$router;
    await router.push("/doc/abc");
    await flushPromises();
    await router.push("/");
    await flushPromises();

    expect(w.find('[data-test="landing"]').exists()).toBe(false);
  });
});
