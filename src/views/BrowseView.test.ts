import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const mk = (id: string, level: string, title: string): LibraryItem => ({
  fileId: id, name: title, mimeType: "application/pdf", path: [], webViewLink: "https://drive/" + id,
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: { fileId: id, level, type: "Cours", subject: "", chapter: [], title, description: "", tags: [], order: Number(id) },
});

beforeEach(() => vi.resetModules());

// doMock injects loadLibrary into the fresh module graph (resetModules + dynamic import).
async function mountView(items: LibraryItem[]) {
  vi.doMock("../lib/loadLibrary", () => ({ loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }) }));
  const BrowseView = (await import("./BrowseView.vue")).default;
  const w = mountWithVuetify(BrowseView);
  await flushPromises();
  return w;
}

describe("BrowseView", () => {
  it("groups by level by default (section titles visible)", async () => {
    const w = await mountView([mk("1", "2ème Bac SM", "Mécanique"), mk("2", "1ère Bac", "Optique")]);
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("1ère Bac");
  });

  it("switches to a flat card grid when searching", async () => {
    const w = await mountView([mk("1", "2ème Bac SM", "Mécanique"), mk("2", "1ère Bac", "Optique")]);
    const input = w.get('[data-test="search"] input');
    await input.setValue("Mécanique");
    await flushPromises();
    const cards = w.findAll(".v-card");
    expect(cards.length).toBe(1);
    expect(w.text()).toContain("Mécanique");
  });
});
