import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const full = (fileId: string, over: Partial<LibraryItem["meta"]> = {}, title = "Dipôle RC — Cours"): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: {
    fileId, title: "", level: ["2ème Bac SM"], type: "Cours", subject: "Physique",
    chapter: ["Dipôle RC"], description: "", tags: [], order: 0, ...over,
  },
});

beforeEach(() => vi.resetModules());

async function mountDoc(items: LibraryItem[], fileId: string, opts: { pending?: boolean } = {}) {
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: opts.pending
      ? vi.fn().mockReturnValue(new Promise(() => {}))
      : vi.fn().mockResolvedValue({ items, stale: false }),
    readFreshCache: () => null,
  }));
  const DocView = (await import("./DocView.vue")).default;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "browse", component: { template: "<div/>" } },
      { path: "/niveau/:level", name: "level", component: { template: "<div/>" } },
      { path: "/niveau/:level/chapitre/:chapter", name: "chapter", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
  router.push({ name: "doc", params: { fileId } });
  await router.isReady();
  const w = mountWithVuetify(DocView, { global: { plugins: [router] } });
  await flushPromises();
  return w;
}

describe("DocView", () => {
  it("renders the document title and metadata", async () => {
    const w = await mountDoc([full("a")], "a");
    expect(w.text()).toContain("Dipôle RC — Cours");
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("Physique");
  });

  it("embeds the Drive preview for the document", async () => {
    const w = await mountDoc([full("a")], "a");
    expect(w.find('[data-test="doc-frame"]').attributes("src")).toBe(
      "https://drive.google.com/file/d/a/preview"
    );
  });

  it("offers a download link", async () => {
    const w = await mountDoc([full("a")], "a");
    expect(w.find('[data-test="doc-download"]').attributes("href")).toBe(
      "https://drive.google.com/uc?export=download&id=a"
    );
  });

  it("shows a skeleton while the library loads", async () => {
    const w = await mountDoc([], "a", { pending: true });
    expect(w.find('[data-test="doc-skeleton"]').exists()).toBe(true);
  });

  it("shows not-found for an unknown id", async () => {
    const w = await mountDoc([full("a")], "zzz");
    expect(w.find('[data-test="doc-not-found"]').exists()).toBe(true);
  });

  it("shows not-found for an unclassified document", async () => {
    const w = await mountDoc([full("a", { chapter: [] })], "a");
    expect(w.find('[data-test="doc-not-found"]').exists()).toBe(true);
  });

  it("lists related documents from the same chapter", async () => {
    const w = await mountDoc([full("a"), full("b", {}, "Dipôle RC — Exercices")], "a");
    expect(w.findAll('[data-test="doc-related"]').length).toBe(1);
  });
});
