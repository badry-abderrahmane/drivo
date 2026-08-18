import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { mountWithVuetify } from "../test/setup";
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

async function mountMenu(items: LibraryItem[]) {
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
    readFreshCache: () => null,
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
  const w = mountWithVuetify(MenuView, { global: { plugins: [router] } });
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
    expect(w.text()).toContain("Modulation d'amplitude"); // official chapter with no file → still a row
    expect(w.findAll('[data-test="menu-link"]').length).toBe(1); // only the one file
  });

  it("previews a file when a numbered link is clicked", async () => {
    document.body.innerHTML = "";
    const w = await mountMenu([full("1", {})]);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await settle();
    await w.get('[data-test="menu-link"]').trigger("click");
    await flushPromises();
    const iframe = document.querySelector('[data-test="preview-frame"]') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("/file/d/1/preview");
  });
});
