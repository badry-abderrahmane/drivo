import { describe, it, expect, afterEach } from "vitest";
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
  it("shows the filters inline on desktop-width screens", () => {
    setViewportWidth(1280);
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    expect(w.find('[data-test="filter-level"]').exists()).toBe(true);
  });

  it("wraps the selects in nothing — no tinted card, no border", () => {
    setViewportWidth(1280);
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    expect(w.find(".filter-card").exists()).toBe(false);
    expect(w.get(".filter-container").classes()).not.toContain("border");
  });

  it("renders nothing at all on mobile-width screens", () => {
    setViewportWidth(375);
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    expect(w.find('[data-test="filter-level"]').exists()).toBe(false);
    expect(w.find(".filter-container").exists()).toBe(false);
  });

  it("empties the selects when the parent clears its filters", async () => {
    // Regression: BrowseView's "Vider les filtres" assigns a bare {}. Object.assign onto
    // the local copy would have been a no-op — it has no keys to copy — leaving every
    // select still showing a filter that no longer filters anything.
    setViewportWidth(1280);
    const w = mountWithVuetify(FilterBar, {
      props: { items, modelValue: { level: "2ème Bac SM", type: "Cours" } as Filters },
    });
    await w.setProps({ modelValue: {} as Filters });

    const values = w.findAllComponents({ name: "VSelect" }).map((c) => c.props("modelValue"));
    expect(values.every((v) => !v)).toBe(true);
  });

  it("passes a filter chosen in the panel up to its parent", async () => {
    setViewportWidth(1280);
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    w.getComponent({ name: "FilterControlsPanel" }).vm.$emit("update:modelValue", { level: "1ère Bac" });
    await w.vm.$nextTick();
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events[events.length - 1][0].level).toBe("1ère Bac");
  });
});
