/**
 * The display config, kept as plain data rather than inline in the createVuetify call so the
 * test harness can share it without importing vuetify/styles and the icon font — the same
 * reason plugins/theme.ts exists.
 *
 * "mobile" (useDisplay) drives the bottom nav, the filter sheet, the hero trim, and the
 * accordions that replace the Menu and Examen tables on a phone — below md (960px), so
 * phones and small tablets. Chosen over Vuetify's 'lg' default so it does not also swallow
 * narrow laptop windows, which need the existing layout to breathe rather than a different
 * paradigm.
 *
 * Sharing it is not tidiness. The harness used to build its own Vuetify with no display
 * config at all, so it inherited the 'lg' default and, against jsdom's 1024px viewport,
 * every component test ran as if it were on a phone. Nothing noticed until a component
 * first branched on `mobile`.
 */
export const DISPLAY = { mobileBreakpoint: "md" } as const;
