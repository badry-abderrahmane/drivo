import { describe, it, expect, beforeEach } from "vitest";
import { renderBrowse } from "./browse";
import type { LibraryItem } from "../lib/types";

const mk = (fileId: string, over: Partial<LibraryItem["meta"]>, title: string): LibraryItem => ({
  fileId, name: title, mimeType: "application/pdf", path: [], webViewLink: "https://drive/" + fileId,
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: title,
  meta: { fileId, level: over.level ?? "", type: over.type ?? "", subject: "", chapter: "", title: over.title ?? "", description: "", tags: over.tags ?? [], order: over.order ?? 0 },
});

const items = [
  mk("1", { level: "2ème Bac SM", type: "Cours" }, "Mécanique"),
  mk("2", { level: "2ème Bac SM", type: "Exercices", tags: ["newton"] }, "TD1"),
];

describe("renderBrowse", () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement("div"); document.body.appendChild(root); });

  it("renders one card per item with an open link", () => {
    renderBrowse(root, items, false);
    const cards = root.querySelectorAll("[data-card]");
    expect(cards).toHaveLength(2);
    const link = cards[0].querySelector("a") as HTMLAnchorElement;
    expect(link.href).toContain("https://drive/1");
    expect(link.target).toBe("_blank");
  });

  it("filters by the type select", () => {
    renderBrowse(root, items, false);
    const typeSel = root.querySelector('select[data-filter="type"]') as HTMLSelectElement;
    typeSel.value = "Exercices";
    typeSel.dispatchEvent(new Event("change"));
    const cards = root.querySelectorAll("[data-card]");
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("TD1");
  });

  it("filters by the search box (title + tags)", () => {
    renderBrowse(root, items, false);
    const search = root.querySelector('input[data-filter="search"]') as HTMLInputElement;
    search.value = "newton";
    search.dispatchEvent(new Event("input"));
    expect(root.querySelectorAll("[data-card]")).toHaveLength(1);
  });

  it("shows a stale banner when stale is true", () => {
    renderBrowse(root, items, true);
    expect(root.querySelector("[data-stale]")).not.toBeNull();
  });
});
