import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const full = (fileId: string, over: Partial<LibraryItem["meta"]>): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: over.title ?? fileId,
  meta: {
    fileId, title: "T " + fileId, level: "2ème Bac SM", type: "Cours", subject: "Physique",
    chapter: ["Ondes mécaniques progressives"], description: "", tags: [], order: 0, ...over,
  },
});

beforeEach(() => vi.resetModules());

async function mountMenu(items: LibraryItem[]) {
  vi.doMock("../lib/loadLibrary", () => ({ loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }) }));
  const MenuView = (await import("./MenuView.vue")).default;
  const w = mountWithVuetify(MenuView);
  await flushPromises();
  return w;
}

describe("MenuView", () => {
  it("shows a card only for levels with qualifying files", async () => {
    const w = await mountMenu([
      full("1", {}),                                     // 2ème Bac SM, qualifies
      { ...full("2", { level: "2ème Bac PC" }), meta: { ...full("2", { level: "2ème Bac PC" }).meta, title: "" } }, // under-tagged
    ]);
    const cards = w.findAll('[data-test="level-card"]');
    expect(cards).toHaveLength(1);
    expect(w.text()).toContain("2ème Bac SM");
  });

  it("opens the level table with theme names and numbered links on click", async () => {
    const w = await mountMenu([full("1", {}), full("2", { chapter: ["Dipôle RC"] })]);
    await w.get('[data-test="level-card"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Menu thématique — 2ème Bac SM");
    expect(w.text()).toContain("Ondes mécaniques progressives");
    expect(w.text()).toContain("Dipôle RC");
    expect(w.findAll('[data-test="menu-link"]').length).toBeGreaterThan(0);
  });

  it("previews a file when a numbered link is clicked", async () => {
    document.body.innerHTML = "";
    const w = await mountMenu([full("1", {})]);
    await w.get('[data-test="level-card"]').trigger("click");
    await flushPromises();
    await w.get('[data-test="menu-link"]').trigger("click");
    await flushPromises();
    const iframe = document.querySelector('[data-test="preview-frame"]') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("/file/d/1/preview");
  });
});
