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

    <!-- Skeleton Loading State -->
    <div v-if="loading" class="py-4">
      <v-row>
        <v-col v-for="i in 8" :key="i" cols="12" sm="6" md="4" lg="3">
          <div class="card-skeleton rounded-xl border" data-test="card-skeleton">
            <div class="sk-chip"></div>
            <div class="sk-line sk-line-lg"></div>
            <div class="sk-line sk-line-md"></div>
            <div class="sk-foot"></div>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- Main Content -->
    <template v-else-if="!error">
      <!-- PIPC Physics Hero Banner -->
      <!-- <div class="hero-banner entrance-block rounded-xl pa-6 pa-md-8 mb-8 border relative overflow-hidden">
        <div class="quantum-bg-glow"></div>
        <v-row align="center">
          <v-col cols="12" md="8">
            <div class="d-flex align-center ga-2 mb-3">
              <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
                <v-icon icon="mdi-atom" size="14" class="mr-1" />
                Portail Académique
              </v-chip>
              <v-chip color="secondary" variant="tonal" size="small" class="font-weight-medium">
                Moroccan Physics Curriculum
              </v-chip>
            </div>
            <h1 class="text-h4 text-md-h3 font-weight-black hero-title mb-3">
              Ressources de <span class="text-gradient">Physique & Chimie</span>
            </h1>
            <p class="d-none d-md-block text-body-1 text-medium-emphasis mb-4 max-w-600">
              Explorez les cours, exercices corrigés, travaux pratiques et examens classés par niveau et chapitre.
            </p>
            <div class="d-flex flex-wrap ga-3">
              <div class="hero-stat-pill rounded-pill px-3 py-1 bg-surface border text-caption font-weight-bold d-flex align-center ga-1">
                <v-icon icon="mdi-book-open-page-variant-outline" size="14" color="medium-emphasis" />
                <span>{{ published.length }} Documents de cours</span>
              </div>
              <div class="hero-stat-pill rounded-pill px-3 py-1 bg-surface border text-caption font-weight-bold d-flex align-center ga-1">
                <v-icon icon="mdi-school-outline" size="14" color="secondary" />
                <span>2BAC · 1BAC · Tronc Commun</span>
              </div>
            </div>
          </v-col>
        </v-row>
      </div> -->

      <!-- Filter Bar. Root only: /niveau/:level and /niveau/:chapitre are the click-through
           browser, where the route itself is the filter. Offering a second, independent set
           of controls there let a level page and a level filter disagree about what you were
           looking at. -->
      <div v-if="atRoot" class="entrance-block entrance-filter">
        <FilterBar :items="published" v-model="filters" />
      </div>

      <!-- Nothing published yet: distinct from "your filters match nothing", so it does not
           offer a filter reset that would change nothing. Independent of filtering state. -->
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

      <!-- Actively filtering/searching: flat results view. UnfoldingCards is a pure
           click-through browser (level -> chapter -> docs) with no concept of search
           results, so filtered results still need this flat, filterable rendering. -->
      <template v-else-if="filtering">
        <!-- Sized up a step across the whole line: this row is the header of the results,
             not a footnote to them, so the count, the state chips and both controls read
             at the same weight as the cards below rather than shrinking away from them. -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-4 mb-4 px-1">
          <div class="d-flex align-center ga-3">
            <span class="text-h6 font-weight-bold">
              {{ shown.length }} résultat{{ shown.length > 1 ? "s" : "" }}
            </span>
            <v-btn
              size="default"
              variant="tonal"
              color="error"
              prepend-icon="mdi-filter-remove-outline"
              class="rounded"
              data-test="clear-filters"
              @click="resetFilters"
            >
              Vider les filtres
            </v-btn>
            <!-- Shown while a cached page refreshes behind the scenes, so nothing on screen is
                 silently out of date. -->
            <v-chip
              v-if="refreshing"
              size="default"
              variant="tonal"
              data-test="refreshing"
              prepend-icon="mdi-sync"
            >
              Mise à jour…
            </v-chip>
          </div>

          <!-- View Mode Switcher -->
          <div class="d-flex align-center ga-1 bg-surface rounded-pill border pa-1">
            <v-btn
              size="default"
              :variant="userViewMode === 'grid' ? 'flat' : 'text'"
              :color="userViewMode === 'grid' ? 'primary' : 'default'"
              class="rounded-pill px-4"
              prepend-icon="mdi-grid"
              @click="userViewMode = 'grid'"
            >
              Grille
            </v-btn>
            <v-btn
              size="default"
              :variant="userViewMode === 'list' ? 'flat' : 'text'"
              :color="userViewMode === 'list' ? 'primary' : 'default'"
              class="rounded-pill px-4"
              prepend-icon="mdi-format-list-bulleted"
              @click="userViewMode = 'list'"
            >
              Liste
            </v-btn>
          </div>
        </div>

        <!-- Empty State -->
        <v-card v-if="shown.length === 0" class="text-center py-12 px-4 rounded-2xl border-0 shadow-sm" elevation="0">
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

        <!-- Flat Paginated View (Grid or List Mode) -->
        <v-data-iterator v-else :items="shown" :items-per-page="24">
          <template #default="{ items: page }">
            <div v-if="userViewMode === 'list'" class="d-flex flex-column ga-3">
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

      <!-- Not filtering: browse by level -> chapter -> docs -->
      <UnfoldingCards v-else :items="published" />
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import FilterBar from "../components/FilterBar.vue";
import FileCard from "../components/FileCard.vue";
import UnfoldingCards from "../components/UnfoldingCards.vue";
import { useLibrary } from "../composables/useLibrary";
import { applyFilters, sortItems, type Filters } from "../lib/filter";
import { isClassified } from "../lib/classification";

const { items, loading, refreshing, stale, error, ensureLoaded } = useLibrary();
const route = useRoute();

/**
 * Only classified files are shown to students: a file needs its Niveau, Type, Matière and
 * at least one Chapitre before it appears anywhere in this view. Everything downstream
 * (counts, filters, grouping) reads this, never the raw library. The admin still sees all
 * files — it reads useLibrary directly.
 */
const published = computed(() => items.value.filter((it) => isClassified(it.meta)));

// A search from the command palette's "Voir tous les résultats" link arrives as ?search=.
// This is a one-way seed (URL -> filters, never back), but it has to be a watcher rather
// than a read at setup: the browse route stays mounted across a query-only navigation
// (e.g. clicking that link while already on this page), so setup() alone would miss it.
const filters = ref<Filters>({});
watch(
  () => route.query.search,
  (q) => {
    filters.value = { ...filters.value, search: typeof q === "string" ? q : undefined };
  },
  { immediate: true }
);
// List, not grid: a filtered set is being scanned — title, type and chapter down a single
// column compare far faster than the same rows spread across a four-across grid.
const userViewMode = ref<"grid" | "list">("list");

/** The browse root, as opposed to the level and chapter routes this same view also serves. */
const atRoot = computed(() => route.name === "browse");

/**
 * Filtering is a root-only state, and gated on the route rather than on the filters alone.
 *
 * Without the gate, drilling from a filtered root into a level kept `filtering` true, so the
 * level page rendered the flat result list for the whole library — with the filter bar now
 * hidden, and no way to tell what was being filtered or to clear it.
 */
const filtering = computed(() => {
  if (!atRoot.value) return false;
  const f = filters.value;
  return !!(f.level || f.type || f.subject || f.chapter || (f.search && f.search.trim()));
});

// This view stays mounted across / -> /niveau/:level, so filters set at the root would
// otherwise still be sitting there on the way back. Leaving the root drops them.
watch(atRoot, (root) => {
  if (!root) filters.value = {};
});

const shown = computed(() => sortItems(applyFilters(published.value, filters.value)));

function resetFilters(): void {
  filters.value = {};
}

onMounted(ensureLoaded);
</script>

<style scoped>
/* A skeleton should be the shape of the thing it becomes: chip, two title lines and an
   action row, matching FileCard's real geometry rather than Vuetify's generic card. */
.card-skeleton {
  background: rgb(var(--v-theme-surface));
  padding: 16px;
  height: 100%;
}

.card-skeleton > * {
  background: linear-gradient(
    100deg,
    rgba(var(--v-theme-on-surface), 0.06) 30%,
    rgba(var(--v-theme-on-surface), 0.12) 50%,
    rgba(var(--v-theme-on-surface), 0.06) 70%
  );
  background-size: 220% 100%;
  animation: sk-shimmer 1.5s linear infinite;
  border-radius: 6px;
}

.sk-chip { width: 68px; height: 18px; border-radius: 999px; }
.sk-line { height: 12px; margin-top: 12px; }
.sk-line-lg { width: 92%; }
.sk-line-md { width: 64%; }
.sk-foot { height: 14px; width: 45%; margin-top: 22px; }

@keyframes sk-shimmer {
  from { background-position: 120% 0; }
  to { background-position: -120% 0; }
}

.browse-view {
  max-width: 1400px;
}

.max-w-400 {
  max-width: 400px;
}

.max-w-600 {
  max-width: 600px;
}

.hero-banner {
  background: linear-gradient(135deg, rgba(var(--v-theme-surface), 0.9), rgba(var(--v-theme-surface-variant), 0.4));
  border: 1px solid rgb(var(--v-theme-outline-variant)) !important;
  position: relative;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.04);
}

.hero-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1.15;
}

.text-gradient {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.quantum-bg-glow {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(var(--v-theme-primary), 0.15) 0%, transparent 70%);
  pointer-events: none;
  border-radius: 50%;
}

.hero-stat-pill {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* Page-load entrance: hero, then filter bar, cascade in with a blur-to-focus reveal. */
.entrance-block {
  opacity: 0;
  animation: entranceFocusIn 0.6s ease forwards;
}

.entrance-filter {
  animation-delay: 150ms;
}

@keyframes entranceFocusIn {
  from {
    opacity: 0;
    filter: blur(6px);
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
}
</style>
