import { describe, it, expect } from "vitest";
import { fileKind } from "./fileKind";

describe("fileKind", () => {
  it("maps by extension", () => {
    expect(fileKind("cours.pdf").icon).toBe("mdi-file-pdf-box");
    expect(fileKind("td.docx").icon).toBe("mdi-file-word-box");
    expect(fileKind("notes.xlsx").icon).toBe("mdi-file-excel-box");
    expect(fileKind("expose.pptx").icon).toBe("mdi-file-powerpoint-box");
    expect(fileKind("tp.mp4").icon).toBe("mdi-file-video");
    expect(fileKind("audio.mp3").icon).toBe("mdi-file-music");
    expect(fileKind("schema.png").icon).toBe("mdi-file-image");
    expect(fileKind("archive.zip").icon).toBe("mdi-folder-zip");
  });

  it("is case-insensitive on the extension", () => {
    expect(fileKind("COURS.PDF").icon).toBe("mdi-file-pdf-box");
  });

  it("prefers mimeType, incl. Google-native files with no extension", () => {
    expect(fileKind("Devoir", "application/vnd.google-apps.document").icon).toBe("mdi-file-word-box");
    expect(fileKind("clip", "video/mp4").icon).toBe("mdi-file-video");
    expect(fileKind("photo", "image/jpeg").icon).toBe("mdi-file-image");
  });

  it("falls back to a generic file icon for unknown/extension-less names", () => {
    expect(fileKind("README").icon).toBe("mdi-file-outline");
    expect(fileKind("data.xyz").icon).toBe("mdi-file-outline");
  });

  it("returns a color with every kind", () => {
    expect(fileKind("cours.pdf").color).toMatch(/^#/);
    expect(fileKind("x").color).toMatch(/^#/);
  });
});
