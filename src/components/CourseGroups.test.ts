import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import CourseGroups from "./CourseGroups.vue";
import { groupCourses } from "../lib/group";
import type { LibraryItem } from "../lib/types";

const mk = (
  fileId: string,
  level: string[],
  title: string,
  subject = "",
  chapter: string[] = []
): LibraryItem => ({
  fileId, name: title, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: {
    fileId, level, type: "", subject, chapter, title,
    description: "", tags: [], order: 0,
  },
});

describe("CourseGroups", () => {
  it("renders a section title and count per level", () => {
    const sections = groupCourses([
      mk("1", ["2ème Bac SM"], "Mécanique"),
      mk("2", ["2ème Bac SM"], "Optique"),
      mk("3", ["1ère Bac"], "Chimie"),
    ]);
    const w = mountWithVuetify(CourseGroups, { props: { sections } });
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("1ère Bac");
    // level counts (2 and 1) appear as chips in the titles
    expect(w.text()).toContain("2");
    expect(w.text()).toContain("1");
  });

  it("starts with every level panel closed", () => {
    const sections = groupCourses([
      mk("1", ["2ème Bac SM"], "a", "Physique", ["Ondes"]),
      mk("2", ["1ère Bac"], "b", "Chimie", ["Acides"]),
    ]);
    const w = mountWithVuetify(CourseGroups, { props: { sections } });
    expect(w.findAll('[data-test="subject-block"]')).toHaveLength(0);
  });

  it("divides an opened level into one block per matière", async () => {
    const sections = groupCourses([
      mk("1", ["2ème Bac SM"], "a", "Physique", ["Ondes"]),
      mk("2", ["2ème Bac SM"], "b", "Chimie", ["Acides"]),
    ]);
    const w = mountWithVuetify(CourseGroups, { props: { sections } });
    await w.get(".v-expansion-panel-title").trigger("click");
    const blocks = w.findAll('[data-test="subject-block"]');
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.text())).toEqual([
      expect.stringContaining("Physique"),
      expect.stringContaining("Chimie"),
    ]);
    // Chapters sit inside their matière block, not next to it.
    expect(blocks[0].text()).toContain("Ondes");
    expect(blocks[0].text()).not.toContain("Acides");
    expect(blocks[1].text()).toContain("Acides");
  });
});
