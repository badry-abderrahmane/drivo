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
          primary: "#006B5F",
          "on-primary": "#FFFFFF",
          "primary-container": "#CCF8F2",
          "on-primary-container": "#00201C",
          secondary: "#4A3E85",
          "on-secondary": "#FFFFFF",
          "secondary-container": "#E5DEFF",
          "on-secondary-container": "#170053",
          tertiary: "#00658B",
          "on-tertiary": "#FFFFFF",
          "tertiary-container": "#C6E7FF",
          "on-tertiary-container": "#001E2E",
          background: "#F5FBF8",
          "on-background": "#0F1A18",
          surface: "#FFFFFF",
          "on-surface": "#0F1A18",
          "surface-variant": "#E0ECE8",
          "on-surface-variant": "#3F4946",
          outline: "#6F7976",
          "outline-variant": "#BEC9C5",
          "surface-tint": "#006B5F",
          error: "#BA1A1A",
          "on-error": "#FFFFFF",
          "error-container": "#FFDAD6",
          "on-error-container": "#410002",
          warning: "#D97706",
          success: "#059669",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#40E0D0",
          "on-primary": "#003731",
          "primary-container": "#005047",
          "on-primary-container": "#72F8E7",
          secondary: "#C4B5FD",
          "on-secondary": "#2B1D6B",
          "secondary-container": "#33296B",
          "on-secondary-container": "#E5DEFF",
          tertiary: "#7DD3FC",
          "on-tertiary": "#00344A",
          "tertiary-container": "#004C6A",
          "on-tertiary-container": "#C6E7FF",
          background: "#0B0F14",
          "on-background": "#E1E7EC",
          surface: "#131920",
          "on-surface": "#E1E7EC",
          "surface-variant": "#1D2630",
          "on-surface-variant": "#A3B3C2",
          outline: "#697B8B",
          "outline-variant": "#2D3946",
          "surface-tint": "#40E0D0",
          error: "#FFB4AB",
          "on-error": "#690005",
          "error-container": "#93000A",
          "on-error-container": "#FFDAD6",
          warning: "#F59E0B",
          success: "#10B981",
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
