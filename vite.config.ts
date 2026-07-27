import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  base: "/drivo/",
  plugins: [vue(), vuetify({ autoImport: true })],
});
