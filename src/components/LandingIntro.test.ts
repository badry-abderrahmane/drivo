import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "../test/setup";
import type { LibraryItem } from "../lib/types";

const quote = { text: "Petit à petit, l'oiseau fait son nid." };
const attributed = { text: "L'imagination est plus importante que le savoir.", author: "Albert Einstein" };

/** A fully classified file — the only kind the counts are allowed to see. */
const file = (id: string, level: string, chapter: string): LibraryItem => ({
  fileId: id, name: `${id}.pdf`, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: {
    fileId: id, level: [level], type: "Cours", subject: "Physique", chapter: [chapter],
    title: id, description: "", tags: [], order: 1,
  },
});

const unclassified = (id: string): LibraryItem => ({
  fileId: id, name: `${id}.pdf`, mimeType: "application/pdf", path: [], webViewLink: "u",
  modifiedTime: "2026-01-01T00:00:00.000Z", isFolder: false, displayTitle: id,
  meta: {
    fileId: id, level: [], type: "", subject: "", chapter: [],
    title: id, description: "", tags: [], order: 1,
  },
});

beforeEach(() => vi.resetModules());

// Every mount attaches to document.body and the gate locks body scroll while it is up, so a
// wrapper left mounted leaks that lock into the next test. Unmount them all between tests.
const mounted: VueWrapper[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
});

async function mountLanding(items: LibraryItem[] = [], q = quote, ready = true) {
  vi.doMock("../lib/loadLibrary", () => ({
    loadLibrary: vi.fn().mockResolvedValue({ items, stale: false }),
    readFreshCache: () => null,
    fetchSeed: async () => null,
  }));
  const LandingIntro = (await import("./LandingIntro.vue")).default;
  const w = mountWithVuetify(LandingIntro, {
    props: { quote: q, ready },
    attachTo: document.body,
  });
  await flushPromises();
  mounted.push(w as VueWrapper);
  return w;
}

describe("LandingIntro", () => {
  it("is a labelled dialog, so a screen reader announces it as the gate it is", async () => {
    const w = await mountLanding();
    const root = w.get('[data-test="landing"]');
    expect(root.attributes("role")).toBe("dialog");
    expect(root.attributes("aria-label")).toBeTruthy();
  });

  it("puts focus on Commencer, so the keyboard hint is true", async () => {
    const w = await mountLanding();
    expect(document.activeElement).toBe(w.get('[data-test="landing-start"]').element);
  });

  it("emits start with its mark, so the caller can fly it into the header", async () => {
    const w = await mountLanding();
    await w.get('[data-test="landing-start"]').trigger("click");
    const events = w.emitted("start") as unknown[][];
    expect(events).toHaveLength(1);
    expect(events[0][0]).toBe(w.get('[data-test="landing-mark"]').element);
  });

  it("emits once however many times it is dismissed", async () => {
    // Click and Escape can both arrive; a second flight would put a second mark on screen.
    const w = await mountLanding();
    await w.get('[data-test="landing-start"]').trigger("click");
    await w.get('[data-test="landing"]').trigger("keydown.esc");
    expect(w.emitted("start")).toHaveLength(1);
  });

  it("dismisses on Escape", async () => {
    const w = await mountLanding();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.emitted("start")).toHaveLength(1);
  });

  it("shows no counts until the library answers", async () => {
    // The cold-start case: the backend can take ~50s and the way in must not wait on it.
    const w = await mountLanding([]);
    expect(w.find('[data-test="landing-stats"]').exists()).toBe(false);
    expect(w.find('[data-test="landing-start"]').exists()).toBe(true);
  });

  it("counts only classified files, and counts levels and chapters distinctly", async () => {
    // rAF has to be faked too: the numbers animate up, so without driving frames they would
    // all still read 0 here and the assertion would be measuring the start of the animation.
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout"] });
    const w = await mountLanding([
      file("a", "2ème Bac SM", "Mécanique"),
      file("b", "2ème Bac SM", "Optique"),
      file("c", "1ère Bac", "Mécanique"),
      unclassified("d"),
    ]);
    await vi.advanceTimersByTimeAsync(1200);

    expect(w.get('[data-test="landing-stats"]').text()).toContain("documents");
    // 3 classified files, 2 distinct levels, 2 distinct chapters — "d" is not published.
    expect(w.findAll('[data-test="landing-stats"] b').map((b) => b.text())).toEqual(["3", "2", "2"]);
    vi.useRealTimers();
  });

  it("starts the counts from zero rather than snapping to the total", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout"] });
    const w = await mountLanding([file("a", "2ème Bac SM", "Mécanique")]);
    expect(w.findAll('[data-test="landing-stats"] b').map((b) => b.text())).toEqual(["0", "0", "0"]);
    vi.useRealTimers();
  });

  it("types the proverb out and credits its author", async () => {
    vi.useFakeTimers();
    const w = await mountLanding([], attributed);
    const proverb = () => w.get('[data-test="landing-proverb"]').text();
    expect(proverb()).not.toContain("importante");

    await vi.advanceTimersByTimeAsync(1200 + 32 * 60);
    expect(proverb()).toContain("L'imagination est plus importante");
    expect(proverb()).toContain("Albert Einstein");
    vi.useRealTimers();
  });

  it("labels an unattributed line as a proverb rather than inventing an author", async () => {
    vi.useFakeTimers();
    const w = await mountLanding([], quote);
    await vi.advanceTimersByTimeAsync(1200 + 32 * 60);
    expect(w.get('[data-test="landing-proverb"]').text()).toContain("Proverbe");
    vi.useRealTimers();
  });

  it("shows the full emblem, and hides it from assistive tech", async () => {
    // Every word inside the badge — PIPC and the portal's name — is real text elsewhere on
    // this screen, so announcing the image too would say it all twice.
    const w = await mountLanding();
    const badge = w.get('[data-test="landing-badge"]');
    expect(badge.attributes("src")).toBe("/pipc-badge.png");
    expect(badge.attributes("alt")).toBe("");
    expect(badge.attributes("aria-hidden")).toBe("true");
  });

  it("keeps the emblem inside the element that flies to the header", async () => {
    const w = await mountLanding();
    const mark = w.get('[data-test="landing-mark"]');
    expect(mark.find('[data-test="landing-badge"]').exists()).toBe(true);
  });

  it("leads with the emblem alone — no atom, no second wordmark", async () => {
    // The badge is already a ringed circular mark that spells PIPC, so orbits added a
    // second ring and a PIPC wordmark a second spelling.
    const w = await mountLanding();
    expect(w.find("svg ellipse").exists()).toBe(false);
    expect(w.find("animateMotion").exists()).toBe(false);
    expect(w.get('[data-test="landing-badge"]').attributes("width")).toBe("280");
  });

  it("still has a heading, since the emblem is hidden from assistive tech", async () => {
    const w = await mountLanding();
    expect(w.get("h1").text()).toContain("Portail Interactif de Physique-Chimie");
  });

  it("keeps everything scrollable inside one centred sheet", async () => {
    // Structure the phone fix depends on: the sheet is centred with `margin: auto`, because
    // `justify-content: center` on a scroll container pushes overflow past the top edge
    // where it cannot be reached — which is exactly how the emblem got cut off.
    const w = await mountLanding();
    const sheet = w.get(".sheet");
    expect(sheet.find('[data-test="landing-mark"]').exists()).toBe(true);
    expect(sheet.find('[data-test="landing-start"]').exists()).toBe(true);
    expect(sheet.find('[data-test="landing-proverb"]').exists()).toBe(true);
  });

  it("reuses AuthorCredit rather than restating his details", async () => {
    const w = await mountLanding();
    const credit = w.getComponent({ name: "AuthorCredit" });
    expect(credit.props("tone")).toBe("on-color");
  });

  it("locks the page behind it, and hands scrolling back when it leaves", async () => {
    // The gate is a fixed sheet over a live page: without this, scrolling past its own
    // content chains into the app underneath and scrolls a page nobody can see.
    const w = await mountLanding();
    expect(document.body.style.overflow).toBe("hidden");
    w.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps Tab inside the gate, so focus cannot land on the app behind it", async () => {
    // aria-modal only silences the background for screen readers. Without containment the
    // keyboard walks straight into the header links hidden under the sheet.
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const w = await mountLanding();
    outside.focus();

    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(w.get('[data-test="landing-start"]').element);
    outside.remove();
  });

  it("ignores keys while the shell splash is still covering it", async () => {
    // The gate mounts under the splash so the opening flight has a mark to land on. Until
    // the splash clears, an Escape would dismiss a screen the visitor has not seen yet.
    const w = await mountLanding([], quote, false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.emitted("start")).toBeUndefined();
  });

  it("does not take focus out from under the splash", async () => {
    const w = await mountLanding([], quote, false);
    expect(document.activeElement).not.toBe(w.get('[data-test="landing-start"]').element);
  });

  it("wakes up once the splash has cleared", async () => {
    const w = await mountLanding([], quote, false);
    await w.setProps({ ready: true });
    expect(document.activeElement).toBe(w.get('[data-test="landing-start"]').element);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.emitted("start")).toHaveLength(1);
  });
});
