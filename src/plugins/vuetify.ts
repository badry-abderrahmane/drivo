import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";

export default createVuetify({
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        dark: false,
        colors: {
          // #C2540A, not the #E2610A of the logo tile: white text on the brand orange
          // needs 4.5:1 and #E2610A gives 3.53:1. The tile is a graphical object and
          // only needs 3:1, so the mark keeps the brighter value.
          primary: "#C2540A",
          "on-primary": "#FFFFFF",
          "primary-container": "#FCEBDB",
          "on-primary-container": "#7A3405",
          secondary: "#14528C",
          "on-secondary": "#FFFFFF",
          "secondary-container": "#E7EFF7",
          "on-secondary-container": "#0E3A66",
          tertiary: "#8A6A3F",
          "on-tertiary": "#FFFFFF",
          "tertiary-container": "#F3E7D6",
          "on-tertiary-container": "#3D2A12",
          background: "#FFF9F4",
          "on-background": "#1A1207",
          surface: "#FFFFFF",
          "on-surface": "#1A1207",
          "surface-variant": "#F7EFE7",
          "on-surface-variant": "#6B5B4A",
          outline: "#9C8D7C",
          "outline-variant": "#EFE2D5",
          "surface-tint": "#C2540A",
          error: "#BA1A1A",
          "on-error": "#FFFFFF",
          "error-container": "#FFDAD6",
          "on-error-container": "#410002",
          warning: "#B45309",
          success: "#166534",
          // One hue per document type (src/lib/docType.ts), used with variant="tonal".
          // None of them is the brand orange — orange means "you can act on this", and a
          // type badge is a label. Burgundy for the exam deliberately avoids the error
          // red above, so a failed load never reads as an exam badge.
          "type-cours": "#14528C",
          "type-exercices": "#166534",
          "type-devoir": "#5B21B6",
          "type-examen": "#9A2540",
          "type-video": "#0E6E7A",
          "type-autre": "#6B5B4A",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#FB923C",
          "on-primary": "#2B1002",
          "primary-container": "#7A3405",
          "on-primary-container": "#FFD9B8",
          secondary: "#7FB6E8",
          "on-secondary": "#0E2A47",
          "secondary-container": "#14395E",
          "on-secondary-container": "#D5E6F5",
          tertiary: "#D9BE96",
          "on-tertiary": "#3D2A12",
          "tertiary-container": "#574127",
          "on-tertiary-container": "#F3E7D6",
          // A brown-black, not a neutral grey: the orange has to sit inside the palette
          // rather than glow on top of it.
          background: "#171009",
          "on-background": "#F5EDE4",
          surface: "#201710",
          "on-surface": "#F5EDE4",
          "surface-variant": "#2B2018",
          "on-surface-variant": "#B9A895",
          outline: "#8A7864",
          "outline-variant": "#3A2C21",
          "surface-tint": "#FB923C",
          error: "#FFB4AB",
          "on-error": "#690005",
          "error-container": "#93000A",
          "on-error-container": "#FFDAD6",
          warning: "#FBBF24",
          success: "#4ADE80",
          // Lightened so the tonal chip stays legible on the warm brown-black surface.
          "type-cours": "#AFD2F0",
          "type-exercices": "#8FDCB0",
          "type-devoir": "#CBBEFD",
          "type-examen": "#F5A3B5",
          "type-video": "#8FDDE5",
          "type-autre": "#C7B6A2",
        },
      },
    },
  },
  // "mobile" (useDisplay) drives the bottom nav / filter sheet / hero trim below md (960px) —
  // phones and small tablets. Chosen over the 'lg' default so it doesn't also swallow narrow
  // laptop windows, which just need the existing layout to breathe, not a different paradigm.
  display: {
    mobileBreakpoint: "md",
  },
});
