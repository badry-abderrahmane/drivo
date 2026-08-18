import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import FilterControlsPanel from "./FilterControlsPanel.vue";
import type { LibraryItem } from "../lib/types";
import type { Filters } from "../lib/filter";

const mk = (id: string, level: string[], type: string): LibraryItem => ({
  fileId: id, name: id, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level, type, subject: "", chapter: [], title: "", description: "", tags: [], order: 0 },
});
const items = [mk("1", ["2ème Bac SM"], "Cours"), mk("2", ["1ère Bac"], "Exercices")];

const withChapter = (id: string, level: string[], chapter: string): LibraryItem => ({
  fileId: id, name: id, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level, type: "Cours", subject: "", chapter: [chapter], title: "", description: "", tags: [], order: 0 },
});
const chapterItems = [
  withChapter("a", ["2ème Bac SM"], "Mécanique"),
  withChapter("b", ["1ère Bac"], "Optique"),
];

const withSubject = (id: string, level: string[], subject: string, chapter: string): LibraryItem => ({
  fileId: id, name: id, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level, type: "Cours", subject, chapter: [chapter], title: "", description: "", tags: [], order: 0 },
});
const subjectItems = [
  withSubject("a", ["2ème Bac SM"], "Physique", "Mécanique"),
  withSubject("b", ["2ème Bac SM"], "Chimie", "Acides et bases"),
  withSubject("c", ["1ère Bac"], "Physique", "Optique"),
];

describe("FilterControlsPanel", () => {
  it("emits the selected level when a Niveau quick-pill is clicked", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    await w.get('[data-test="level-2ème Bac SM"]').trigger("click");
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBe("2ème Bac SM");
  });

  it("clears the level when the Niveau 'Tous' pill is clicked", async () => {
    const w = mountWithVuetify(FilterControlsPanel, {
      props: { items, modelValue: { level: "2ème Bac SM" } as Filters },
    });
    await w.get('[data-test="level-all"]').trigger("click");
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBeUndefined();
  });

  it("no longer shows Niveau or Type selects in Filtres avancés (covered by quick pills)", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    const toggle = w.findAll("button").find((b) => b.text().includes("Filtres avancés"))!;
    await toggle.trigger("click");
    const labels = w.findAll("label").map((l) => l.text());
    expect(labels).not.toContain("Niveau");
    expect(labels).not.toContain("Type");
    expect(labels).toContain("Matière");
    expect(labels).toContain("Chapitre");
  });

  it("narrows Chapitre options to the selected Niveau's chapters", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items: chapterItems, modelValue: {} as Filters } });
    const chapterSelect = () => w.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === "Chapitre")!;

    await w.findAll("button").find((b) => b.text().includes("Filtres avancés"))!.trigger("click");
    expect(chapterSelect().props("items")).toEqual(["Mécanique", "Optique"]);

    await w.get('[data-test="level-2ème Bac SM"]').trigger("click");
    expect(chapterSelect().props("items")).toEqual(["Mécanique"]);
  });

  it("clears an already-selected chapter that no longer matches the new Niveau", async () => {
    const w = mountWithVuetify(FilterControlsPanel, {
      props: { items: chapterItems, modelValue: { level: "1ère Bac", chapter: "Optique" } as Filters },
    });
    await w.get('[data-test="level-2ème Bac SM"]').trigger("click");
    const events = w.emitted("update:modelValue") as Filters[][];
    const last = events[events.length - 1][0];
    expect(last.level).toBe("2ème Bac SM");
    expect(last.chapter).toBeUndefined();
  });
  it("narrows Chapitre options to the selected Matière's chapters", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items: subjectItems, modelValue: {} as Filters } });
    const select = (label: string) =>
      w.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === label)!;

    await w.findAll("button").find((b) => b.text().includes("Filtres avancés"))!.trigger("click");
    expect(select("Chapitre").props("items")).toEqual(["Acides et bases", "Mécanique", "Optique"]);

    select("Matière").vm.$emit("update:modelValue", "Physique");
    await w.vm.$nextTick();
    expect(select("Chapitre").props("items")).toEqual(["Mécanique", "Optique"]);
  });

  it("narrows Chapitre options by Niveau and Matière together", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items: subjectItems, modelValue: {} as Filters } });
    const select = (label: string) =>
      w.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === label)!;

    await w.findAll("button").find((b) => b.text().includes("Filtres avancés"))!.trigger("click");
    select("Matière").vm.$emit("update:modelValue", "Physique");
    await w.get('[data-test="level-2ème Bac SM"]').trigger("click");

    expect(select("Chapitre").props("items")).toEqual(["Mécanique"]);
  });

  it("clears an already-selected chapter that no longer matches the new Matière", async () => {
    const w = mountWithVuetify(FilterControlsPanel, {
      props: { items: subjectItems, modelValue: { subject: "Physique", chapter: "Mécanique" } as Filters },
    });
    await w.findAll("button").find((b) => b.text().includes("Filtres avancés"))!.trigger("click");

    w.findAllComponents({ name: "VSelect" })
      .find((c) => c.props("label") === "Matière")!
      .vm.$emit("update:modelValue", "Chimie");
    await w.vm.$nextTick();

    const events = w.emitted("update:modelValue") as Filters[][];
    const last = events[events.length - 1][0];
    expect(last.subject).toBe("Chimie");
    expect(last.chapter).toBeUndefined();
  });
});
