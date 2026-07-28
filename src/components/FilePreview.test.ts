import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "../test/setup";
import FilePreview from "./FilePreview.vue";

describe("FilePreview", () => {
  it("renders the Drive preview iframe for the item when open", () => {
    mountWithVuetify(FilePreview, {
      props: { modelValue: true, item: { fileId: "ABC", name: "cours.pdf", mimeType: "application/pdf", title: "Cours" } },
    });
    const iframe = document.querySelector('[data-test="preview-frame"]') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe("https://drive.google.com/file/d/ABC/preview");
  });

  it("renders nothing (no iframe) when closed", () => {
    document.body.innerHTML = "";
    mountWithVuetify(FilePreview, {
      props: { modelValue: false, item: { fileId: "ABC", name: "c.pdf", mimeType: "application/pdf" } },
    });
    expect(document.querySelector('[data-test="preview-frame"]')).toBeNull();
  });
});
