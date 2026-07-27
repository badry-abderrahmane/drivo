import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderAdmin, toSaveInput } from "./admin";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: "", type: "", subject: "", chapter: "", title: "", description: "", tags: ["a", "b"], order: 0 },
};

const okSave = () => vi.fn().mockResolvedValue({ ok: true });

describe("toSaveInput", () => {
  it("joins tags with commas", () => {
    expect(toSaveInput(item).tags).toBe("a,b");
  });
});

describe("renderAdmin", () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement("div"); document.body.appendChild(root); });

  it("shows the password gate first, no editor", () => {
    renderAdmin(root, { load: vi.fn(), save: vi.fn(), reindex: vi.fn() });
    expect(root.querySelector("[data-gate]")).not.toBeNull();
    expect(root.querySelector("[data-editor]")).toBeNull();
  });

  it("loads items after unlocking and renders a row per file", async () => {
    const load = vi.fn().mockResolvedValue({ items: [item], stale: false });
    renderAdmin(root, { load, save: okSave(), reindex: vi.fn() });
    (root.querySelector("[data-pw]") as HTMLInputElement).value = "secret";
    (root.querySelector("[data-unlock]") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector("[data-editor]")).not.toBeNull());
    expect(root.querySelectorAll("[data-row]")).toHaveLength(1);
  });

  it("calls save with the entered password and edited rows", async () => {
    const load = vi.fn().mockResolvedValue({ items: [item], stale: false });
    const save = okSave();
    renderAdmin(root, { load, save, reindex: vi.fn() });
    (root.querySelector("[data-pw]") as HTMLInputElement).value = "secret";
    (root.querySelector("[data-unlock]") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector("[data-editor]")).not.toBeNull());
    (root.querySelector('[data-field="title"]') as HTMLInputElement).value = "Nouveau titre";
    (root.querySelector("[data-save]") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(save.mock.calls.length).toBeGreaterThan(1));
    // The last save call is the explicit Save (the first was the unlock validation).
    const [pw, rows] = save.mock.calls.at(-1)!;
    expect(pw).toBe("secret");
    expect(rows[0].title).toBe("Nouveau titre");
  });

  it("stays gated with an error when the password is rejected", async () => {
    const save = vi.fn().mockResolvedValue({ ok: false, error: "unauthorized" });
    const load = vi.fn();
    renderAdmin(root, { load, save, reindex: vi.fn() });
    (root.querySelector("[data-pw]") as HTMLInputElement).value = "wrong";
    (root.querySelector("[data-unlock]") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector("[data-error]")).not.toBeNull());
    expect(root.querySelector("[data-editor]")).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("shows an error and stays gated when load fails after a valid password", async () => {
    const load = vi.fn().mockRejectedValue(new Error("offline"));
    renderAdmin(root, { load, save: okSave(), reindex: vi.fn() });
    (root.querySelector("[data-pw]") as HTMLInputElement).value = "secret";
    (root.querySelector("[data-unlock]") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector("[data-error]")).not.toBeNull());
    expect(root.querySelector("[data-editor]")).toBeNull();
  });
});
