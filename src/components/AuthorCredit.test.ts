import { describe, it, expect } from "vitest";
import AuthorCredit from "./AuthorCredit.vue";
import { mountWithVuetify } from "../test/setup";

describe("AuthorCredit", () => {
  it("names the teacher with the agreed wording", () => {
    const w = mountWithVuetify(AuthorCredit);
    expect(w.text()).toContain("Documents rassemblés et édités par M. Hassan Badry");
  });

  it("shows his initials", () => {
    const w = mountWithVuetify(AuthorCredit);
    expect(w.text()).toContain("HB");
  });
});
