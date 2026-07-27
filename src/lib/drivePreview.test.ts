import { describe, it, expect } from "vitest";
import { drivePreviewUrl, driveOpenUrl } from "./drivePreview";

describe("drivePreviewUrl", () => {
  it("uses the generic file endpoint for uploaded files (pdf, video, …)", () => {
    expect(drivePreviewUrl("ABC", "application/pdf")).toBe("https://drive.google.com/file/d/ABC/preview");
    expect(drivePreviewUrl("ABC", "video/mp4")).toBe("https://drive.google.com/file/d/ABC/preview");
    expect(drivePreviewUrl("ABC")).toBe("https://drive.google.com/file/d/ABC/preview");
  });
  it("uses the docs editor host for Google-native files", () => {
    expect(drivePreviewUrl("ABC", "application/vnd.google-apps.document")).toBe("https://docs.google.com/document/d/ABC/preview");
    expect(drivePreviewUrl("ABC", "application/vnd.google-apps.spreadsheet")).toBe("https://docs.google.com/spreadsheets/d/ABC/preview");
    expect(drivePreviewUrl("ABC", "application/vnd.google-apps.presentation")).toBe("https://docs.google.com/presentation/d/ABC/preview");
  });
});

describe("driveOpenUrl", () => {
  it("returns a /view link for uploaded files", () => {
    expect(driveOpenUrl("ABC", "application/pdf")).toBe("https://drive.google.com/file/d/ABC/view");
  });
  it("returns an /edit link for Google-native files", () => {
    expect(driveOpenUrl("ABC", "application/vnd.google-apps.document")).toBe("https://docs.google.com/document/d/ABC/edit");
  });
});
