import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import FileCard from "./FileCard.vue";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "https://drive/1",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "Mécanique — Cours",
  meta: { fileId: "1", level: "2ème Bac SM", type: "Cours", subject: "Physique", chapter: "Mécanique", title: "Mécanique — Cours", description: "Chapitre 1", tags: [], order: 0 },
};

describe("FileCard", () => {
  it("renders title, type, subtitle, description and links to the file (whole card)", () => {
    const w = mountWithVuetify(FileCard, { props: { item } });
    expect(w.text()).toContain("Mécanique — Cours");
    expect(w.text()).toContain("Cours");
    expect(w.text()).toContain("2ème Bac SM");
    expect(w.text()).toContain("Chapitre 1");
    // The whole card is the clickable link now (no separate "Ouvrir" button).
    const a = w.get("a");
    expect(a.attributes("href")).toBe("https://drive/1");
    expect(a.attributes("target")).toBe("_blank");
    expect(w.text()).not.toContain("Ouvrir");
  });

  it("shows a file-type icon based on the file", () => {
    const pdf = mountWithVuetify(FileCard, { props: { item } }); // raw.pdf
    expect(pdf.find(".mdi-file-pdf-box").exists()).toBe(true);

    const video = mountWithVuetify(FileCard, {
      props: { item: { ...item, name: "cours.mp4", mimeType: "video/mp4" } },
    });
    expect(video.find(".mdi-file-video").exists()).toBe(true);
  });
});
