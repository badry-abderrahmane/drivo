import { describe, it, expect } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import { flushPromises } from "@vue/test-utils";
import { mountWithVuetify } from "./test/setup";
import App from "./App.vue";
import { AUTHOR_NAME, AUTHOR_ROLE } from "./config";

async function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    // The header links to these by name, so every one the app bar references has to exist
    // or VBtn's useLink throws while resolving the :to.
    routes: [
      { path: "/", name: "browse", component: { template: "<div>page</div>" } },
      { path: "/menu", name: "menu", component: { template: "<div/>" } },
      { path: "/examen-national", name: "examen-national", component: { template: "<div/>" } },
      { path: "/admin", name: "admin", component: { template: "<div/>" } },
    ],
  });
  router.push("/");
  await router.isReady();
  const w = mountWithVuetify(App, { global: { plugins: [router] } });
  await flushPromises();
  return w;
}

describe("App footer", () => {
  it("keeps the site copyright", async () => {
    const w = await mountApp();
    expect(w.text()).toContain("PIPC — Portail Interactif de Physique-Chimie");
  });

  it("signs off with the teacher, once, in the footer", async () => {
    const w = await mountApp();
    const credit = w.findAll('[data-test="author-credit"]');
    expect(credit).toHaveLength(1);
    expect(credit[0].text()).toContain(`M. ${AUTHOR_NAME}`);
    expect(credit[0].text()).toContain(AUTHOR_ROLE);
  });

  it("carries no second, hard-coded copy of the credit line", async () => {
    const w = await mountApp();
    expect(w.find('[data-test="footer-credit"]').exists()).toBe(false);
  });
});
