import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { mountWithVuetify, mountMobileWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const full = (fileId: string, over: Partial<LibraryItem["meta"]>): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: over.title ?? fileId,
  meta: {
    fileId, title: "T " + fileId, level: ["2ème Bac SM"], type: "Cours", subject: "Physique",
    chapter: ["Ondes mécaniques progressives"], description: "", tags: [], order: 0, ...over,
  },
});

beforeEach(() => vi.resetModules());

async function mountMenu(items: LibraryItem[], phone = false) {
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
    readFreshCache: () => null,
    fetchSeed: async () => null,
  }));
  const MenuView = (await import("./MenuView.vue")).default;
  // The selected level lives in a route param, so this needs a real router in its history.
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "menu", component: { template: "<div/>" } },
      { path: "/menu/:level", name: "menu-level", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
  router.push("/");
  await router.isReady();
  const mountFn = phone ? mountMobileWithVuetify : mountWithVuetify;
  const w = mountFn(MenuView, { global: { plugins: [router] } });
  await flushPromises();
  return w;
}

// A route-query navigation resolves through a microtask, and Vuetify's transition
// needs a real timer tick (not just a flushed microtask queue) before the new content lands.
async function settle(): Promise<void> {
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
}

function cardFor(w: Awaited<ReturnType<typeof mountMenu>>, level: string) {
  return w.findAll('[data-test="level-card"]').find((c) => c.text().includes(level))!;
}

describe("MenuView", () => {
  it("always shows a card for every official level", async () => {
    const w = await mountMenu([full("1", {})]);
    const cards = w.findAll('[data-test="level-card"]');
    expect(cards).toHaveLength(6);
    expect(w.text()).toContain("Tronc Commun");
    expect(w.text()).toContain("2ème Bac SM");
  });

  it("opens the full program as rows, filling cells and leaving others empty", async () => {
    const w = await mountMenu([full("1", { chapter: ["Ondes mécaniques progressives"] })]);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await settle();
    expect(w.text()).toContain("Menu thématique — 2ème Bac SM");
    // full program rows present, incl. a chapter with no file
    expect(w.text()).toContain("Ondes mécaniques progressives");
    // official chapter with no file → still a row
    expect(w.text()).toContain("Ondes électromagnétiques - Modulation et démodulation d'amplitude");
    expect(w.findAll('[data-test="menu-link"]').length).toBe(1); // only the one file
  });

  it("navigates to the document page when a numbered link is clicked", async () => {
    const w = await mountMenu([full("1", { title: "Ondes — Cours" })]);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await settle();
    await w.get('[data-test="menu-link"]').trigger("click");
    await settle();
    const route = w.vm.$router.currentRoute.value;
    expect(route.name).toBe("doc");
    expect(route.params.fileId).toBe("1");
  });
});

/**
 * On a phone the chapters x types matrix becomes an accordion, one panel per chapter.
 *
 * A grid that wide cannot be read at phone size, and the horizontal scroll it needed took
 * whole type columns off screen with nothing to say they were there. The panel shows only
 * the types that actually hold a document.
 */
describe("MenuView on a phone", () => {
  it("replaces the scrolling matrix with one panel per chapter", async () => {
    const w = await mountMenu([full("1", { chapter: ["Ondes mécaniques progressives"] })], true);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await settle();
    expect(w.find("table").exists()).toBe(false);
    expect(w.find(".table-scroll").exists()).toBe(false);
    // The official program for this level, so: many chapters, each its own panel.
    expect(w.findAll('[data-test="menu-panel"]').length).toBeGreaterThan(5);
    expect(w.text()).toContain("Ondes mécaniques progressives");
  });

  it("lists only the types that hold a document, and still opens one", async () => {
    const w = await mountMenu([full("1", { chapter: ["Ondes mécaniques progressives"], type: "Cours" })], true);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await settle();
    const panel = w.findAll('[data-test="menu-panel"]')
      .find((p) => p.text().includes("Ondes mécaniques progressives"))!;
    await panel.find(".v-expansion-panel-title").trigger("click");
    await settle();
    expect(panel.text()).toContain("Cours");
    // The types with nothing in them are omitted rather than shown as dashes.
    expect(panel.text()).not.toContain("Vidéo");

    await w.get('[data-test="menu-link"]').trigger("click");
    await settle();
    expect(w.vm.$router.currentRoute.value.name).toBe("doc");
  });
});
