<template>
  <v-app class="pipc-app">
    <!-- MD3 Quantum Glassmorphism App Bar -->
    <v-app-bar
      flat
      density="comfortable"
      class="app-header px-2 px-md-6 border-b"
    >
      <v-app-bar-title class="d-flex align-center">
        <router-link :to="{ name: 'browse' }" class="d-flex align-center ga-3 text-decoration-none color-inherit">
          <BrandMark :size="42" class="header-mark" data-test="brand-mark" />
          <div class="d-flex flex-column">
            <span class="font-weight-black text-h6 brand-title">
              PIPC
            </span>
            <span class="text-caption text-medium-emphasis brand-subtitle d-none d-sm-inline">
              Physique-Chimie
            </span>
          </div>
        </router-link>
      </v-app-bar-title>

      <v-spacer />

      <!-- Search trigger: opens the command palette (also reachable via Cmd/Ctrl+K) -->
      <button
        v-if="!mobile"
        type="button"
        class="search-trigger rounded-pill d-flex align-center ga-2 mr-2"
        data-test="search-trigger"
        @click="searchOpen = true"
      >
        <v-icon icon="mdi-magnify" size="18" color="medium-emphasis" />
        <span class="text-medium-emphasis text-body-2">Rechercher…</span>
        <v-hotkey keys="cmd+k" class="ml-2" />
      </button>
      <v-btn
        v-else
        icon
        variant="tonal"
        size="small"
        class="rounded-circle mr-2"
        data-test="search-trigger"
        title="Rechercher"
        @click="searchOpen = true"
      >
        <v-icon icon="mdi-magnify" color="primary" />
      </v-btn>

      <!-- MD3 Navigation Segment Pills (desktop / wide screens) -->
      <nav v-if="!mobile" class="d-flex align-center ga-1 bg-surface-variant-subtle pa-1 rounded-pill mr-2">
        <v-btn
          :to="{ name: 'browse' }"
          :variant="route.name === 'browse' ? 'flat' : 'text'"
          :color="route.name === 'browse' ? 'primary' : 'default'"
          size="small"
          class="rounded-pill font-weight-semibold px-4 nav-pill"
          prepend-icon="mdi-atom"
        >
          Parcourir
        </v-btn>

        <v-btn
          :to="{ name: 'menu' }"
          :variant="route.name === 'menu' ? 'flat' : 'text'"
          :color="route.name === 'menu' ? 'primary' : 'default'"
          size="small"
          class="rounded-pill font-weight-semibold px-4 nav-pill"
          prepend-icon="mdi-format-list-checks"
        >
          Menu thématique
        </v-btn>

        <v-btn
          :to="{ name: 'examen-national' }"
          :variant="route.name === 'examen-national' ? 'flat' : 'text'"
          :color="route.name === 'examen-national' ? 'primary' : 'default'"
          size="small"
          class="rounded-pill font-weight-semibold px-4 nav-pill"
          prepend-icon="mdi-certificate-outline"
        >
          Examen National
        </v-btn>

        <v-btn
          :to="{ name: 'admin' }"
          :variant="route.name === 'admin' ? 'flat' : 'text'"
          :color="route.name === 'admin' ? 'primary' : 'default'"
          size="small"
          class="rounded-pill font-weight-semibold px-4 nav-pill"
          prepend-icon="mdi-shield-outline"
        >
          Admin
        </v-btn>
      </nav>

      <!-- Theme Switcher -->
      <v-btn
        icon
        variant="tonal"
        size="small"
        class="rounded-circle theme-toggle-btn"
        :title="theme.global.current.value.dark ? 'Basculer vers le mode clair' : 'Basculer vers le mode sombre'"
        @click="toggleTheme"
      >
        <v-icon :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'" color="primary" />
      </v-btn>
    </v-app-bar>

    <!-- Mobile bottom nav: Admin isn't a student-facing destination, so it stays desktop-only -->
    <v-bottom-navigation v-if="mobile" grow color="primary" class="mobile-bottom-nav">
      <v-btn :to="{ name: 'browse' }" :color="route.name === 'browse' ? 'primary' : undefined">
        <v-icon icon="mdi-atom" />
        Parcourir
      </v-btn>
      <v-btn :to="{ name: 'menu' }" :color="route.name === 'menu' ? 'primary' : undefined">
        <v-icon icon="mdi-format-list-checks" />
        Menu
      </v-btn>
      <v-btn :to="{ name: 'examen-national' }" :color="route.name === 'examen-national' ? 'primary' : undefined">
        <v-icon icon="mdi-certificate-outline" />
        Examen
      </v-btn>
    </v-bottom-navigation>

    <SearchPalette v-model="searchOpen" />

    <v-main class="app-main">
      <router-view />
    </v-main>

    <!-- Footer -->
    <v-footer class="app-footer text-center d-flex flex-column py-6 border-t mt-12 bg-surface">
      <div class="d-flex align-center justify-center ga-2 mb-2">
        <span class="text-caption text-medium-emphasis">E = hν</span>
        <span class="text-caption text-medium-emphasis">·</span>
        <span class="text-caption text-medium-emphasis">λ = h / p</span>
        <span class="text-caption text-medium-emphasis">·</span>
        <span class="text-caption text-medium-emphasis">F = q(E + v × B)</span>
      </div>
      <div class="text-caption text-medium-emphasis">
        PIPC — Portail Interactif de Physique-Chimie © {{ new Date().getFullYear() }}
      </div>
    </v-footer>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useTheme, useDisplay } from "vuetify";
import { INTRO_DURATION_MS, INTRO_EXIT_MS } from "./lib/intro";
import SearchPalette from "./components/SearchPalette.vue";
import BrandMark from "./components/BrandMark.vue";

const route = useRoute();
const theme = useTheme();
const searchOpen = ref(false);
const { mobile } = useDisplay();

const THEME_KEY = "pipc:theme";

function toggleTheme(): void {
  const next = theme.global.current.value.dark ? "light" : "dark";
  theme.global.name.value = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* unavailable — the choice simply does not survive the session */
  }
}

/**
 * Restore the saved theme, then dismiss the splash the shell injected. The mark flies to
 * the header's copy of itself (FLIP: measure both, transform the splash node onto the
 * target) so the intro resolves into the app rather than being curtained away.
 *
 * The timer is unconditional — the splash never waits on data. The backend can take ~50s
 * on a cache miss, and an animation that waits for it stops being an animation.
 */
onMounted(() => {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark" || savedTheme === "light") theme.global.name.value = savedTheme;
  } catch {
    /* unavailable — fall back to the default theme */
  }

  const splash = document.getElementById("pipc-splash");
  if (!splash) return;

  // Count from injection, not from mount: the animation has already been running while
  // the bundle downloaded and parsed, and the visitor should not pay for that twice.
  const startedAt = (window as { __pipcSplashAt?: number }).__pipcSplashAt ?? Date.now();
  const remaining = Math.max(0, INTRO_DURATION_MS - (Date.now() - startedAt));

  window.setTimeout(() => {
    const mark = document.getElementById("pipc-splash-mark");
    const target = document.querySelector<HTMLElement>(".header-mark");
    if (mark && target) {
      const from = mark.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (from.width > 0 && to.width > 0) {
        // transform-origin is center, so the delta has to be measured center-to-center;
        // using the corners would leave the mark off by half the size difference.
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const scale = to.width / from.width;
        mark.style.transition = `transform ${INTRO_EXIT_MS}ms cubic-bezier(.2, .8, .2, 1)`;
        mark.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      }
    }
    splash.classList.add("pipc-out");
    window.setTimeout(() => splash.remove(), INTRO_EXIT_MS);
  }, remaining);
});
</script>

<style scoped>
.pipc-app {
  background: rgb(var(--v-theme-background));
}

.app-header {
  background: rgba(var(--v-theme-surface), 0.85) !important;
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08) !important;
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Vuetify ellipsises the toolbar title's placeholder, which clipped "Physique-Chimie"
   once Plus Jakarta Sans widened the lockup. The brand is a fixed-width element, not
   truncatable text. */
:deep(.v-toolbar-title__placeholder) {
  overflow: visible;
}

.header-mark {
  display: block;
  flex: none;
  transition: transform var(--pipc-fast, 120ms) var(--pipc-ease, cubic-bezier(.2, .8, .2, 1));
}

.header-mark:hover {
  transform: scale(1.04);
}

.brand-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  letter-spacing: -0.5px;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.1;
}

.brand-subtitle {
  font-size: 0.65rem !important;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.color-inherit {
  color: inherit;
}

.search-trigger {
  border: 1px solid rgba(var(--v-border-color), 0.15);
  background: rgba(var(--v-theme-surface-variant), 0.4);
  padding: 6px 12px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.search-trigger:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
  background: rgba(var(--v-theme-surface-variant), 0.6);
}

.bg-surface-variant-subtle {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}

.nav-pill {
  transition: all 0.2s ease;
}

.nav-pill:hover {
  transform: translateY(-1px);
}

.theme-toggle-btn {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-toggle-btn:hover {
  transform: rotate(45deg);
}

.app-footer {
  border-top: 1px solid rgba(var(--v-border-color), 0.08) !important;
}
</style>
