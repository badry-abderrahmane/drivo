import { describe, it, expect } from "vitest";
import DocTypeChip from "./DocTypeChip.vue";
import { mountWithVuetify } from "../test/setup";

describe("DocTypeChip", () => {
  it("shows the type", () => {
    const w = mountWithVuetify(DocTypeChip, { props: { type: "Cours" } });
    expect(w.text()).toContain("Cours");
  });

  it("colours each type differently", () => {
    const cours = mountWithVuetify(DocTypeChip, { props: { type: "Cours" } });
    const exos = mountWithVuetify(DocTypeChip, { props: { type: "Exercices" } });
    expect(cours.html()).toContain("type-cours");
    expect(exos.html()).toContain("type-exercices");
    expect(cours.html()).not.toContain("type-exercices");
  });

  it("still renders an unknown type, in the neutral colour", () => {
    const w = mountWithVuetify(DocTypeChip, { props: { type: "Fiche méthode" } });
    expect(w.text()).toContain("Fiche méthode");
    expect(w.html()).toContain("type-autre");
  });

  it("renders nothing when there is no type", () => {
    const w = mountWithVuetify(DocTypeChip, { props: { type: "" } });
    expect(w.find(".v-chip").exists()).toBe(false);
  });
});
