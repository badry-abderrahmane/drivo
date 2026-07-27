import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import FilterBar from "./FilterBar.vue";
import type { LibraryItem } from "../lib/types";
import type { Filters } from "../lib/filter";

const mk = (id: string, level: string, type: string): LibraryItem => ({
  fileId: id, name: id, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: { fileId: id, level, type, subject: "", chapter: "", title: "", description: "", tags: [], order: 0 },
});
const items = [mk("1", "2ème Bac SM", "Cours"), mk("2", "1ère Bac", "Exercices")];

describe("FilterBar", () => {
  it("emits updated filters when search changes", async () => {
    const w = mountWithVuetify(FilterBar, { props: { items, modelValue: {} as Filters } });
    const input = w.get('[data-test="search"] input');
    await input.setValue("newton");
    const events = w.emitted("update:modelValue") as Filters[][];
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1][0].search).toBe("newton");
  });
});
