import { describe, it, expect, afterEach } from "vitest";
import { createRouter, createMemoryHistory, type Router } from "vue-router";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "../test/setup";
import { useLibrary } from "../composables/useLibrary";
import SearchPalette from "./SearchPalette.vue";
import type { LibraryItem } from "../lib/types";

const base = (id: string, title: string) => ({
  fileId: id, name: title, mimeType: "application/pdf", path: [],
  webViewLink: "https://drive/" + id, modifiedTime: "2026-01-01T00:00:00.000Z",
  isFolder: false, displayTitle: title,
});

const mk = (id: string, title: string, over: Partial<LibraryItem["meta"]> = {}): LibraryItem => ({
  ...base(id, title),
  meta: {
    fileId: id, level: ["2ème Bac SM"], type: "Cours", subject: "Physique",
    chapter: [title], title, description: "", tags: [], order: 0, ...over,
  },
});

const unclassified = (id: string, title: string): LibraryItem => ({
  ...base(id, title),
  meta: { fileId: id, level: [], type: "", subject: "", chapter: [], title, description: "", tags: [], order: 0 },
});

let router: Router;

// Vuetify's display composable reads window.innerWidth once, synchronously, when its
// Vuetify instance is created — so this must run before mountWithVuetify, not after.
function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

async function mountPalette(items: LibraryItem[]) {
  useLibrary().items.value = items;
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "browse", component: { template: "<div/>" } },
      { path: "/doc/:fileId/:slug?", name: "doc", component: { template: "<div/>" } },
    ],
  });
  router.push("/");
  await router.isReady();
  document.body.innerHTML = ""; // VDialog content teleports to <body>
  const w = mountWithVuetify(SearchPalette, {
    props: { modelValue: true },
    global: { plugins: [router] },
  });
  await flushPromises();
  return w;
}

function searchInput(): HTMLInputElement {
  return document.querySelector(".v-command-palette input") as HTMLInputElement;
}

async function typeQuery(w: Awaited<ReturnType<typeof mountPalette>>, text: string) {
  const input = searchInput();
  input.value = text;
  input.dispatchEvent(new Event("input"));
  await flushPromises();
  await w.vm.$nextTick();
}

function chipByText(text: string): HTMLElement {
  const chip = Array.from(document.querySelectorAll(".palette-filters .v-chip"))
    .find((el) => el.textContent?.trim() === text);
  if (!chip) throw new Error(`No filter chip with text "${text}"`);
  return chip as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
  setViewportWidth(1024); // back to jsdom's default-ish desktop width
});

describe("SearchPalette", () => {
  it("groups matches by Type and shows a 'voir tous les résultats' link", async () => {
    const w = await mountPalette([
      mk("1", "Le mouvement — Cours", { type: "Cours" }),
      mk("2", "Le mouvement — Exercices", { type: "Exercices" }),
    ]);
    await typeQuery(w, "mouvement");

    const text = document.body.textContent ?? "";
    expect(text).toContain("Cours");
    expect(text).toContain("Exercices");
    expect(text).toContain("Le mouvement — Cours");
    expect(text).toContain("Le mouvement — Exercices");
    expect(text).toContain("Voir tous les résultats (2)");
  });

  it("caps results per Type group", async () => {
    const items = Array.from({ length: 6 }, (_, i) => mk(String(i), `Mouvement ${i}`, { type: "Cours" }));
    const w = await mountPalette(items);
    await typeQuery(w, "mouvement");

    const titles = Array.from(document.querySelectorAll(".v-list-item-title"))
      .map((el) => el.textContent?.trim());
    const shown = items.filter((it) => titles.includes(it.displayTitle));
    expect(shown.length).toBe(4);
    expect(document.body.textContent).toContain("Voir tous les résultats (6)");
  });

  it("excludes unclassified files from results", async () => {
    const w = await mountPalette([unclassified("1", "Brouillon mouvement")]);
    await typeQuery(w, "mouvement");
    expect(document.body.textContent).not.toContain("Brouillon");
  });

  it("navigates to the in-app document page when a result is clicked", async () => {
    const w = await mountPalette([mk("1", "Le mouvement — Cours")]);
    await typeQuery(w, "mouvement");

    (document.querySelector(".v-list-item") as HTMLElement).click();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("doc");
    expect(router.currentRoute.value.params.fileId).toBe("1");
  });

  it("navigates to the browse page with ?search= when 'voir tous les résultats' is clicked", async () => {
    const w = await mountPalette([mk("1", "Le mouvement — Cours")]);
    await typeQuery(w, "mouvement");

    const items = Array.from(document.querySelectorAll(".v-list-item"));
    const seeAll = items.find((el) => el.textContent?.includes("Voir tous les résultats")) as HTMLElement;
    seeAll.click();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("browse");
    expect(router.currentRoute.value.query.search).toBe("mouvement");
  });

  it("shows a hint before typing and a no-match message for an unmatched query", async () => {
    const w = await mountPalette([mk("1", "Le mouvement — Cours")]);
    expect(document.body.textContent).toContain("Tapez pour rechercher");

    await typeQuery(w, "zzz-no-match");
    expect(document.body.textContent).toContain("Aucun résultat pour « zzz-no-match »");
  });

  it("narrows results with a Niveau chip", async () => {
    const w = await mountPalette([
      mk("1", "Mouvement SM", { level: ["2ème Bac SM"] }),
      mk("2", "Mouvement PC", { level: ["2ème Bac PC"] }),
    ]);
    await typeQuery(w, "mouvement");
    expect(document.body.textContent).toContain("Mouvement SM");
    expect(document.body.textContent).toContain("Mouvement PC");

    chipByText("2ème Bac SM").click();
    await flushPromises();

    expect(document.body.textContent).toContain("Mouvement SM");
    expect(document.body.textContent).not.toContain("Mouvement PC");
  });

  it("narrows results with a Type chip, and toggling it off restores the full set", async () => {
    const w = await mountPalette([
      mk("1", "Mouvement — Cours", { type: "Cours" }),
      mk("2", "Mouvement — Exercices", { type: "Exercices" }),
    ]);
    await typeQuery(w, "mouvement");

    chipByText("Exercices").click();
    await flushPromises();
    expect(document.body.textContent).toContain("Mouvement — Exercices");
    expect(document.body.textContent).not.toContain("Mouvement — Cours");

    chipByText("Exercices").click(); // toggle off
    await flushPromises();
    expect(document.body.textContent).toContain("Mouvement — Cours");
    expect(document.body.textContent).toContain("Mouvement — Exercices");
  });

  it("is fullscreen on small (mobile-width) screens", async () => {
    setViewportWidth(375);
    await mountPalette([mk("1", "Le mouvement — Cours")]);
    expect(document.querySelector(".v-dialog--fullscreen")).not.toBeNull();
  });

  it("is not fullscreen on desktop-width screens", async () => {
    setViewportWidth(1280);
    await mountPalette([mk("1", "Le mouvement — Cours")]);
    expect(document.querySelector(".v-dialog--fullscreen")).toBeNull();
  });

  it("resets the chips when the palette is closed and reopened", async () => {
    const w = await mountPalette([
      mk("1", "Mouvement — Cours", { type: "Cours" }),
      mk("2", "Mouvement — Exercices", { type: "Exercices" }),
    ]);
    await typeQuery(w, "mouvement");
    chipByText("Exercices").click();
    await flushPromises();
    expect(document.body.textContent).not.toContain("Mouvement — Cours");

    await w.setProps({ modelValue: false });
    await w.setProps({ modelValue: true });
    await flushPromises();
    await typeQuery(w, "mouvement");

    expect(document.body.textContent).toContain("Mouvement — Cours");
    expect(document.body.textContent).toContain("Mouvement — Exercices");
  });
});
