import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
// After the vuetify plugin, so these rules land after Vuetify's own stylesheet.
import "./styles/radius.css";
import "./styles/typography.css";

createApp(App).use(router).use(vuetify).mount("#app");
