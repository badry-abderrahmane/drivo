import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { createRouter, createMemoryHistory } from "vue-router";
import FileCard from "./FileCard.vue";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "https://drive/1",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "Mécanique — Cours",
  meta: { fileId: "1", level: ["2ème Bac SM"], type: "Cours", subject: "Physique", chapter: ["Mécanique"], title: "Mécanique — Cours", description: "Chapitre 1", tags: [], order: 0 },
};

// The card is a router-link now, so every mount needs a router that can resolve
// the `doc` route.
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "browse", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
}

function mountCard(props: { item: LibraryItem; mode?: "grid" | "list" }) {
  return mountWithVuetify(FileCard, { props, global: { plugins: [makeRouter()] } });
}

describe("FileCard", () => {
  it("renders title, type, subtitle and description", () => {
    const w = mountCard({ item });
    expect(w.text()).toContain("Mécanique — Cours");
    expect(w.text()).toContain("Cours");
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("Chapitre 1");
    // The whole card is the clickable link (no separate "Ouvrir" button).
    expect(w.text()).not.toContain("Ouvrir");
  });

  it("links to the in-app document page, not out to Drive", () => {
    const w = mountCard({ item });
    const href = w.get("a").attributes("href");
    expect(href).toBe("/doc/1/mecanique-cours");
    expect(href).not.toContain("drive");
    expect(w.get("a").attributes("target")).toBeUndefined();
  });

  it("links to the document page in list mode too", () => {
    const w = mountCard({ item, mode: "list" });
    expect(w.get("a").attributes("href")).toBe("/doc/1/mecanique-cours");
  });

  it("shows every chapter as its own tag (no truncation to one)", () => {
    const multi = {
      ...item,
      meta: { ...item.meta, chapter: ["Mécanique", "Ondes", "Électricité"] },
    };
    const w = mountCard({ item: multi });
    expect(w.text()).toContain("Mécanique");
    expect(w.text()).toContain("Ondes");
    expect(w.text()).toContain("Électricité");
  });

  it("collapses chapters beyond 3 behind a toggle, expanded on click", async () => {
    const many = {
      ...item,
      meta: { ...item.meta, chapter: ["Mécanique", "Ondes", "Électricité", "Optique", "Chimie orga"] },
    };
    const w = mountCard({ item: many });
    expect(w.text()).toContain("Mécanique");
    expect(w.text()).toContain("Électricité");
    expect(w.text()).not.toContain("Optique");
    expect(w.text()).not.toContain("Chimie orga");
    expect(w.text()).toContain("+2");

    await w.get('[data-test="chapter-toggle"]').trigger("click");
    expect(w.text()).toContain("Optique");
    expect(w.text()).toContain("Chimie orga");
    expect(w.find('[data-test="chapter-toggle"]').exists()).toBe(false);
  });

  it("shows a file-type icon based on the file", () => {
    const pdf = mountCard({ item }); // raw.pdf
    expect(pdf.find(".mdi-file-pdf-box").exists()).toBe(true);

    const video = mountCard({ item: { ...item, name: "cours.mp4", mimeType: "video/mp4" } });
    expect(video.find(".mdi-file-video").exists()).toBe(true);
  });
});
