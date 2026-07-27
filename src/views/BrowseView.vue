<template>
  <div>
    <v-alert v-if="stale" type="warning" variant="tonal" class="ma-4">Hors ligne — données en cache.</v-alert>

    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" class="ma-4">
      Impossible de charger la bibliothèque. Réessayez plus tard.
    </v-alert>

    <template v-else>
      <FilterBar :items="items" v-model="filters" />

      <div v-if="shown.length === 0" class="text-medium-emphasis pa-8 text-center">Aucun résultat.</div>

      <!-- Default: grouped by Niveau → Matière/Chapitre. When filtering/searching,
           a flat paginated grid reads more clearly. -->
      <CourseGroups v-else-if="!filtering" :sections="sections" />

      <v-data-iterator v-else :items="shown" :items-per-page="24">
        <template #default="{ items: page }">
          <v-container fluid>
            <div class="text-medium-emphasis px-1 pb-2">{{ shown.length }} résultat{{ shown.length > 1 ? "s" : "" }}</div>
            <v-row>
              <v-col v-for="row in page" :key="row.raw.fileId" cols="12" sm="6" md="4" lg="3">
                <FileCard :item="row.raw" />
              </v-col>
            </v-row>
          </v-container>
        </template>
        <template #footer="{ page, pageCount, prevPage, nextPage }">
          <div v-if="pageCount > 1" class="d-flex align-center justify-center ga-4 pa-4">
            <v-btn icon="mdi-chevron-left" variant="text" :disabled="page === 1" @click="prevPage" />
            <span>{{ page }} / {{ pageCount }}</span>
            <v-btn icon="mdi-chevron-right" variant="text" :disabled="page === pageCount" @click="nextPage" />
          </div>
        </template>
      </v-data-iterator>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import FilterBar from "../components/FilterBar.vue";
import FileCard from "../components/FileCard.vue";
import CourseGroups from "../components/CourseGroups.vue";
import { useLibrary } from "../composables/useLibrary";
import { applyFilters, sortItems, type Filters } from "../lib/filter";
import { groupCourses } from "../lib/group";

const { items, loading, stale, error, ensureLoaded } = useLibrary();
const filters = ref<Filters>({});

const filtering = computed(() => {
  const f = filters.value;
  return !!(f.level || f.type || f.subject || f.chapter || (f.search && f.search.trim()));
});

const shown = computed(() => sortItems(applyFilters(items.value, filters.value)));
const sections = computed(() => groupCourses(shown.value));

onMounted(ensureLoaded);
</script>
