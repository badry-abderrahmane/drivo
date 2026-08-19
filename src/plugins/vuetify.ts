import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import { DARK_COLORS, LIGHT_COLORS } from "./theme";

export default createVuetify({
  theme: {
    defaultTheme: "light",
    themes: {
      light: { dark: false, colors: LIGHT_COLORS },
      dark: { dark: true, colors: DARK_COLORS },
    },
  },
  // "mobile" (useDisplay) drives the bottom nav / filter sheet / hero trim below md (960px) —
  // phones and small tablets. Chosen over the 'lg' default so it doesn't also swallow narrow
  // laptop windows, which just need the existing layout to breathe, not a different paradigm.
  display: {
    mobileBreakpoint: "md",
  },
});
