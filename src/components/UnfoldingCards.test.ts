import { describe, it, expect } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "../test/setup";
import UnfoldingCards from "./UnfoldingCards.vue";
import type { LibraryItem } from "../lib/types";

// The component reads/writes its drill-down position via route params, so every mount
// needs a real router in its history (Back/Forward is exactly what's under test).
async function mountUnfolding(items: LibraryItem[]) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "browse", component: { template: "<div/>" } },
      { path: "/niveau/:level", name: "level", component: { template: "<div/>" } },
      { path: "/niveau/:level/chapitre/:chapter", name: "chapter", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
  router.push("/");
  await router.isReady();
  const wrapper = mountWithVuetify(UnfoldingCards, {
    props: { items },
    global: { plugins: [router] },
  });
  return { wrapper, router };
}

// A route navigation resolves through a microtask, and Vuetify's out-in transition
// needs a real timer tick (not just a flushed microtask queue) before the new step's DOM
// lands. flushPromises() alone can leave the old step still rendered.
async function settle(): Promise<void> {
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
}

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
  it("renders level cards initially (Step 1)", async () => {
    const { wrapper } = await mountUnfolding(mockItems);

    expect(wrapper.text()).toContain("Choisissez votre Niveau");
    expect(wrapper.find('[data-test="unfold-level-2BAC"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="unfold-level-1BAC"]').exists()).toBe(true);
  });

  it("unfolds into chapters when a level card is clicked (Step 2)", async () => {
    const { wrapper } = await mountUnfolding(mockItems);

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();

    expect(wrapper.text()).toContain("Chapitres de 2BAC");
    expect(wrapper.find('[data-test="unfold-chapter-Ondes Mécaniques"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="unfold-chapter-Transformations Nucléaires"]').exists()).toBe(true);
  });

  it("hangs the program number beside each chapter", async () => {
    const { wrapper } = await mountUnfolding(mockItems);

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();

    expect(wrapper.find('[data-test="chapter-spine-number"]').exists()).toBe(true);
  });

  it("shows an em dash, not a number, for a chapter outside the official program", async () => {
    const { wrapper } = await mountUnfolding(mockItems);

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();

    // The fixture's chapters are invented, so none of them is in CHAPTERS_BY_LEVEL.
    expect(wrapper.find('[data-test="chapter-spine-number"]').text()).toBe("—");
  });

  it("unfolds into document cards when a chapter card is clicked (Step 3)", async () => {
    const { wrapper } = await mountUnfolding(mockItems);

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();
    await wrapper.find('[data-test="unfold-chapter-Ondes Mécaniques"]').trigger("click");
    await settle();

    expect(wrapper.text()).toContain("Documents — Ondes Mécaniques");
    expect(wrapper.text()).toContain("Cours Ondes Mécaniques");
  });

  it("steps back from chapters to levels, and from documents to chapters", async () => {
    const { wrapper } = await mountUnfolding(mockItems);

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();
    expect(wrapper.text()).toContain("Chapitres de 2BAC");

    await wrapper.find('[data-test="unfold-chapter-Ondes Mécaniques"]').trigger("click");
    await settle();
    expect(wrapper.text()).toContain("Documents — Ondes Mécaniques");

    await wrapper.find('[data-test="unfold-back-to-chapters"]').trigger("click");
    await settle();
    expect(wrapper.text()).toContain("Chapitres de 2BAC");

    await wrapper.find('[data-test="unfold-back-to-levels"]').trigger("click");
    await settle();
    expect(wrapper.text()).toContain("Choisissez votre Niveau");
  });

  it("splits chapter documents into sections ordered Cours, Exercices, Devoir surveillé, others", async () => {
    const mk = (id: string, type: string): LibraryItem => ({
      fileId: id, name: id, mimeType: "application/pdf", path: [],
      webViewLink: "u", modifiedTime: "2026-01-01", isFolder: false, displayTitle: type + " " + id,
      meta: { fileId: id, level: ["2BAC"], type, subject: "Physique", chapter: ["Ondes"], title: "", description: "", tags: [], order: 0 },
    });
    // Deliberately out of order, so a pass here can't be an accident of input order.
    const items = [mk("1", "Vidéo"), mk("2", "Devoir surveillé"), mk("3", "Exercices"), mk("4", "Cours")];
    const { wrapper } = await mountUnfolding(items);

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();
    await wrapper.find('[data-test="unfold-chapter-Ondes"]').trigger("click");
    await settle();

    const text = wrapper.text();
    const positions = ["Cours", "Exercices", "Devoir surveillé", "Vidéo"].map((t) => text.indexOf(t));
    expect(positions.every((p) => p !== -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("puts the drill-down position in the route path, so Back steps out one level at a time", async () => {
    const { wrapper, router } = await mountUnfolding(mockItems);

    await wrapper.find('[data-test="unfold-level-2BAC"]').trigger("click");
    await settle();
    expect(router.currentRoute.value.params.level).toBe("2bac");

    await wrapper.find('[data-test="unfold-chapter-Ondes Mécaniques"]').trigger("click");
    await settle();
    expect(router.currentRoute.value.params.chapter).toBe("ondes-mecaniques");

    await router.back();
    await settle();
    expect(router.currentRoute.value.params.chapter).toBeUndefined();
    expect(router.currentRoute.value.params.level).toBe("2bac");
    expect(wrapper.text()).toContain("Chapitres de 2BAC");

    await router.back();
    await settle();
    expect(router.currentRoute.value.params.level).toBeUndefined();
    expect(wrapper.text()).toContain("Choisissez votre Niveau");
  });

  it("falls back to the level picker when the URL names an unknown level", async () => {
    const { wrapper, router } = await mountUnfolding(mockItems);
    router.push({ name: "level", params: { level: "niveau-inexistant" } });
    await settle();
    expect(wrapper.text()).toContain("Choisissez votre Niveau");
  });
});
