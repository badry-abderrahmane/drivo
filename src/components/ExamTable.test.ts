import { describe, it, expect } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify, mountMobileWithVuetify } from "../test/setup";
import ExamTable from "./ExamTable.vue";
import { buildExamTable } from "../lib/examenNational";
import type { LibraryItem } from "../lib/types";

const mk = (fileId: string, title: string): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: {
    fileId, level: ["2ème Bac PC"], type: "Examen National", subject: "Physique & Chimie",
    chapter: ["Dosage acido-basique"], title, description: "", tags: [], order: 0,
  },
});

const items = [
  mk("n", "PC 2025 N"),
  mk("nc", "PC 2025 N CORRIGÉ"),
  mk("ncd", "PC 2025 N CORRIGÉ DÉTAILLÉ"),
  mk("r", "PC 2025 R"),
  mk("old", "PC 2024 N"),
];

async function mountTable(list = items) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
  router.push("/");
  await router.isReady();
  const w = mountWithVuetify(ExamTable, {
    props: { rows: buildExamTable(list, "2ème Bac PC").rows },
    global: { plugins: [router] },
  });
  await flushPromises();
  return { w, router };
}

describe("ExamTable", () => {
  it("heads the table with the two sessions, each split into sujet and corrigé", async () => {
    const { w } = await mountTable();
    const headers = w.findAll("thead tr");
    expect(headers).toHaveLength(2);
    expect(headers[0].text()).toContain("Session Normale");
    expect(headers[0].text()).toContain("Session de rattrapage");
    expect(headers[0].findAll("th")[1].attributes("colspan")).toBe("2");
    expect(headers[1].findAll("th").map((th) => th.text())).toEqual([
      "Sujet", "Corrigé", "Sujet", "Corrigé",
    ]);
  });

  it("puts a labeled link per file in its cell, most recent year first", async () => {
    const { w } = await mountTable();
    const rows = w.findAll("tbody tr");
    expect(rows.map((r) => r.find("td").text())).toEqual(["2025", "2024"]);
    const cells = rows[0].findAll("td");
    expect(cells[1].text()).toContain("Sujet");
    expect(cells[2].findAll('[data-test="exam-link"]').map((b) => b.text())).toEqual([
      "Corrigé",
      "Corrigé détaillé",
    ]);
  });

  it("shows a dash in a cell with no file", async () => {
    const { w } = await mountTable();
    const rattrapageCorrige = w.findAll("tbody tr")[0].findAll("td")[4];
    expect(rattrapageCorrige.text()).toBe("—");
    expect(rattrapageCorrige.findAll('[data-test="exam-link"]')).toHaveLength(0);
  });

  it("opens the document page for the file that was clicked", async () => {
    const { w, router } = await mountTable();
    await w.findAll('[data-test="exam-link"]')[0].trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("doc");
    expect(router.currentRoute.value.params.fileId).toBe("n");
  });
});

/**
 * On a phone the table becomes an accordion, one panel per year.
 *
 * The table's meaning lives in a header that spans "Session normale" and "Session de
 * rattrapage" over Sujet/Corrigé pairs — precisely what horizontal scrolling destroys,
 * since scrolling right takes the year off screen and a Corrigé then belongs to nothing.
 * So the panel has to name both the year and the session itself.
 */
describe("ExamTable on a phone", () => {
  it("replaces the scrolling table with one panel per year", () => {
    const w = mountMobileWithVuetify(ExamTable, { props: { rows: buildExamTable(items, "2ème Bac PC").rows } });
    expect(w.find("table").exists()).toBe(false);
    expect(w.find(".table-scroll").exists()).toBe(false);
    // Stated, not derived from the same call the component was given: comparing a count to
    // itself passes just as happily when both are zero, which is how the first draft of this
    // test "passed" while rendering nothing at all.
    expect(w.findAll('[data-test="exam-panel"]').length).toBe(2);
  });

  it("names both sessions inside the panel, since no column header can", async () => {
    const w = mountMobileWithVuetify(ExamTable, { props: { rows: buildExamTable(items, "2ème Bac PC").rows } });
    await w.find('[data-test="exam-panel"] .v-expansion-panel-title').trigger("click");
    await flushPromises();
    const text = w.text();
    expect(text).toContain("Session normale");
    expect(text).toContain("Session de rattrapage");
    expect(text).toContain("Sujet");
    expect(text).toContain("Corrigé");
  });

  it("still opens a document from inside an expanded panel", async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: "/", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ] });
    router.push("/");
    await router.isReady();
    const w = mountMobileWithVuetify(ExamTable, {
      props: { rows: buildExamTable(items, "2ème Bac PC").rows },
      global: { plugins: [router] },
    });
    await w.find('[data-test="exam-panel"] .v-expansion-panel-title').trigger("click");
    await flushPromises();
    await w.find('[data-test="exam-link"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("doc");
  });
});
