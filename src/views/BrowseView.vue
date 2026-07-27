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
      <v-data-iterator :items="shown" :items-per-page="24">
        <template #default="{ items: page }">
          <v-container fluid>
            <v-row>
              <v-col v-for="row in page" :key="row.raw.fileId" cols="12" sm="6" md="4" lg="3">
                <FileCard :item="row.raw" />
              </v-col>
            </v-row>
          </v-container>
        </template>
        <template #no-data>
          <div class="text-medium-emphasis pa-8 text-center">Aucun résultat.</div>
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
import { useLibrary } from "../composables/useLibrary";
import { applyFilters, sortItems, type Filters } from "../lib/filter";

const { items, loading, stale, error, ensureLoaded } = useLibrary();
const filters = ref<Filters>({});
const shown = computed(() => sortItems(applyFilters(items.value, filters.value)));

onMounted(ensureLoaded);
</script>
