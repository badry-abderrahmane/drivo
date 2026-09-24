import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import { initAnalytics } from "./lib/analytics";
import { GA_MEASUREMENT_ID } from "./config";
import { pageTitle } from "./lib/pageTitle";
import { useLibrary } from "./composables/useLibrary";
// After the vuetify plugin, so these rules land after Vuetify's own stylesheet.
import "./styles/radius.css";
import "./styles/typography.css";
import "./styles/levelCard.css";

// Production only: a dev server's visits are the developer's, not the audience's.
if (import.meta.env.PROD) {
  const { items } = useLibrary();
  initAnalytics(router, GA_MEASUREMENT_ID, (path) => pageTitle(path, items.value));
}

createApp(App).use(router).use(vuetify).mount("#app");
