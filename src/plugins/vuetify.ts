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
          primary: "#1565C0",
          "on-primary": "#FFFFFF",
          "primary-container": "#DCE3F9",
          "on-primary-container": "#001B3E",
          secondary: "#00897B",
          "on-secondary": "#FFFFFF",
          "secondary-container": "#CCEBE6",
          "on-secondary-container": "#00201C",
          background: "#F8F9FE",
          surface: "#FFFFFF",
          "surface-variant": "#F0F2FA",
          "on-surface": "#1A1C20",
          "on-surface-variant": "#44474E",
          error: "#BA1A1A",
          warning: "#F57C00",
          success: "#2E7D32",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#9ECBFF",
          "on-primary": "#00326B",
          "primary-container": "#004895",
          "on-primary-container": "#DCE3F9",
          secondary: "#80DFD0",
          "on-secondary": "#003731",
          "secondary-container": "#005047",
          "on-secondary-container": "#CCEBE6",
          background: "#111318",
          surface: "#191C22",
          "surface-variant": "#282C36",
          "on-surface": "#E2E2E9",
          "on-surface-variant": "#C4C6D0",
          error: "#FFB4AB",
          warning: "#FFB74D",
          success: "#81C784",
        },
      },
    },
  },
});
