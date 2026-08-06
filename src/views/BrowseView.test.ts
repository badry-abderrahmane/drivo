import { describe, it, expect, vi, beforeEach } from "vitest";
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
async function mountView(items: LibraryItem[]) {
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
    readFreshCache: () => null, // tests exercise the network path, not the cached one
  }));
  const BrowseView = (await import("./BrowseView.vue")).default;
  const w = mountWithVuetify(BrowseView);
  await flushPromises();
  return w;
}

describe("BrowseView", () => {
  it("groups by level by default (section titles visible)", async () => {
    const w = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")]);
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("1ère Bac");
  });

  it("hides unclassified files from the grouped view, the grid and the search", async () => {
    const w = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), unclassified("2", "Brouillon")]);
    await w.get(".v-expansion-panel-title").trigger("click");
    expect(w.text()).toContain("Mécanique");
    expect(w.text()).not.toContain("Brouillon");

    // Not merely ungrouped — absent from the flat views too.
    await w.get('[data-test="search"] input').setValue("Brouillon");
    await flushPromises();
    expect(w.text()).not.toContain("Brouillon");
    expect(w.text()).toContain("Aucun résultat");
  });

  it("says the library is being prepared when nothing is classified yet", async () => {
    const w = await mountView([unclassified("1", "Brouillon"), unclassified("2", "Autre")]);
    expect(w.get('[data-test="nothing-published"]').text()).toContain("Bibliothèque en préparation");
    // Not the filter-reset empty state — no filter is responsible for this.
    expect(w.text()).not.toContain("Réinitialiser les filtres");
  });

  it("has no standalone hero-level control (level selection lives in FilterBar)", async () => {
    const w = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")]);
    expect(w.find(".level-pill").exists()).toBe(false);
    expect(w.find(".hero-section").exists()).toBe(false);
  });

  it("switches to a flat card grid when searching", async () => {
    const w = await mountView([mk("1", ["2ème Bac SM"], "Mécanique"), mk("2", ["1ère Bac"], "Optique")]);
    const input = w.get('[data-test="search"] input');
    await input.setValue("Mécanique");
    await flushPromises();
    const cards = w.findAll(".v-card");
    expect(cards.length).toBe(1);
    expect(w.text()).toContain("Mécanique");
  });
});
