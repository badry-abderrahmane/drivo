import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import UnfoldingCards from "./UnfoldingCards.vue";
import type { LibraryItem } from "../lib/types";

const mockItems: LibraryItem[] = [
  {
    fileId: "f1",
    name: "Ondes_2BAC.pdf",
    mimeType: "application/pdf",
    path: ["Drive", "Ondes"],
    webViewLink: "https://drive.google.com/f1",
    modifiedTime: "2026-01-01",
    isFolder: false,
    displayTitle: "Cours Ondes Mécaniques",
    meta: {
      fileId: "f1",
      level: ["2BAC"],
      type: "Cours",
      subject: "Physique",
      chapter: ["Ondes Mécaniques"],
      title: "Cours Ondes Mécaniques",
      description: "",
      tags: [],
      order: 1,
    },
  },
  {
    fileId: "f2",
    name: "Nucleaire_2BAC.pdf",
    mimeType: "application/pdf",
    path: ["Drive", "Nucleaire"],
    webViewLink: "https://drive.google.com/f2",
    modifiedTime: "2026-01-01",
    isFolder: false,
    displayTitle: "Transformations Nucléaires",
    meta: {
      fileId: "f2",
      level: ["2BAC"],
      type: "Exercices",
      subject: "Physique",
      chapter: ["Transformations Nucléaires"],
      title: "Transformations Nucléaires",
      description: "",
      tags: [],
      order: 2,
    },
  },
  {
    fileId: "f3",
    name: "Optique_1BAC.pdf",
    mimeType: "application/pdf",
    path: ["Drive", "Optique"],
    webViewLink: "https://drive.google.com/f3",
    modifiedTime: "2026-01-01",
    isFolder: false,
    displayTitle: "Optique Géométrique",
    meta: {
      fileId: "f3",
      level: ["1BAC"],
      type: "Cours",
      subject: "Physique",
      chapter: ["Optique"],
      title: "Optique Géométrique",
      description: "",
      tags: [],
      order: 1,
    },
  },
];

describe("UnfoldingCards.vue", () => {
  it("renders level cards initially (Step 1)", () => {
    const wrapper = mountWithVuetify(UnfoldingCards, {
      props: { items: mockItems },
    });

    expect(wrapper.text()).toContain("Choisissez votre Niveau");
    expect(wrapper.find('[data-test="unfold-level-2BAC"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="unfold-level-1BAC"]').exists()).toBe(true);
  });

  it("unfolds into chapters when a level card is clicked (Step 2)", async () => {
    const wrapper = mountWithVuetify(UnfoldingCards, {
      props: { items: mockItems },
    });

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");

    expect(wrapper.text()).toContain("Chapitres de 2BAC");
    expect(wrapper.find('[data-test="unfold-chapter-Ondes Mécaniques"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="unfold-chapter-Transformations Nucléaires"]').exists()).toBe(true);
  });

  it("unfolds into document cards when a chapter card is clicked (Step 3)", async () => {
    const wrapper = mountWithVuetify(UnfoldingCards, {
      props: { items: mockItems },
    });

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await wrapper.find('[data-test="unfold-chapter-Ondes Mécaniques"]').trigger("click");

    expect(wrapper.text()).toContain("Documents — Ondes Mécaniques");
    expect(wrapper.text()).toContain("Cours Ondes Mécaniques");
  });

  it("steps back from chapters to levels, and from documents to chapters", async () => {
    const wrapper = mountWithVuetify(UnfoldingCards, {
      props: { items: mockItems },
    });

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    expect(wrapper.text()).toContain("Chapitres de 2BAC");

    await wrapper.find('[data-test="unfold-chapter-Ondes Mécaniques"]').trigger("click");
    expect(wrapper.text()).toContain("Documents — Ondes Mécaniques");

    await wrapper.find('[data-test="unfold-back-to-chapters"]').trigger("click");
    expect(wrapper.text()).toContain("Chapitres de 2BAC");

    await wrapper.find('[data-test="unfold-back-to-levels"]').trigger("click");
    expect(wrapper.text()).toContain("Choisissez votre Niveau");
  });
});
