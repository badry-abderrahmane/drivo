import { describe, it, expect } from "vitest";
import ContactProfessor from "./ContactProfessor.vue";
import { mountWithVuetify } from "../test/setup";
import { AUTHOR_NAME, AUTHOR_EMAIL, AUTHOR_PHOTO } from "../config";

describe("ContactProfessor", () => {
  it("writes to the teacher's real address", () => {
    const w = mountWithVuetify(ContactProfessor);
    const href = w.get('[data-test="contact-mailto"]').attributes("href")!;
    expect(href.startsWith(`mailto:${AUTHOR_EMAIL}`)).toBe(true);
  });

  it("prefills a subject so his inbox can sort the site's mail from the rest", () => {
    const w = mountWithVuetify(ContactProfessor);
    const href = w.get('[data-test="contact-mailto"]').attributes("href")!;
    const subject = new URL(href).searchParams.get("subject");
    expect(subject).toContain("PIPC");
  });

  it("shows the address as text, so it can be copied without a mail client", () => {
    const w = mountWithVuetify(ContactProfessor);
    expect(w.text()).toContain(AUTHOR_EMAIL);
  });

  it("names the three reasons to write, so the invitation is not just decoration", () => {
    const w = mountWithVuetify(ContactProfessor);
    const text = w.text();
    expect(text).toContain("question");
    expect(text).toContain("signaler");
    expect(text).toContain("bonjour");
  });

  it("shows his portrait, labelled with his name", () => {
    const w = mountWithVuetify(ContactProfessor);
    const photo = w.get('[data-test="contact-photo"]');
    expect(photo.attributes("src")).toBe(AUTHOR_PHOTO);
    expect(photo.attributes("alt")).toBe(`M. ${AUTHOR_NAME}`);
  });
});
