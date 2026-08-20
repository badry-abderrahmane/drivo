import { describe, it, expect } from "vitest";
import AuthorCredit from "./AuthorCredit.vue";
import { mountWithVuetify } from "../test/setup";
import { AUTHOR_NAME, AUTHOR_ROLE, AUTHOR_PHOTO } from "../config";

describe("AuthorCredit", () => {
  it("leads with the teacher's name and title", () => {
    const w = mountWithVuetify(AuthorCredit);
    expect(w.text()).toContain(`M. ${AUTHOR_NAME}`);
    expect(w.text()).toContain(AUTHOR_ROLE);
  });

  it("keeps the agreed claim about the documents", () => {
    const w = mountWithVuetify(AuthorCredit);
    expect(w.text()).toContain("Documents rassemblés et édités par ses soins");
  });

  it("shows his portrait, labelled with his name", () => {
    const w = mountWithVuetify(AuthorCredit);
    const photo = w.get('[data-test="author-photo"]');
    expect(photo.attributes("src")).toBe(AUTHOR_PHOTO);
    expect(photo.attributes("alt")).toBe(`M. ${AUTHOR_NAME}`);
  });

  it("keeps derived initials underneath as the fallback for a missing photo", () => {
    const w = mountWithVuetify(AuthorCredit);
    const expected = AUTHOR_NAME.split(/\s+/).map((word) => word[0]).join("").toUpperCase();
    expect(w.get(".initials").text()).toBe(expected);
  });
});
