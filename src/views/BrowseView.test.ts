import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const base = (id: string, title: string) => ({
  fileId: id, name: title, mimeType: "application/pdf", path: [],
  webViewLink: "https://drive/" + id, modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false, displayTitle: title,
});

/** A fully classified file — the only kind students are meant to see. */
const mk = (id: string, level: string[], title: string): LibraryItem => ({
  ...base(id, title),
  meta: {
    fileId: id, level, type: "Cours", subject: "Physique", chapter: [title],
    title, description: "", tags: [], order: Number(id),
  },
});

/** A file still missing its classification fields. */
const unclassified = (id: string, title: string): LibraryItem => ({
  ...base(id, title),
  meta: {
    fileId: id, level: [], type: "", subject: "", chapter: [],
    title, description: "", tags: [], order: Number(id),
  },
});

beforeEach(() => vi.resetModules());

// doMock injects loadLibrary into the fresh module graph (resetModules + dynamic import).
// `initialSearch` simulates arriving from the search palette's "Voir tous les résultats"
// link, which lands on / with ?search= already in the URL — BrowseView has no search box
// of its own anymore, so that's the only way this page's search state gets set.
async function mountView(items: LibraryItem[], initialSearch?: string) {
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
    readFreshCache: () => null, // tests exercise the network path, not the cached one
    fetchSeed: async () => null, // nor the build-time seed
  }));
  const BrowseView = (await import("./BrowseView.vue")).default;
  // UnfoldingCards (rendered inside BrowseView) reads/writes its drill-down position
  // via the route query, so it needs a real router in its history.
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "browse", component: { template: "<div/>" } },
      { path: "/niveau/:level", name: "level", component: { template: "<div/>" } },
      { path: "/niveau/:level/chapitre/:chapter", name: "chapter", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
  router.push(initialSearch ? { path: "/", query: { search: initialSearch } } : "/");
  await router.isReady();
  const w = mountWithVuetify(BrowseView, { global: { plugins: [router] } });
  await flushPromises();
  return { w, router };
}

// A route-query navigation resolves through a microtask, and Vuetify's out-in transition
// needs a real timer tick (not just a flushed microtask queue) before the new step's DOM
// lands. flushPromises() alone leaves the old step still rendered.
async function settle(): Promise<void> {
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
}

describe("BrowseView", () => {
  it("shows a level card per niveau by default (UnfoldingCards)", async () => {
    const { w } = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")]);
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("1ère Bac");
  });

  it("hides unclassified files from browsing (level -> chapter)", async () => {
    const { w } = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), unclassified("2", "Brouillon")]);
    // Excluded from `published` before UnfoldingCards ever sees it.
    expect(w.text()).not.toContain("Brouillon");

    await w.get('[data-test="unfold-level-2ème Bac SM"]').trigger("click");
    await settle();
    expect(w.text()).toContain("Mécanique");
    expect(w.text()).not.toContain("Brouillon");
  });

  it("hides unclassified files from search results too", async () => {
    // Arriving with ?search= already set, as the search palette's "Voir tous les
    // résultats" link does — not merely excluded from browsing, absent here too.
    const { w } = await mountView(
      [mk("1", ["2ème Bac SM"], "Mécanique"), unclassified("2", "Brouillon")],
      "Brouillon"
    );
    expect(w.text()).not.toContain("Brouillon");
    expect(w.text()).toContain("Aucun résultat");
  });

  it("says the library is being prepared when nothing is classified yet", async () => {
    const { w } = await mountView([unclassified("1", "Brouillon"), unclassified("2", "Autre")]);
    expect(w.get('[data-test="nothing-published"]').text()).toContain("Bibliothèque en préparation");
    // Not the filter-reset empty state — no filter is responsible for this.
    expect(w.text()).not.toContain("Réinitialiser les filtres");
  });

  it("has no standalone hero-level control (level selection lives in FilterBar)", async () => {
    const { w } = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")]);
    expect(w.find(".level-pill").exists()).toBe(false);
    expect(w.find(".hero-section").exists()).toBe(false);
  });

  it("shows a flat card grid, pre-filtered, when arriving with ?search=", async () => {
    const { w } = await mountView(
      [mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")],
      "Mécanique"
    );
    const cards = w.findAll(".v-card");
    expect(cards.length).toBe(1);
    expect(w.text()).toContain("Mécanique");
  });

  it("switches to the flat filtered grid when ?search= changes while already mounted", async () => {
    // Regression: the browse route stays mounted across a query-only navigation (e.g.
    // clicking the search palette's "Voir tous les résultats" link while already on this
    // page) — setup()-time-only seeding would silently miss this.
    const { w, router } = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")]);
    expect(w.text()).toContain("Choisissez votre Niveau");

    await router.push({ path: "/", query: { search: "Mécanique" } });
    await flushPromises();

    expect(w.text()).not.toContain("Choisissez votre Niveau");
    const cards = w.findAll(".v-card");
    expect(cards.length).toBe(1);
    expect(w.text()).toContain("Mécanique");
  });
});
