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

  it("drops Vuetify's muted grey on a coloured ground, since that rule is !important", () => {
    // .text-medium-emphasis paints `on-background` with !important, which no amount of
    // `color: inherit` in this component can outrank. On the landing's green that renders
    // near-black on green — about 2.5:1. The class has to come off, not be overridden.
    const w = mountWithVuetify(AuthorCredit, { props: { tone: "on-color" } });
    const claim = w.findAll(".credit-line").at(-1)!;
    expect(claim.classes()).not.toContain("text-medium-emphasis");
  });

  it("keeps the muted grey on a light surface, where it is the right colour", () => {
    const w = mountWithVuetify(AuthorCredit);
    const claim = w.findAll(".credit-line").at(-1)!;
    expect(claim.classes()).toContain("text-medium-emphasis");
  });
});
