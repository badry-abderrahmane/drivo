<template>
  <div class="menu-view max-width-xl mx-auto py-6 px-4">
    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" class="ma-4">
      Impossible de charger la bibliothèque. Réessayez plus tard.
    </v-alert>

    <template v-else>
      <v-alert v-if="stale" type="warning" variant="tonal" class="mb-4 rounded-xl">Hors ligne — données en cache.</v-alert>

      <!-- Level picker -->
      <template v-if="!selectedLevel">
        <h1 class="text-h5 font-weight-bold mb-1">Menu thématique</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Choisissez un niveau pour voir ses ressources organisées par thème.
        </p>

        <div v-if="levels.length === 0" class="text-medium-emphasis pa-8 text-center">
          Aucun niveau n'a encore de ressources complètement classées.
        </div>

        <v-row v-else>
          <v-col v-for="lvl in levels" :key="lvl.level" cols="12" sm="6" md="4">
            <v-card
              variant="flat"
              class="level-card rounded-xl border pa-5 h-100"
              data-test="level-card"
              @click="selectedLevel = lvl.level"
            >
              <div class="d-flex align-center ga-3 mb-2">
                <div class="lvl-icon rounded-lg d-flex align-center justify-center pa-2">
                  <v-icon icon="mdi-view-list-outline" color="primary" size="24" />
                </div>
                <span class="text-h6 font-weight-bold">{{ lvl.level }}</span>
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ lvl.count }} ressource{{ lvl.count > 1 ? "s" : "" }} classée{{ lvl.count > 1 ? "s" : "" }}
              </div>
              <v-icon icon="mdi-arrow-right" class="arrow" color="primary" />
            </v-card>
          </v-col>
        </v-row>
      </template>

      <!-- Selected level table -->
      <template v-else>
        <div class="d-flex align-center ga-3 mb-4">
          <v-btn variant="text" prepend-icon="mdi-arrow-left" class="rounded-pill" data-test="back" @click="selectedLevel = null">
            Retour
          </v-btn>
          <h1 class="text-h5 font-weight-bold">Menu thématique — {{ selectedLevel }}</h1>
        </div>
        <v-alert v-if="currentMenu.types.length === 0" type="info" variant="tonal" class="mb-4 rounded-xl">
          Aucune ressource classée pour ce niveau pour le moment — le programme complet est affiché ci-dessous.
        </v-alert>
        <MenuTable :menu="currentMenu" @preview="openPreview" />
      </template>
    </template>

    <FilePreview v-model="previewDialog" :item="previewItem" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import MenuTable from "../components/MenuTable.vue";
import FilePreview from "../components/FilePreview.vue";
import { useLibrary } from "../composables/useLibrary";
import { menuLevels, buildLevelMenu, isMenuReady } from "../lib/menu";
import type { LibraryItem } from "../lib/types";

const { items, loading, stale, error, ensureLoaded } = useLibrary();

const selectedLevel = ref<string | null>(null);

// All official program levels are always shown; the count is how many of that
// level's files are fully tagged so far.
const levels = computed(() =>
  menuLevels().map((level) => ({
    level,
    count: items.value.filter((it) => isMenuReady(it) && it.meta.level.includes(level)).length,
  }))
);

const currentMenu = computed(() => buildLevelMenu(items.value, selectedLevel.value ?? ""));

// Preview
const previewDialog = ref(false);
const previewItem = ref<LibraryItem | null>(null);
function openPreview(it: LibraryItem): void {
  previewItem.value = it;
  previewDialog.value = true;
}

onMounted(ensureLoaded);
</script>

<style scoped>
.max-width-xl {
  max-width: 1200px;
}
.level-card {
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}
.level-card:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.35) !important;
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.1) !important;
}
.lvl-icon {
  background: rgba(var(--v-theme-primary), 0.08);
}
.arrow {
  position: absolute;
  right: 16px;
  bottom: 16px;
  opacity: 0.6;
}
</style>
