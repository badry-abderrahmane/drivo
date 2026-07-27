import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const mk = (id: string, type: string, title: string): LibraryItem => ({
  fileId: id, name: title, mimeType: "application/pdf", path: [], webViewLink: "https://drive/" + id,
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: { fileId: id, level: "2ème Bac SM", type, subject: "", chapter: "", title, description: "", tags: [], order: Number(id) },
});

beforeEach(() => vi.resetModules());

// doMock injects loadLibrary into the fresh module graph (resetModules + dynamic import);
// spyOn would not reach the freshly-imported copy used by useLibrary.
async function mountView(items: LibraryItem[]) {
  vi.doMock("../lib/loadLibrary", () => ({ loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }) }));
  const BrowseView = (await import("./BrowseView.vue")).default;
  const w = mountWithVuetify(BrowseView);
  await flushPromises();
  return w;
}

describe("BrowseView", () => {
  it("renders a card per item once loaded", async () => {
    const w = await mountView([mk("1", "Cours", "Mécanique"), mk("2", "Exercices", "TD1")]);
    expect(w.text()).toContain("Mécanique");
    expect(w.text()).toContain("TD1");
  });

  it("paginates to items-per-page (24)", async () => {
    const many = Array.from({ length: 30 }, (_, i) => mk(String(i + 1), "Cours", "Doc " + (i + 1)));
    const w = await mountView(many);
    const cards = w.findAll(".v-card");
    expect(cards.length).toBeLessThanOrEqual(24);
    expect(cards.length).toBeGreaterThan(0);
  });
});
