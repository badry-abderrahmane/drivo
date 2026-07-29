<template>
  <v-container fluid class="browse-view max-width-xl py-6 px-4 px-md-8">
    <!-- Offline / Stale Cache Warning -->
    <v-slide-y-transition>
      <v-alert
        v-if="stale"
        type="warning"
        variant="tonal"
        closable
        icon="mdi-wifi-off"
        class="mb-6 rounded-xl border"
      >
        <template #title>Mode Hors-ligne</template>
        Affichage des données enregistrées en cache. Certaines ressources récentes peuvent manquer.
      </v-alert>
    </v-slide-y-transition>

    <!-- Error Banner -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      icon="mdi-alert-circle-outline"
      class="mb-6 rounded-xl border"
    >
      <template #title>Erreur de chargement</template>
      Impossible de charger la bibliothèque de cours. Veuillez vérifier votre connexion et réessayer.
    </v-alert>

    <!-- Hero Header -->
    <div class="hero-section text-center py-6 px-4 mb-6 rounded-2xl">
      <div class="d-inline-flex align-center ga-2 px-3 py-1 mb-3 rounded-pill bg-primary-subtle border">
        <v-icon icon="mdi-book-open-page-variant" color="primary" size="18" />
        <span class="text-caption font-weight-bold text-primary">
          {{ published.length }} Ressource{{ published.length > 1 ? "s" : "" }} disponible{{ published.length > 1 ? "s" : "" }}
        </span>
      </div>

      <h1 class="text-h4 text-md-h3 font-weight-black tracking-tight mb-2 text-gradient">
        Bibliothèque de Cours
      </h1>
      <p class="text-body-1 text-medium-emphasis max-w-600 mx-auto mb-6">
        Retrouvez tous vos cours, exercices corrigés, devoirs et résumés organisés par niveau et chapitre.
      </p>

      <!-- Quick Level Pills -->
      <div v-if="allLevels.length > 0" class="d-flex align-center justify-center flex-wrap ga-2">
        <v-chip
          v-for="lvl in allLevels"
          :key="lvl"
          size="small"
          variant="tonal"
          :color="filters.level === lvl ? 'primary' : 'default'"
          :class="{ 'font-weight-bold': filters.level === lvl }"
          class="level-pill px-3"
          @click="toggleLevel(lvl)"
        >
          <v-icon icon="mdi-school-outline" size="14" class="mr-1" />
          {{ lvl }}
        </v-chip>
      </div>
    </div>

    <!-- Skeleton Loading State -->
    <div v-if="loading" class="py-4">
      <v-row>
        <v-col v-for="i in 8" :key="i" cols="12" sm="6" md="4" lg="3">
          <v-skeleton-loader type="card, article" class="rounded-xl border" />
        </v-col>
      </v-row>
    </div>

    <!-- Main Content -->
    <template v-else-if="!error">
      <!-- Filter Bar -->
      <FilterBar :items="published" v-model="filters" />

      <!-- View Controls & Results Counter Header -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4 px-1">
        <div class="d-flex align-center ga-2">
          <span class="text-subtitle-2 font-weight-bold">
            {{ shown.length }} résultat{{ shown.length > 1 ? "s" : "" }}
          </span>
          <v-chip v-if="filtering" size="x-small" color="primary" variant="tonal">
            Filtré
          </v-chip>
        </div>

        <!-- View Mode Switcher -->
        <div class="d-flex align-center ga-1 bg-surface rounded-pill border pa-1">
          <v-btn
            size="x-small"
            :variant="currentLayoutMode === 'grouped' ? 'flat' : 'text'"
            :color="currentLayoutMode === 'grouped' ? 'primary' : 'default'"
            class="rounded-pill px-3"
            prepend-icon="mdi-view-agenda-outline"
            :disabled="filtering"
            @click="userViewMode = 'grouped'"
          >
            Groupé
          </v-btn>
          <v-btn
            size="x-small"
            :variant="currentLayoutMode === 'grid' ? 'flat' : 'text'"
            :color="currentLayoutMode === 'grid' ? 'primary' : 'default'"
            class="rounded-pill px-3"
            prepend-icon="mdi-grid"
            @click="userViewMode = 'grid'"
          >
            Grille
          </v-btn>
          <v-btn
            size="x-small"
            :variant="currentLayoutMode === 'list' ? 'flat' : 'text'"
            :color="currentLayoutMode === 'list' ? 'primary' : 'default'"
            class="rounded-pill px-3"
            prepend-icon="mdi-format-list-bulleted"
            @click="userViewMode = 'list'"
          >
            Liste
          </v-btn>
        </div>
      </div>

      <!-- Nothing published yet: distinct from "your filters match nothing", so it does not
           offer a filter reset that would change nothing. -->
      <v-card
        v-if="published.length === 0"
        data-test="nothing-published"
        class="text-center py-12 px-4 rounded-2xl border-0 shadow-sm"
        elevation="0"
      >
        <v-icon icon="mdi-folder-clock-outline" size="64" color="medium-emphasis" class="mb-4" />
        <h3 class="text-h6 font-weight-bold mb-1">Bibliothèque en préparation</h3>
        <p class="text-body-2 text-medium-emphasis max-w-400 mx-auto">
          Les ressources sont en cours de classement et seront publiées prochainement.
        </p>
      </v-card>

      <!-- Empty State -->
      <v-card v-else-if="shown.length === 0" class="text-center py-12 px-4 rounded-2xl border-0 shadow-sm" elevation="0">
        <v-icon icon="mdi-file-search-outline" size="64" color="medium-emphasis" class="mb-4" />
        <h3 class="text-h6 font-weight-bold mb-1">Aucun résultat trouvé</h3>
        <p class="text-body-2 text-medium-emphasis mb-6 max-w-400 mx-auto">
          Aucun document ne correspond à vos critères de recherche. Essayez de modifier ou de réinitialiser vos filtres.
        </p>
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          class="rounded-pill"
          @click="resetFilters"
        >
          Réinitialiser les filtres
        </v-btn>
      </v-card>

      <!-- Grouped View (Default when not filtering) -->
      <CourseGroups
        v-else-if="currentLayoutMode === 'grouped'"
        :sections="sections"
        :mode="userViewMode === 'list' ? 'list' : 'grid'"
      />

      <!-- Flat Paginated View (Grid or List Mode) -->
      <v-data-iterator v-else :items="shown" :items-per-page="24">
        <template #default="{ items: page }">
          <div v-if="currentLayoutMode === 'list'" class="d-flex flex-column ga-3">
            <FileCard
              v-for="row in page"
              :key="row.raw.fileId"
              :item="row.raw"
              mode="list"
            />
          </div>

          <v-row v-else class="match-height">
            <v-col
              v-for="row in page"
              :key="row.raw.fileId"
              cols="12"
              sm="6"
              md="4"
              lg="3"
              class="d-flex"
            >
              <FileCard :item="row.raw" mode="grid" />
            </v-col>
          </v-row>
        </template>

        <template #footer="{ page, pageCount, prevPage, nextPage }">
          <div v-if="pageCount > 1" class="d-flex align-center justify-center ga-4 pa-6">
            <v-btn
              icon="mdi-chevron-left"
              variant="tonal"
              size="small"
              :disabled="page === 1"
              @click="prevPage"
            />
            <span class="text-body-2 font-weight-medium px-2">Page {{ page }} sur {{ pageCount }}</span>
            <v-btn
              icon="mdi-chevron-right"
              variant="tonal"
              size="small"
              :disabled="page === pageCount"
              @click="nextPage"
            />
          </div>
        </template>
      </v-data-iterator>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import FilterBar from "../components/FilterBar.vue";
import FileCard from "../components/FileCard.vue";
import CourseGroups from "../components/CourseGroups.vue";
import { useLibrary } from "../composables/useLibrary";
import { applyFilters, sortItems, distinctLevels, type Filters } from "../lib/filter";
import { groupCourses } from "../lib/group";
import { isClassified } from "../lib/classification";

const { items, loading, stale, error, ensureLoaded } = useLibrary();

/**
 * Only classified files are shown to students: a file needs its Niveau, Type, Matière and
 * at least one Chapitre before it appears anywhere in this view. Everything downstream
 * (counts, filters, grouping) reads this, never the raw library. The admin still sees all
 * files — it reads useLibrary directly.
 */
const published = computed(() => items.value.filter((it) => isClassified(it.meta)));
const filters = ref<Filters>({});
const userViewMode = ref<"grouped" | "grid" | "list">("grouped");

const filtering = computed(() => {
  const f = filters.value;
  return !!(f.level || f.type || f.subject || f.chapter || (f.search && f.search.trim()));
});

// If user is actively filtering, default layout switches to flat grid/list unless overridden
const currentLayoutMode = computed(() => {
  if (filtering.value) {
    return userViewMode.value === "list" ? "list" : "grid";
  }
  return userViewMode.value;
});

const shown = computed(() => sortItems(applyFilters(published.value, filters.value)));
const sections = computed(() => groupCourses(shown.value));

const allLevels = computed(() => distinctLevels(published.value));

function toggleLevel(lvl: string): void {
  if (filters.value.level === lvl) {
    filters.value = { ...filters.value, level: undefined };
  } else {
    filters.value = { ...filters.value, level: lvl };
  }
}

function resetFilters(): void {
  filters.value = {};
}

onMounted(ensureLoaded);
</script>

<style scoped>
.browse-view {
  max-width: 1400px;
}

.hero-section {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-surface), 1) 100%);
  border: 1px solid rgba(var(--v-border-color), 0.08);
}

.text-gradient {
  background: linear-gradient(135deg, var(--v-theme-primary) 0%, #00897B 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.bg-primary-subtle {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.max-w-600 {
  max-width: 600px;
}

.max-w-400 {
  max-width: 400px;
}

.level-pill {
  transition: all 0.2s ease;
  cursor: pointer;
}

.level-pill:hover {
  transform: translateY(-1px);
}

.tracking-tight {
  letter-spacing: -0.5px;
}
</style>
