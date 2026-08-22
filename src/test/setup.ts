import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import type { Component } from "vue";
import { DISPLAY } from "../plugins/display";

// Vuetify measures layout; jsdom lacks ResizeObserver.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// VListItem scrolls the active item into view on selection; jsdom has no layout engine.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// visualViewport is read by some Vuetify overlay components.
if (!("visualViewport" in globalThis)) {
  (globalThis as Record<string, unknown>).visualViewport = null;
}

/**
 * jsdom reports 1024px. Vuetify's own default mobileBreakpoint is 'lg' (1280), so a harness
 * that omitted the app's display config ran every component test below the breakpoint —
 * i.e. as a phone — while the app itself uses md (960) and would have been a desktop at the
 * same width. That went unnoticed until a component first rendered something different on
 * mobile. Both halves are pinned here now: the app's config, and an explicit viewport.
 */
const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 420;

export function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
}

// Set once, at load: the default a test gets when it does not care about width. Not set per
// mount — several tests choose their own width before mounting (Vuetify's display reads
// innerWidth synchronously as its instance is created), and re-forcing it here would
// silently undo them.
setViewportWidth(DESKTOP_WIDTH);

export function mountWithVuetify<C extends Component>(
  component: C,
  options: ComponentMountingOptions<C> = {}
) {
  const vuetify = createVuetify({ components, directives, display: DISPLAY });
  const globalOpts = options.global ?? {};
  const plugins = globalOpts.plugins ?? [];
  return mount(component, {
    ...options,
    global: { ...globalOpts, plugins: [vuetify, ...plugins] },
  });
}

/**
 * Mount below the mobile breakpoint, for the phone-only branches: the Menu and Examen
 * accordions that replace their tables, and anything else keyed on `mobile`.
 */
export function mountMobileWithVuetify<C extends Component>(
  component: C,
  options: ComponentMountingOptions<C> = {}
) {
  setViewportWidth(MOBILE_WIDTH);
  const vuetify = createVuetify({ components, directives, display: DISPLAY });
  const globalOpts = options.global ?? {};
  const plugins = globalOpts.plugins ?? [];
  return mount(component, {
    ...options,
    global: { ...globalOpts, plugins: [vuetify, ...plugins] },
  });
}
