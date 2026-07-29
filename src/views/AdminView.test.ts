import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: [], type: "", subject: "", chapter: [], title: "", description: "", tags: [], order: 0 },
};

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
});

async function mountAdmin() {
  const saveMeta = vi.fn().mockResolvedValue({ ok: true });
  const reindex = vi.fn().mockResolvedValue({ ok: true, count: 1 });
  const loadLibrary = vi.fn().mockResolvedValue({ items: [item], stale: false });
  vi.doMock("../lib/loadLibrary", () => ({ loadLibrary }));
  vi.doMock("../api", () => ({ saveMeta, reindex }));
  const AdminView = (await import("./AdminView.vue")).default;
  const w = mountWithVuetify(AdminView);
  await flushPromises();
  return { w, saveMeta, reindex };
}

async function unlock(w: Awaited<ReturnType<typeof mountAdmin>>["w"]) {
  await w.get('input[type="password"]').setValue("secret");
  await w.get('[data-test="unlock"]').trigger("click");
  await flushPromises();
}

// Editing happens in the modal (teleported to document). Open it for the first row,
// set the display title, and apply.
async function editTitleViaModal(w: Awaited<ReturnType<typeof mountAdmin>>["w"], title: string) {
  await w.get('[data-test="edit-row"]').trigger("click");
  await flushPromises();
  const input = document.querySelector('[data-test="modal-title"] input') as HTMLInputElement;
  input.value = title;
  input.dispatchEvent(new Event("input"));
  await flushPromises();
  (document.querySelector('[data-test="apply-edit"]') as HTMLButtonElement).click();
  await flushPromises();
}

describe("AdminView", () => {
  it("shows the gate first and no table", async () => {
    const { w } = await mountAdmin();
    expect(w.find('[data-test="unlock"]').exists()).toBe(true);
    expect(w.find(".v-data-table").exists()).toBe(false);
  });

  it("after unlocking shows the editor table with a row", async () => {
    const { w } = await mountAdmin();
    await unlock(w);
    expect(w.find(".v-data-table").exists()).toBe(true);
    expect(w.text()).toContain("raw.pdf");
  });

  it("save sends only the edited row with the unlocked password", async () => {
    const { w, saveMeta } = await mountAdmin();
    await unlock(w);
    saveMeta.mockClear(); // drop the unlock-validation call
    await editTitleViaModal(w, "Nouveau titre");
    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();
    expect(saveMeta).toHaveBeenCalledTimes(1);
    const [pw, rows] = saveMeta.mock.calls[0];
    expect(pw).toBe("secret");
    expect(rows).toHaveLength(1);
    expect(rows[0].fileId).toBe("1");
    expect(rows[0].title).toBe("Nouveau titre");
  });

  it("clears the unsaved-changes badge after a successful save", async () => {
    const { w } = await mountAdmin();
    await unlock(w);
    await editTitleViaModal(w, "Nouveau titre");
    expect(w.text()).toContain("non enregistrée"); // badge visible after editing
    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();
    expect(w.text()).not.toContain("non enregistrée"); // badge cleared after save
  });

  it("save with no edits does not call the backend", async () => {
    const { w, saveMeta } = await mountAdmin();
    await unlock(w);
    saveMeta.mockClear();
    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();
    expect(saveMeta).not.toHaveBeenCalled();
  });

  it("resets the saving state even if saveMeta rejects", async () => {
    const { w, saveMeta } = await mountAdmin();
    await unlock(w);
    saveMeta.mockRejectedValueOnce(new Error("network"));
    await editTitleViaModal(w, "X");
    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();
    const saveBtn = w.get('[data-test="save"]');
    // button is no longer in the loading state (Vuetify sets aria-disabled / loading class)
    expect(saveBtn.classes().join(" ")).not.toContain("v-btn--loading");
  });

  it("persists the password to the session on unlock", async () => {
    const { w } = await mountAdmin();
    await unlock(w);
    expect(sessionStorage.getItem("drivo:admin_pw")).toBe("secret");
  });

  it("skips the gate when a password is already stored in the session", async () => {
    sessionStorage.setItem("drivo:admin_pw", "secret");
    const { w } = await mountAdmin();
    expect(w.find(".v-data-table").exists()).toBe(true);
    expect(w.find('[data-test="unlock"]').exists()).toBe(false);
  });

  it("shows a loading indicator while the library loads after unlock", async () => {
    let resolveLoad: (v: { items: LibraryItem[]; stale: boolean }) => void = () => {};
    const loadLibrary = vi.fn(() => new Promise((r) => { resolveLoad = r; }));
    const saveMeta = vi.fn().mockResolvedValue({ ok: true });
    vi.doMock("../lib/loadLibrary", () => ({ loadLibrary }));
    vi.doMock("../api", () => ({ saveMeta, reindex: vi.fn() }));
    const AdminView = (await import("./AdminView.vue")).default;
    const w = mountWithVuetify(AdminView);
    await flushPromises();

    await w.get('input[type="password"]').setValue("secret");
    await w.get('[data-test="unlock"]').trigger("click");
    await flushPromises(); // password validated; library load still pending

    expect(w.find('[data-test="loading"]').exists()).toBe(true);
    expect(w.text()).toContain("Chargement des fichiers");

    resolveLoad({ items: [item], stale: false });
    await flushPromises();
    expect(w.find('[data-test="loading"]').exists()).toBe(false);
    expect(w.find(".v-data-table").exists()).toBe(true);
  });

  it("opens an in-app preview with the file's Drive preview iframe", async () => {
    const { w } = await mountAdmin();
    await unlock(w);
    expect(w.find('[data-test="preview-row"]').exists()).toBe(true);
    await w.get('[data-test="preview-row"]').trigger("click");
    await flushPromises();
    // v-dialog content teleports to the document; assert the iframe + its src there.
    const iframe = document.querySelector('[data-test="preview-frame"]') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("/file/d/1/preview");
  });

  it("shows the classification progress (classified / total)", async () => {
    const base = (fileId: string, over: Partial<LibraryItem["meta"]>): LibraryItem => ({
      fileId, name: fileId + ".pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
      modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: fileId,
      meta: { fileId, level: [], type: "", subject: "", chapter: [], title: "", description: "", tags: [], order: 0, ...over },
    });
    const items = [
      base("1", { level: ["2ème Bac SM"], type: "Cours", subject: "Physique", chapter: ["Ondes"] }), // classified
      base("2", { level: ["2ème Bac SM"], type: "Cours", subject: "Physique", chapter: [] }),          // not classified
    ];
    sessionStorage.setItem("drivo:admin_pw", "secret"); // skip the gate
    vi.doMock("../lib/loadLibrary", () => ({ loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }) }));
    vi.doMock("../api", () => ({ saveMeta: vi.fn().mockResolvedValue({ ok: true }), reindex: vi.fn() }));
    const AdminView = (await import("./AdminView.vue")).default;
    const w = mountWithVuetify(AdminView);
    await flushPromises();
    const progress = w.get('[data-test="progress"]');
    expect(progress.text()).toContain("1 / 2");
    expect(progress.text()).toContain("50%");
  });

  it("logout clears the session and returns to the gate", async () => {
    const { w } = await mountAdmin();
    await unlock(w);
    await w.get('[data-test="logout"]').trigger("click");
    await flushPromises();
    expect(w.find('[data-test="unlock"]').exists()).toBe(true);
    expect(sessionStorage.getItem("drivo:admin_pw")).toBeNull();
  });
});

// A row at `path`, classified when `done`.
const fileAt = (fileId: string, path: string[], done = false): LibraryItem => ({
  fileId, name: fileId + ".pdf", mimeType: "application/pdf", path,
  webViewLink: "u", modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false,
  displayTitle: fileId + ".pdf",
  meta: {
    fileId,
    level: done ? ["2ème Bac SM"] : [],
    type: done ? "Cours" : "",
    subject: done ? "Physique" : "",
    chapter: done ? ["Ondes"] : [],
    title: "", description: "", tags: [], order: 0,
  },
});

async function mountAdminWith(items: LibraryItem[]) {
  const saveMeta = vi.fn().mockResolvedValue({ ok: true });
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
  }));
  vi.doMock("../api", () => ({ saveMeta, reindex: vi.fn() }));
  sessionStorage.setItem("drivo:admin_pw", "secret"); // skip the gate
  const AdminView = (await import("./AdminView.vue")).default;
  const w = mountWithVuetify(AdminView);
  await flushPromises();
  return { w, saveMeta };
}

// Click the tree row whose text contains `name`.
async function openFolder(w: ReturnType<typeof mountWithVuetify>, name: string) {
  const node = w.findAll('[data-test="folder-node"]').find((n) => n.text().includes(name))!;
  await node.trigger("click");
  await flushPromises();
}

describe("AdminView folder navigation", () => {
  const drive = [
    fileAt("meca1", ["2BAC-SM", "PHYSIQUE", "Mécanique"]),
    fileAt("ondes1", ["2BAC-SM", "PHYSIQUE", "Ondes"]),
    fileAt("chimie1", ["2BAC-SM", "CHIMIE"]),
    fileAt("dump1", ["TELECHARGEMENTS"]),
  ];

  it("lists the top-level folders with their file counts", async () => {
    const { w } = await mountAdminWith(drive);
    const names = w.findAll('[data-test="folder-node"]').map((n) => n.text());
    expect(names.some((t) => t.includes("2BAC-SM"))).toBe(true);
    expect(names.some((t) => t.includes("TELECHARGEMENTS"))).toBe(true);
  });

  it("shows every file before a folder is chosen", async () => {
    const { w } = await mountAdminWith(drive);
    expect(w.text()).toContain("meca1.pdf");
    expect(w.text()).toContain("dump1.pdf");
  });

  it("scopes the table to the chosen folder, recursively", async () => {
    const { w } = await mountAdminWith(drive);
    await openFolder(w, "2BAC-SM");
    await openFolder(w, "PHYSIQUE");
    expect(w.text()).toContain("meca1.pdf");
    expect(w.text()).toContain("ondes1.pdf"); // subfolder file included
    expect(w.text()).not.toContain("chimie1.pdf");
    expect(w.text()).not.toContain("dump1.pdf");
  });

  it("shows the folder progress for the selected folder", async () => {
    const { w } = await mountAdminWith([fileAt("a", ["A"], true), fileAt("b", ["A"], false)]);
    await openFolder(w, "A");
    expect(w.get('[data-test="progress"]').text()).toContain("1 / 2");
  });

  it("shows the selected path as a breadcrumb", async () => {
    const { w } = await mountAdminWith(drive);
    await openFolder(w, "2BAC-SM");
    expect(w.get('[data-test="breadcrumb"]').text()).toContain("2BAC-SM");
  });
});

describe("AdminView status filter", () => {
  const mixed = [fileAt("done1", ["A"], true), fileAt("todo1", ["A"], false)];

  it("defaults to 'À classer' and hides classified rows", async () => {
    const { w } = await mountAdminWith(mixed);
    expect(w.text()).toContain("todo1.pdf");
    expect(w.text()).not.toContain("done1.pdf");
  });

  it("shows classified rows under 'Classés' and both under 'Tous'", async () => {
    const { w } = await mountAdminWith(mixed);
    await w.get('[data-test="status-done"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("done1.pdf");
    expect(w.text()).not.toContain("todo1.pdf");

    await w.get('[data-test="status-all"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("done1.pdf");
    expect(w.text()).toContain("todo1.pdf");
  });

  it("keeps the chosen status when moving to another folder", async () => {
    const { w } = await mountAdminWith([...mixed, fileAt("done2", ["B"], true)]);
    await w.get('[data-test="status-done"]').trigger("click");
    await flushPromises();
    await openFolder(w, "B");
    expect(w.text()).toContain("done2.pdf"); // still on "Classés", not reset to "À classer"
  });

  it("counts the folder scope and ignores the search box", async () => {
    const { w } = await mountAdminWith(mixed);
    const before = w.get('[data-test="status-todo"]').text();
    expect(before).toContain("1");
    await w.get('[data-test="search"] input').setValue("zzz-no-match");
    await flushPromises();
    expect(w.get('[data-test="status-todo"]').text()).toBe(before);
  });

  it("names the fields an unclassified row is missing", async () => {
    const { w } = await mountAdminWith([fileAt("todo1", ["A"], false)]);
    expect(w.text()).toContain("Niveau");
    expect(w.text()).toContain("Chapitre");
  });
});

describe("AdminView row selection", () => {
  // 30 unclassified files in one folder: more than one page at 25 per page.
  const many = Array.from({ length: 30 }, (_, i) => fileAt(`f${i}`, ["A"], false));

  it("selects every row in the filtered scope, not just the visible page", async () => {
    const { w } = await mountAdminWith(many);
    await w.get('[data-test="select-all"] input').setValue(true);
    await flushPromises();
    expect(w.get('[data-test="selection-bar"]').text()).toContain("30");
  });

  it("clears the selection when the folder changes", async () => {
    const { w } = await mountAdminWith([fileAt("a1", ["A"]), fileAt("b1", ["B"])]);
    await openFolder(w, "A");
    await w.get('[data-test="select-all"] input').setValue(true);
    await flushPromises();
    expect(w.find('[data-test="selection-bar"]').exists()).toBe(true);

    await openFolder(w, "B");
    expect(w.find('[data-test="selection-bar"]').exists()).toBe(false);
  });

  it("hides the selection bar when nothing is selected", async () => {
    const { w } = await mountAdminWith([fileAt("a1", ["A"])]);
    expect(w.find('[data-test="selection-bar"]').exists()).toBe(false);
  });
});
