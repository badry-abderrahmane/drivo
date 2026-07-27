import { describe, it, expect, vi } from "vitest";
import { mountWithVuetify } from "../test/setup";
import { flushPromises } from "@vue/test-utils";
import PasswordGate from "./PasswordGate.vue";

describe("PasswordGate", () => {
  it("emits unlocked with the password when validation succeeds", async () => {
    const validate = vi.fn().mockResolvedValue({ ok: true });
    const w = mountWithVuetify(PasswordGate, { props: { validate } });
    await w.get('input[type="password"]').setValue("secret");
    await w.get('[data-test="unlock"]').trigger("click");
    await flushPromises();
    expect(validate).toHaveBeenCalledWith("secret", []);
    expect(w.emitted("unlocked")?.[0]).toEqual(["secret"]);
  });

  it("shows an error and does not emit when validation fails", async () => {
    const validate = vi.fn().mockResolvedValue({ ok: false, error: "unauthorized" });
    const w = mountWithVuetify(PasswordGate, { props: { validate } });
    await w.get('input[type="password"]').setValue("wrong");
    await w.get('[data-test="unlock"]').trigger("click");
    await flushPromises();
    expect(w.emitted("unlocked")).toBeUndefined();
    expect(w.text()).toContain("Mot de passe incorrect");
  });
});
