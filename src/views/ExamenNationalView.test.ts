import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const full = (fileId: string, over: Partial<LibraryItem["meta"]>): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: over.title ?? fileId,
  meta: {
    fileId, title: "T " + fileId, level: ["2ème Bac SM"], type: "Examen National", subject: "Physique",
    chapter: ["Ondes mécaniques progressives"], description: "", tags: [], order: 0, ...over,
  },
});

beforeEach(() => vi.resetModules());

async function mountExamenNational(items: LibraryItem[]) {
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
    readFreshCache: () => null,
    fetchSeed: async () => null,
  }));
  const ExamenNationalView = (await import("./ExamenNationalView.vue")).default;
  // The selected level lives in a route param, so this needs a real router in its history.
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "examen-national", component: { template: "<div/>" } },
      { path: "/examen-national/:level", name: "examen-national-level", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
  router.push("/");
  await router.isReady();
  const w = mountWithVuetify(ExamenNationalView, { global: { plugins: [router] } });
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

function cardFor(w: Awaited<ReturnType<typeof mountExamenNational>>, level: string) {
  return w.findAll('[data-test="level-card"]').find((c) => c.text().includes(level))!;
}

describe("ExamenNationalView", () => {
  it("only shows cards for the 3 final-year (2ème Bac) levels", async () => {
    const w = await mountExamenNational([full("1", {})]);
    const cards = w.findAll('[data-test="level-card"]');
    expect(cards).toHaveLength(3);
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("2ème Bac PC");
    expect(w.text()).toContain("2ème Bac SVT");
    expect(w.text()).not.toContain("Tronc Commun");
  });

  it("tabulates the exams of a selected level by year, most recent first", async () => {
    const w = await mountExamenNational([
      full("a", { title: "PC 2023 N" }),
      full("b", { title: "PC 2021 R CORRIGÉ" }),
    ]);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await settle();
    expect(w.text()).toContain("Examen National — 2ème Bac SM");
    const rows = w.findAll('[data-test="exam-row"]');
    expect(rows.map((r) => r.find("td").text())).toEqual(["2023", "2021"]);
    // 2021's only file is a rattrapage corrigé: last cell filled, the three others dashed.
    expect(rows[1].findAll("td").map((td) => td.text())).toEqual(["2021", "—", "—", "—", "Corrigé"]);
  });

  it("keeps exams with no year in a card list under the table", async () => {
    const w = await mountExamenNational([
      full("dated", { title: "PC 2023 N" }),
      full("undated", { title: "Sujet sans année" }),
    ]);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await settle();
    const other = w.find('[data-test="other-exams"]');
    expect(other.exists()).toBe(true);
    expect(other.text()).toContain("Sujet sans année");
  });
});
