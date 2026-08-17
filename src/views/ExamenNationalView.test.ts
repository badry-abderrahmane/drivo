import { describe, it, expect, vi, beforeEach } from "vitest";
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
  }));
  const ExamenNationalView = (await import("./ExamenNationalView.vue")).default;
  const w = mountWithVuetify(ExamenNationalView);
  await flushPromises();
  return w;
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

  it("groups exams by year within a selected level", async () => {
    const w = await mountExamenNational([
      full("a", { title: "Sujet PC 2023" }),
      full("b", { title: "Sujet PC 2021" }),
    ]);
    await cardFor(w, "2ème Bac SM").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Examen National — 2ème Bac SM");
    const groups = w.findAll('[data-test="year-group"]');
    expect(groups.map((g) => g.text().includes("2023"))).toContain(true);
    expect(groups[0].text()).toContain("2023"); // most recent first
  });
});
