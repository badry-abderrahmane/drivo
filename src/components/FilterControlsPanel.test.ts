import { describe, it, expect } from "vitest";
import { flushPromises } from "@vue/test-utils";
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

type Panel = ReturnType<typeof mountWithVuetify>;
const select = (w: Panel, label: string) =>
  w.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === label)!;

describe("FilterControlsPanel", () => {
  it("offers the four filters as selects, with no chips and no advanced toggle", () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    const labels = w.findAllComponents({ name: "VSelect" }).map((c) => c.props("label"));
    expect(labels).toEqual(["Niveau", "Type", "Matière", "Chapitre"]);
    expect(w.findAll(".v-chip")).toHaveLength(0);
    expect(w.text()).not.toContain("Filtres avancés");
  });

  it("keeps the four selects on one non-wrapping line", () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    const row = w.get(".d-flex.flex-nowrap");
    expect(row.findAllComponents({ name: "VSelect" })).toHaveLength(4);
  });

  it("lists every level and type it can see", () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    expect(select(w, "Niveau").props("items")).toEqual(["1ère Bac", "2ème Bac SM"]);
    expect(select(w, "Type").props("items")).toEqual(["Cours", "Exercices"]);
  });

  it("marks each Type option with its type's colour dot", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    document.body.innerHTML = ""; // the menu teleports to <body>
    (select(w, "Type").vm as unknown as { menu: boolean }).menu = true;
    await flushPromises();

    const dots = document.querySelectorAll('[data-test="type-dot"]');
    expect(dots).toHaveLength(new Set(items.map((i) => i.meta.type)).size);
    expect(dots[0].getAttribute("style")).toContain("--v-theme-type-");
  });

  it("emits the selected level when the Niveau select changes", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    select(w, "Niveau").vm.$emit("update:modelValue", "2ème Bac SM");
    await w.vm.$nextTick();
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBe("2ème Bac SM");
  });

  it("clears the level when the Niveau select is cleared", async () => {
    const w = mountWithVuetify(FilterControlsPanel, {
      props: { items, modelValue: { level: "2ème Bac SM" } as Filters },
    });
    select(w, "Niveau").vm.$emit("update:modelValue", null);
    await w.vm.$nextTick();
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBeFalsy();
  });

  it("resets every filter, search included, from the reset button", async () => {
    const w = mountWithVuetify(FilterControlsPanel, {
      props: { items, modelValue: { level: "2ème Bac SM", search: "onde" } as Filters },
    });
    await w.get('[data-test="filter-reset"]').trigger("click");
    const events = w.emitted("update:modelValue") as Filters[][];
    const last = events[events.length - 1][0];
    expect(last.level).toBeUndefined();
    expect(last.search).toBeUndefined();
  });

  it("hides the reset button while nothing is filtered", () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items, modelValue: {} as Filters } });
    expect(w.find('[data-test="filter-reset"]').exists()).toBe(false);
  });

  it("narrows Chapitre options to the selected Niveau's chapters", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items: chapterItems, modelValue: {} as Filters } });
    expect(select(w, "Chapitre").props("items")).toEqual(["Mécanique", "Optique"]);

    select(w, "Niveau").vm.$emit("update:modelValue", "2ème Bac SM");
    await w.vm.$nextTick();
    expect(select(w, "Chapitre").props("items")).toEqual(["Mécanique"]);
  });

  it("clears an already-selected chapter that no longer matches the new Niveau", async () => {
    const w = mountWithVuetify(FilterControlsPanel, {
      props: { items: chapterItems, modelValue: { level: "1ère Bac", chapter: "Optique" } as Filters },
    });
    select(w, "Niveau").vm.$emit("update:modelValue", "2ème Bac SM");
    await w.vm.$nextTick();
    const events = w.emitted("update:modelValue") as Filters[][];
    const last = events[events.length - 1][0];
    expect(last.level).toBe("2ème Bac SM");
    expect(last.chapter).toBeUndefined();
  });

  it("narrows Chapitre options to the selected Matière's chapters", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items: subjectItems, modelValue: {} as Filters } });
    expect(select(w, "Chapitre").props("items")).toEqual(["Acides et bases", "Mécanique", "Optique"]);

    select(w, "Matière").vm.$emit("update:modelValue", "Physique");
    await w.vm.$nextTick();
    expect(select(w, "Chapitre").props("items")).toEqual(["Mécanique", "Optique"]);
  });

  it("narrows Chapitre options by Niveau and Matière together", async () => {
    const w = mountWithVuetify(FilterControlsPanel, { props: { items: subjectItems, modelValue: {} as Filters } });
    select(w, "Matière").vm.$emit("update:modelValue", "Physique");
    select(w, "Niveau").vm.$emit("update:modelValue", "2ème Bac SM");
    await w.vm.$nextTick();
    expect(select(w, "Chapitre").props("items")).toEqual(["Mécanique"]);
  });

  it("clears an already-selected chapter that no longer matches the new Matière", async () => {
    const w = mountWithVuetify(FilterControlsPanel, {
      props: { items: subjectItems, modelValue: { subject: "Physique", chapter: "Mécanique" } as Filters },
    });
    select(w, "Matière").vm.$emit("update:modelValue", "Chimie");
    await w.vm.$nextTick();
    const events = w.emitted("update:modelValue") as Filters[][];
    const last = events[events.length - 1][0];
    expect(last.subject).toBe("Chimie");
    expect(last.chapter).toBeUndefined();
  });
});
