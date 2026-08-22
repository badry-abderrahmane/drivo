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
          <!-- The full emblem, at 42px. Its arched lettering does not survive this size, so
               it reads as a mark rather than as words — the wordmark beside it carries the
               name. The favicon is unaffected — it is a static file in public/, still the
               π tile. Hidden from assistive tech: "PIPC" sits next to it as real text. -->
          <img
            :src="BRAND_BADGE"
            alt=""
            aria-hidden="true"
            class="header-mark"
            width="42"
            height="42"
            data-test="brand-mark"
          />
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

        <!-- Admin is reachable at /admin, but not advertised in the nav: it is not a
             student destination. The password gate is what protects it — this only keeps
             it out of the way. -->
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

    <!-- The way in, on the home route only, once per session. Rendered here rather than as a
         route so the URL never changes and deep links stay untouched. -->
    <LandingIntro
      v-if="showLanding"
      :quote="quote"
      :ready="splashGone"
      @start="onLandingStart"
    />

    <v-main class="app-main">
      <!-- Keyed by route NAME, not path: UnfoldingCards drives its drill-down from route
           params, so keying by path would remount it on every level -> chapter step and
           discard the state its own transitions depend on. -->
      <router-view v-slot="{ Component, route: r }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="String(r.name)" />
        </transition>
      </router-view>
    </v-main>

    <!-- Footer -->
    <v-footer class="app-footer border-t mt-12 bg-surface pa-0">
      <v-container class="py-10 px-4 px-md-8">
        <!-- Quote Hero Section -->
        <div class="footer-quote-wrapper mb-10 text-center">
          <v-card variant="outlined" class="footer-quote-card mx-auto pa-6 rounded-xl">
            <v-icon icon="mdi-format-quote-open" size="32" color="primary" class="quote-icon mb-2 opacity-60" />
            <figure class="footer-quote" data-test="footer-quote">
              <blockquote class="text-body-1 text-primary font-weight-medium font-italic">
                « {{ quote.text }} »
              </blockquote>
              <figcaption v-if="quote.author" class="text-caption text-medium-emphasis mt-2 font-weight-semibold">
                — {{ quote.author }}
              </figcaption>
              <figcaption v-else class="text-caption text-disabled mt-2">
                Proverbe
              </figcaption>
            </figure>
          </v-card>
        </div>

        <!-- Main Footer Columns -->
        <v-row class="ga-y-8 mb-8">
          <!-- Column 1: Brand Info -->
          <v-col cols="12" md="4" class="d-flex flex-column align-start">
            <router-link :to="{ name: 'browse' }" class="d-flex align-center ga-3 text-decoration-none color-inherit mb-3">
              <img :src="BRAND_BADGE" alt="" aria-hidden="true" width="40" height="40" />
              <div class="d-flex flex-column">
                <span class="font-weight-black text-h6 brand-title">PIPC</span>
                <span class="text-caption text-medium-emphasis brand-subtitle">Physique-Chimie</span>
              </div>
            </router-link>
            <p class="text-body-2 text-medium-emphasis mb-4 footer-description">
              Portail interactif de révision et ressources de Physique-Chimie pour lycéens et étudiants.
            </p>
          </v-col>

          <!-- Column 2: Quick Links -->
          <v-col cols="12" sm="6" md="4" class="d-flex flex-column">
            <h3 class="text-subtitle-2 font-weight-bold text-uppercase tracking-wider text-high-emphasis mb-3">
              Navigation
            </h3>
            <div class="d-flex flex-column ga-2">
              <router-link
                :to="{ name: 'browse' }"
                class="footer-nav-link text-body-2 text-medium-emphasis d-inline-flex align-center ga-2 text-decoration-none"
              >
                <v-icon icon="mdi-atom" size="16" color="primary" />
                Parcourir les cours
              </router-link>
              <router-link
                :to="{ name: 'menu' }"
                class="footer-nav-link text-body-2 text-medium-emphasis d-inline-flex align-center ga-2 text-decoration-none"
              >
                <v-icon icon="mdi-format-list-checks" size="16" color="primary" />
                Menu thématique
              </router-link>
              <router-link
                :to="{ name: 'examen-national' }"
                class="footer-nav-link text-body-2 text-medium-emphasis d-inline-flex align-center ga-2 text-decoration-none"
              >
                <v-icon icon="mdi-certificate-outline" size="16" color="primary" />
                Examen National
              </router-link>
            </div>
          </v-col>

          <!-- Column 3: Author Credit -->
          <v-col cols="12" sm="6" md="4" class="d-flex flex-column">
            <h3 class="text-subtitle-2 font-weight-bold text-uppercase tracking-wider text-high-emphasis mb-3">
              Enseignant & Auteur
            </h3>
            <v-card variant="flat" class="author-card pa-4 rounded-lg bg-surface-variant-subtle border">
              <AuthorCredit />
            </v-card>
          </v-col>
        </v-row>

        <v-divider class="my-6 border-opacity-25" />

        <!-- Bottom Copyright & Utility Bar -->
        <div class="d-flex flex-column flex-sm-row align-center justify-space-between ga-4 text-caption text-medium-emphasis">
          <div>
            PIPC — Portail Interactif de Physique-Chimie © {{ new Date().getFullYear() }}
          </div>
          <v-btn
            variant="text"
            size="small"
            color="primary"
            class="back-to-top-btn rounded-pill font-weight-semibold text-none"
            append-icon="mdi-arrow-up"
            @click="scrollToTop"
          >
            Haut de page
          </v-btn>
        </div>
      </v-container>
    </v-footer>
  </v-app>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useTheme, useDisplay } from "vuetify";
import {
  INTRO_DURATION_MS,
  INTRO_EXIT_MS,
  shouldShowLanding,
  markLandingSeen,
} from "./lib/intro";
import { flyTo } from "./lib/flyTo";
import { BRAND_BADGE } from "./config";
import SearchPalette from "./components/SearchPalette.vue";
import AuthorCredit from "./components/AuthorCredit.vue";
import LandingIntro from "./components/LandingIntro.vue";
import { randomQuote } from "./lib/quotes";

const route = useRoute();
const theme = useTheme();
const searchOpen = ref(false);
const { mobile } = useDisplay();

// Chosen once per page load, not per navigation: a quotation that changed under the
// reader every time they opened a document would be a distraction, not a note.
const quote = randomQuote();

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

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Long enough to read as a flight rather than a cut, short enough not to be a wait. */
const LANDING_EXIT_MS = 620;

/**
 * Whether the shell's splash has finished covering the screen.
 *
 * Read at setup, not in onMounted: the inline script at the top of <body> has already run
 * by the time this module executes, so the node is there to find. The landing has to mount
 * underneath the splash — the opening flight needs its emblem to land on — and this is what
 * tells it to hold its typing, its counts and its key handler until it is actually visible.
 */
const splashGone = ref(!document.getElementById("pipc-splash"));

/**
 * Decided once, from the first route the app resolves — deliberately not a computed. The
 * landing answers "how did you arrive", and re-evaluating it per navigation would raise the
 * gate again the moment someone clicked the logo to come home.
 *
 * It watches for the first *named* route rather than reading route.name at setup: main.ts
 * mounts without awaiting the router, so at setup the route is still START_LOCATION and its
 * name is undefined. Reading it there means the gate never appears in production, while
 * every test that resolves the router before mounting still passes. The flag is what keeps
 * this a boot-time decision: later navigations run the watcher but change nothing.
 */
const showLanding = ref(false);
let landingDecided = false;
watch(
  () => route.name,
  (name) => {
    if (landingDecided || !name) return;
    landingDecided = true;
    showLanding.value = shouldShowLanding(name);
  },
  { immediate: true }
);

/**
 * Commencer: the mark flies out of the landing and into the header, the same FLIP the
 * splash uses. The landing is only removed once the flight is over, so the mark has
 * somewhere to fly from.
 */
function onLandingStart(mark: HTMLElement | null): void {
  markLandingSeen();
  const target = document.querySelector(".header-mark");
  const flew = mark && target ? flyTo(mark, target, LANDING_EXIT_MS) : false;
  // The landing fades itself the moment it emits; App only decides when it is gone.
  window.setTimeout(() => {
    showLanding.value = false;
  }, flew ? LANDING_EXIT_MS : 0);
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
    // Where the splash resolves depends on what is on screen behind it. With the landing up
    // the header is covered, so flying there would land the mark somewhere nobody can see:
    // it flies into the landing's nucleus instead, and the header gets its turn on Commencer.
    const target =
      document.querySelector<HTMLElement>('[data-test="landing-mark"]') ??
      document.querySelector<HTMLElement>(".header-mark");
    if (mark && target) flyTo(mark, target, INTRO_EXIT_MS);
    splash.classList.add("pipc-out");
    window.setTimeout(() => {
      splash.remove();
      splashGone.value = true;
    }, INTRO_EXIT_MS);
  }, remaining);
});
</script>

<style scoped>
.pipc-app {
  background: rgb(var(--v-theme-background));
}

.header-mark {
  display: block;
  flex: none;
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

.footer-quote-card {
  max-width: 680px;
  background: rgba(var(--v-theme-surface-variant), 0.25);
  border-color: rgba(var(--v-border-color), 0.12) !important;
  backdrop-filter: blur(8px);
}

.footer-quote {
  max-width: 62ch;
  margin-inline: auto;
}

.footer-quote blockquote {
  line-height: 1.6;
  letter-spacing: 0.01em;
}

.footer-description {
  max-width: 320px;
  line-height: 1.5;
}

.tracking-wider {
  letter-spacing: 0.05em;
}

.footer-nav-link {
  transition: color 0.2s ease, transform 0.2s ease;
}

.footer-nav-link:hover {
  color: rgb(var(--v-theme-primary)) !important;
  transform: translateX(3px);
}

.author-card {
  border-color: rgba(var(--v-border-color), 0.1) !important;
}

.back-to-top-btn {
  transition: transform 0.2s ease;
}

.back-to-top-btn:hover {
  transform: translateY(-2px);
}

.page-enter-active,
.page-leave-active {
  transition: opacity var(--pipc-base) var(--pipc-ease), transform var(--pipc-base) var(--pipc-ease);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
}
</style>
