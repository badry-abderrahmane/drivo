import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import CourseGroups from "./CourseGroups.vue";
import { groupCourses } from "../lib/group";
import type { LibraryItem } from "../lib/types";

const mk = (fileId: string, level: string, title: string): LibraryItem => ({
  fileId, name: title, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: { fileId, level, type: "", subject: "", chapter: "", title, description: "", tags: [], order: 0 },
});

describe("CourseGroups", () => {
  it("renders a section title and count per level", () => {
    const sections = groupCourses([
      mk("1", "2ème Bac SM", "Mécanique"),
      mk("2", "2ème Bac SM", "Optique"),
      mk("3", "1ère Bac", "Chimie"),
    ]);
    const w = mountWithVuetify(CourseGroups, { props: { sections } });
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("1ère Bac");
    // level counts (2 and 1) appear as chips in the titles
    expect(w.text()).toContain("2");
    expect(w.text()).toContain("1");
  });
});
