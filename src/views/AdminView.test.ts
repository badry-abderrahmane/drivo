import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import type { LibraryItem } from "../lib/types";

const item: LibraryItem = {
  fileId: "1", name: "raw.pdf", mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: "raw.pdf",
  meta: { fileId: "1", level: "", type: "", subject: "", chapter: "", title: "", description: "", tags: [], order: 0 },
};

beforeEach(() => vi.resetModules());

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
    await w.get('[data-test="cell-title"] input').setValue("Nouveau titre");
    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();
    expect(saveMeta).toHaveBeenCalledTimes(1);
    const [pw, rows] = saveMeta.mock.calls[0];
    expect(pw).toBe("secret");
    expect(rows).toHaveLength(1);
    expect(rows[0].fileId).toBe("1");
    expect(rows[0].title).toBe("Nouveau titre");
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
    await w.get('[data-test="cell-title"] input').setValue("X");
    await w.get('[data-test="save"]').trigger("click");
    await flushPromises();
    const saveBtn = w.get('[data-test="save"]');
    // button is no longer in the loading state (Vuetify sets aria-disabled / loading class)
    expect(saveBtn.classes().join(" ")).not.toContain("v-btn--loading");
  });
});
