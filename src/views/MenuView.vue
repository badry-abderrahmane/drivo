<template>
  <div class="menu-view max-width-xl mx-auto py-8 px-4 px-md-6">
    <div v-if="loading" class="d-flex justify-center pa-12">
      <v-progress-circular indeterminate color="primary" size="48" width="4" />
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" class="ma-4 rounded-xl">
      Impossible de charger la bibliothèque. Réessayez plus tard.
    </v-alert>

    <template v-else>
      <v-alert v-if="stale" type="warning" variant="tonal" class="mb-6 rounded-xl">Hors ligne — données en cache.</v-alert>

      <!-- Level picker -->
      <template v-if="!selectedLevel">
        <div class="mb-8">
          <div class="d-flex align-center ga-2 mb-2">
            <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">
              <v-icon icon="mdi-format-list-checks" size="14" class="mr-1" />
              Programme Officiel
            </v-chip>
          </div>
          <h1 class="text-h4 font-weight-black font-heading mb-2">Menu Thématique</h1>
          <p class="text-body-1 text-medium-emphasis">
            Sélectionnez votre niveau scolaire pour accéder au programme structuré et consulter l'ensemble des fiches et chapitres.
          </p>
        </div>

        <div v-if="levels.length === 0" class="text-medium-emphasis pa-12 text-center bg-surface rounded-2xl border">
          Aucun niveau n'a encore de ressources complètement classées.
        </div>

        <v-row v-else>
          <v-col v-for="lvl in levels" :key="lvl.level" cols="12" sm="6" md="4">
            <v-card
              variant="flat"
              class="level-card rounded-2xl border pa-6 h-100 d-flex flex-column justify-space-between"
              data-test="level-card"
              @click="selectedLevel = lvl.level"
            >
              <div>
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="lvl-icon rounded-xl d-flex align-center justify-center pa-3">
                    <v-icon :icon="getLevelIcon(lvl.level)" color="primary" size="28" />
                  </div>
                  <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold rounded-pill">
                    {{ lvl.count }} ressource{{ lvl.count > 1 ? "s" : "" }}
                  </v-chip>
                </div>
                <h3 class="text-h5 font-weight-bold font-heading mb-1">{{ lvl.level }}</h3>
                <p class="text-caption text-medium-emphasis mb-4">
                  Programme officiel de Physique-Chimie
                </p>
              </div>

              <div class="d-flex align-center justify-space-between pt-3 border-t">
                <span class="text-caption font-weight-semibold color-primary">Voir les thèmes</span>
                <v-icon icon="mdi-arrow-right" class="arrow" color="primary" />
              </div>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <!-- Selected level table -->
      <template v-else>
        <!-- Stacks on phones: side by side, the button takes its width and squeezes the
             title into a column too narrow to fit, so it overflows the screen. -->
        <div class="d-flex flex-column flex-sm-row align-start align-sm-center ga-3 mb-6">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-arrow-left" class="rounded-pill px-4 flex-shrink-0" data-test="back" @click="selectedLevel = null">
            Retour aux niveaux
          </v-btn>
          <h1 class="text-h5 font-weight-bold font-heading page-title">Menu thématique — {{ selectedLevel }}</h1>
        </div>
        <v-alert v-if="currentMenu.types.length === 0" type="info" variant="tonal" class="mb-6 rounded-xl">
          Aucune ressource classée pour ce niveau pour le moment — le programme complet est affiché ci-dessous.
        </v-alert>
        <MenuTable :menu="currentMenu" />
      </template>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import MenuTable from "../components/MenuTable.vue";
import { useLibrary } from "../composables/useLibrary";
import { menuLevels, buildLevelMenu, isMenuReady } from "../lib/menu";
import { slugify, resolveSlug } from "../lib/slug";

const { items, loading, stale, error, ensureLoaded } = useLibrary();

const route = useRoute();
const router = useRouter();

// Selected level lives in the route path, not local state, so Back steps out to the level
// picker instead of leaving the app, and each level is a real, shareable, indexable URL.
const selectedLevel = computed<string | null>({
  get: () => {
    const slug = route.params.level;
    return typeof slug === "string" ? resolveSlug(slug, menuLevels()) : null;
  },
  set: (level) => {
    router.push(level ? { name: "menu-level", params: { level: slugify(level) } } : { name: "menu" });
  },
});

function getLevelIcon(level: string): string {
  if (level.includes("2BAC")) return "mdi-atom";
  if (level.includes("1BAC")) return "mdi-lightning-bolt-outline";
  return "mdi-telescope";
}

// All official program levels are always shown; the count is how many of that
// level's files are fully tagged so far.
const levels = computed(() =>
  menuLevels().map((level) => ({
    level,
    count: items.value.filter((it) => isMenuReady(it) && it.meta.level.includes(level)).length,
  }))
);

const currentMenu = computed(() => buildLevelMenu(items.value, selectedLevel.value ?? ""));

onMounted(ensureLoaded);
</script>

<style scoped>
.max-width-xl {
  max-width: 1200px;
}
.level-card {
  position: relative;
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.level-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--v-theme-primary), 0.4) !important;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.08) !important;
}
.level-card:hover .arrow {
  transform: translateX(4px);
}
.lvl-icon {
  background: rgba(var(--v-theme-primary), 0.1);
}
.arrow {
  transition: transform 0.2s ease;
}
.color-primary {
  color: rgb(var(--v-theme-primary));
}

/* A flex item defaults to min-width:auto and refuses to shrink below its longest word,
   which is what pushed this heading off-screen instead of wrapping. */
.page-title {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
