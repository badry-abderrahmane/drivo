import { describe, it, expect, beforeEach } from "vitest";
import { loadAdminPassword, saveAdminPassword, clearAdminPassword } from "./adminAuth";

describe("adminAuth (session-scoped)", () => {
  beforeEach(() => sessionStorage.clear());

  it("returns null when nothing stored", () => {
    expect(loadAdminPassword()).toBeNull();
  });

  it("round-trips the password", () => {
    saveAdminPassword("secret");
    expect(loadAdminPassword()).toBe("secret");
  });

  it("clears the stored password", () => {
    saveAdminPassword("secret");
    clearAdminPassword();
    expect(loadAdminPassword()).toBeNull();
  });
});
