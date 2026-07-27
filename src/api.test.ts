import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchManifest, saveMeta } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("fetchManifest", () => {
  it("GETs the backend and returns parsed JSON", async () => {
    const payload = { files: [], meta: [] };
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 })
    );
    const m = await fetchManifest();
    expect(m).toEqual(payload);
    expect(spy).toHaveBeenCalledOnce();
  });
  it("throws on non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    await expect(fetchManifest()).rejects.toThrow();
  });
});

describe("saveMeta", () => {
  it("POSTs text/plain body with password + rows", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const res = await saveMeta("secret", [
      { fileId: "1", level: "", type: "Cours", subject: "", chapter: "", title: "T", description: "", tags: "a,b", order: 0 },
    ]);
    expect(res.ok).toBe(true);
    const [, init] = spy.mock.calls[0];
    expect(init!.method).toBe("POST");
    expect((init!.headers as Record<string, string>)["Content-Type"]).toContain("text/plain");
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({ action: "save", password: "secret" });
    expect(body.rows[0].fileId).toBe("1");
  });
});
