import { describe, it, expect } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "../test/setup";
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
