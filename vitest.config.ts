import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    // Git worktrees live under .claude/worktrees/ — inside the repo. Without this the
    // runner collects every test twice, once per checkout, and the copies fail on
    // dependency resolution: a confusing red suite that says nothing about the code.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
    server: { deps: { inline: ["vuetify"] } },
  },
});
