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
          // #1E7A4D, not the #16A34A of the logo tile: white text on the brand green
          // needs 4.5:1 and #16A34A gives 3.30:1. The tile is a graphical object and
          // only needs 3:1, so the mark keeps the brighter value.
          primary: "#1E7A4D",
          "on-primary": "#FFFFFF",
          "primary-container": "#DDF0E5",
          "on-primary-container": "#0B4A2C",
          secondary: "#14528C",
          "on-secondary": "#FFFFFF",
          "secondary-container": "#E7EFF7",
          "on-secondary-container": "#0E3A66",
          // The one warm note left in the palette, and deliberately kept: green, marine
          // and ochre make a coherent triad, and it rhymes with the Exercices badge below.
          tertiary: "#8A6A3F",
          "on-tertiary": "#FFFFFF",
          "tertiary-container": "#F3E7D6",
          "on-tertiary-container": "#3D2A12",
          background: "#F6FBF7",
          "on-background": "#101A14",
          surface: "#FFFFFF",
          "on-surface": "#101A14",
          "surface-variant": "#EDF4EF",
          "on-surface-variant": "#566159",
          outline: "#849489",
          "outline-variant": "#DCE7E0",
          "surface-tint": "#1E7A4D",
          error: "#BA1A1A",
          "on-error": "#FFFFFF",
          "error-container": "#FFDAD6",
          "on-error-container": "#410002",
          warning: "#B45309",
          // Stays green even though the brand is now green: a success state that isn't
          // green costs more in recognition than it gains in separation. It is a darker
          // forest than the brand, and it only ever appears in alerts, never on a control.
          success: "#166534",
          // One hue per document type (src/lib/docType.ts), used with variant="tonal".
          // None of them is the brand green — green means "you can act on this", and a
          // type badge is a label. Exercices is ochre rather than the green it used to be,
          // for exactly that reason. Burgundy for the exam deliberately avoids the error
          // red above, so a failed load never reads as an exam badge.
          "type-cours": "#14528C",
          "type-exercices": "#8A5A11",
          "type-devoir": "#5B21B6",
          "type-examen": "#9A2540",
          "type-video": "#0E6E7A",
          "type-autre": "#5B6560",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#57C98C",
          "on-primary": "#06301C",
          "primary-container": "#0B4A2C",
          "on-primary-container": "#BFEBD3",
          secondary: "#7FB6E8",
          "on-secondary": "#0E2A47",
          "secondary-container": "#14395E",
          "on-secondary-container": "#D5E6F5",
          tertiary: "#D9BE96",
          "on-tertiary": "#3D2A12",
          "tertiary-container": "#574127",
          "on-tertiary-container": "#F3E7D6",
          // A green-black, not a neutral grey: the green has to sit inside the palette
          // rather than glow on top of it.
          background: "#0E1712",
          "on-background": "#E8F0EA",
          surface: "#141F19",
          "on-surface": "#E8F0EA",
          "surface-variant": "#1C2A22",
          "on-surface-variant": "#9AAAA0",
          outline: "#7A8C80",
          "outline-variant": "#29372E",
          "surface-tint": "#57C98C",
          error: "#FFB4AB",
          "on-error": "#690005",
          "error-container": "#93000A",
          "on-error-container": "#FFDAD6",
          warning: "#FBBF24",
          success: "#4ADE80",
          // Lightened so the tonal chip stays legible on the green-black surface.
          "type-cours": "#AFD2F0",
          "type-exercices": "#E0B978",
          "type-devoir": "#CBBEFD",
          "type-examen": "#F5A3B5",
          "type-video": "#8FDDE5",
          "type-autre": "#AEBDB4",
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
