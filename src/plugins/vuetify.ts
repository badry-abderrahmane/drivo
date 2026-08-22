import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import { DARK_COLORS, LIGHT_COLORS } from "./theme";
import { DISPLAY } from "./display";

export default createVuetify({
  theme: {
    defaultTheme: "light",
    themes: {
      light: { dark: false, colors: LIGHT_COLORS },
      dark: { dark: true, colors: DARK_COLORS },
    },
  },
  // See plugins/display.ts — shared with the test harness so the two cannot drift.
  display: DISPLAY,
});
