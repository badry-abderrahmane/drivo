import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import type { Component } from "vue";

// Vuetify measures layout; jsdom lacks ResizeObserver.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// visualViewport is read by some Vuetify overlay components.
if (!("visualViewport" in globalThis)) {
  (globalThis as Record<string, unknown>).visualViewport = null;
}

export function mountWithVuetify<C extends Component>(
  component: C,
  options: ComponentMountingOptions<C> = {}
) {
  const vuetify = createVuetify({ components, directives });
  const globalOpts = options.global ?? {};
  const plugins = (globalOpts.plugins as unknown[]) ?? [];
  return mount(component, {
    ...options,
    global: { ...globalOpts, plugins: [vuetify, ...plugins] },
  });
}
