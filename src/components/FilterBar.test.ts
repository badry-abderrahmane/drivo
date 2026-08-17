import { describe, it, expect, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "../test/setup";
import FilterBar from "./FilterBar.vue";
import type { LibraryItem } from "../lib/types";
import type { Filters } from "../lib/filter";

const mk = (id: string, level: string[], type: string): LibraryItem => ({
  fileId: id, name: id, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level, type, subject: "", chapter: [], title: "", description: "", tags: [], order: 0 },
});
const items = [mk("1", ["2ème Bac SM"], "Cours"), mk("2", ["1ère Bac"], "Exercices")];

// Vuetify's display composable reads window.innerWidth once, synchronously, when its
// Vuetify instance is created — so this must run before mountWithVuetify, not after.
function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

afterEach(() => {
  setViewportWidth(1024); // back to jsdom's default-ish desktop width
});

describe("FilterBar", () => {
  it("shows filters inline on desktop-width screens (no trigger button)", () => {
    setViewportWidth(1280);
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    expect(w.find('[data-test="level-all"]').exists()).toBe(true);
    expect(w.find('[data-test="mobile-filters-trigger"]').exists()).toBe(false);
  });

  it("hides filters behind a trigger button on mobile-width screens", () => {
    setViewportWidth(375);
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    expect(w.find('[data-test="level-all"]').exists()).toBe(false);
    expect(w.find('[data-test="mobile-filters-trigger"]').exists()).toBe(true);
  });

  it("opens a bottom sheet with the filters when the mobile trigger is tapped", async () => {
    setViewportWidth(375);
    document.body.innerHTML = ""; // v-bottom-sheet content teleports to <body>
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    await w.get('[data-test="mobile-filters-trigger"]').trigger("click");
    await w.vm.$nextTick();

    const sheetLevelAll = document.querySelector('[data-test="mobile-filters-sheet"] [data-test="level-all"]');
    expect(sheetLevelAll).not.toBeNull();
  });

  it("shows an active-filter count badge on the mobile trigger once a level is set", () => {
    setViewportWidth(375);
    const w = mountWithVuetify(FilterBar, {
      props: { items, modelValue: { level: "2ème Bac SM" } as Filters },
    });
    expect(w.get('[data-test="mobile-filters-trigger"]').text()).toContain("1");
  });

  it("stages a chip tap in the mobile sheet — only applies it once 'Filtrer' is tapped", async () => {
    setViewportWidth(375);
    document.body.innerHTML = "";
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    await w.get('[data-test="mobile-filters-trigger"]').trigger("click");
    await flushPromises();

    (document.querySelector('[data-test="mobile-filters-sheet"] [data-test="level-2ème Bac SM"]') as HTMLElement).click();
    await flushPromises();
    expect(w.emitted("update:modelValue")).toBeUndefined();

    (document.querySelector('[data-test="mobile-filters-apply"]') as HTMLElement).click();
    await flushPromises();
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBe("2ème Bac SM");
  });

  it("discards staged changes when 'Annuler' is tapped", async () => {
    setViewportWidth(375);
    document.body.innerHTML = "";
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    await w.get('[data-test="mobile-filters-trigger"]').trigger("click");
    await flushPromises();

    (document.querySelector('[data-test="mobile-filters-sheet"] [data-test="level-2ème Bac SM"]') as HTMLElement).click();
    await flushPromises();
    (document.querySelector('[data-test="mobile-filters-cancel"]') as HTMLElement).click();
    await flushPromises();

    expect(w.emitted("update:modelValue")).toBeUndefined();
    expect(w.get('[data-test="mobile-filters-trigger"]').text()).not.toContain("1");
  });

  it("passes larger chips and a divider to the panel only inside the mobile sheet", async () => {
    setViewportWidth(375);
    document.body.innerHTML = "";
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    // v-bottom-sheet doesn't mount its content until opened.
    await w.get('[data-test="mobile-filters-trigger"]').trigger("click");
    await flushPromises();

    const panel = w.getComponent({ name: "FilterControlsPanel" });
    expect(panel.props("chipSize")).toBe("large");
    expect(panel.props("showDivider")).toBe(true);
  });
});
