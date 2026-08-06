<template>
  <v-app>
    <!-- MD3 Sticky Glassmorphism App Bar -->
    <v-app-bar
      flat
      density="comfortable"
      class="app-header px-2 px-md-4 border-b"
    >
      <v-app-bar-title class="d-flex align-center">
        <router-link :to="{ name: 'browse' }" class="d-flex align-center ga-2 text-decoration-none color-inherit">
          <div class="brand-avatar rounded-lg d-flex align-center justify-center">
            <span class="brand-pi">π</span>
          </div>
          <span class="font-weight-bold text-subtitle-1 text-md-h6 brand-title">
            PIPC
          </span>
        </router-link>
      </v-app-bar-title>

      <v-spacer />

      <!-- MD3 Navigation Segment Pills -->
      <nav class="d-flex align-center ga-1 bg-surface-variant-subtle pa-1 rounded-pill mr-2">
        <v-btn
          :to="{ name: 'browse' }"
          :variant="route.name === 'browse' ? 'flat' : 'text'"
          :color="route.name === 'browse' ? 'primary' : 'default'"
          size="small"
          class="rounded-pill font-weight-medium px-4"
          prepend-icon="mdi-compass-outline"
        >
          Parcourir
        </v-btn>

        <v-btn
          :to="{ name: 'menu' }"
          :variant="route.name === 'menu' ? 'flat' : 'text'"
          :color="route.name === 'menu' ? 'primary' : 'default'"
          size="small"
          class="rounded-pill font-weight-medium px-4"
          prepend-icon="mdi-view-list-outline"
        >
          Menu thématique
        </v-btn>

        <v-btn
          :to="{ name: 'admin' }"
          :variant="route.name === 'admin' ? 'flat' : 'text'"
          :color="route.name === 'admin' ? 'primary' : 'default'"
          size="small"
          class="rounded-pill font-weight-medium px-4"
          prepend-icon="mdi-shield-edit-outline"
        >
          Admin
        </v-btn>
      </nav>

      <!-- Theme Switcher -->
      <v-btn
        icon
        variant="tonal"
        size="small"
        class="rounded-circle"
        :title="theme.global.current.value.dark ? 'Basculer vers le mode clair' : 'Basculer vers le mode sombre'"
        @click="toggleTheme"
      >
        <v-icon :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'" />
      </v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { useTheme } from "vuetify";

const route = useRoute();
const theme = useTheme();

function toggleTheme(): void {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
}
</script>

<style scoped>
.app-header {
  background: rgba(var(--v-theme-surface), 0.85) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1) !important;
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand-avatar {
  background: rgba(var(--v-theme-primary), 0.1);
  width: 38px;
  height: 38px;
}

.brand-pi {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  color: rgb(var(--v-theme-primary));
}

.color-inherit {
  color: inherit;
}

.brand-title {
  font-family: "Orbitron", sans-serif;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: rgb(var(--v-theme-primary));
}

.bg-surface-variant-subtle {
  background-color: rgba(var(--v-theme-surface-variant), 0.6);
}
</style>
