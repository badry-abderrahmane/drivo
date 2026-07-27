<template>
  <div class="filter-container mb-6">
    <!-- Main Search & Quick Filters Card -->
    <div class="rounded-xl border-0 shadow-sm pa-4 filter-card">
      <!-- Search Input -->
      <v-text-field
        data-test="search"
        v-model="local.search"
        placeholder="Rechercher par titre, chapitre ou mot-clé..."
        variant="solo-filled"
        flat
        density="comfortable"
        clearable
        hide-details
        prepend-inner-icon="mdi-magnify"
        class="search-input rounded-lg mb-4"
        @update:model-value="emitChange"
      />

      <!-- Quick Type Filter Chips & Advanced Toggle -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <!-- Quick Type Pills -->
        <div v-if="types.length > 0" class="d-flex align-center flex-wrap ga-2">
          <span class="text-caption text-medium-emphasis font-weight-medium mr-1 d-none d-sm-inline">
            Type :
          </span>
          <v-chip
            size="small"
            variant="tonal"
            :color="!local.type ? 'primary' : 'default'"
            :class="{ 'font-weight-bold': !local.type }"
            class="filter-chip"
            @click="selectType('')"
          >
            Tous
          </v-chip>
          <v-chip
            v-for="t in types"
            :key="t"
            size="small"
            variant="tonal"
            :color="local.type === t ? 'primary' : 'default'"
            :class="{ 'font-weight-bold': local.type === t }"
            class="filter-chip"
            @click="selectType(t)"
          >
            {{ t }}
          </v-chip>
        </div>

        <v-spacer />

        <!-- Actions: Advanced Filter Toggle & Reset -->
        <div class="d-flex align-center ga-2">
          <v-btn
            v-if="hasActiveFilters"
            size="small"
            variant="text"
            color="error"
            prepend-icon="mdi-filter-remove-outline"
            @click="clearFilters"
          >
            Réinitialiser ({{ activeCount }})
          </v-btn>

          <v-btn
            size="small"
            variant="tonal"
            :color="showAdvanced ? 'primary' : 'default'"
            :append-icon="showAdvanced ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            prepend-icon="mdi-tune-variant"
            @click="showAdvanced = !showAdvanced"
          >
            Filtres avancés
          </v-btn>
        </div>
      </div>

      <!-- Advanced Expandable Dropdown Filters -->
      <v-expand-transition>
        <div v-show="showAdvanced" class="pt-4 mt-3 border-t">
          <v-row dense>
            <v-col cols="12" sm="6" md="3">
              <v-select
                label="Niveau"
                :items="levels"
                v-model="local.level"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-school-outline"
                @update:model-value="emitChange"
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-select
                label="Type"
                :items="types"
                v-model="local.type"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-file-document-outline"
                @update:model-value="emitChange"
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-select
                label="Matière"
                :items="subjects"
                v-model="local.subject"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-book-open-variant"
                @update:model-value="emitChange"
              />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-select
                label="Chapitre"
                :items="chapters"
                v-model="local.chapter"
                clearable
                hide-details
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="mdi-bookmark-outline"
                @update:model-value="emitChange"
              />
            </v-col>
          </v-row>
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { distinctValues, distinctChapters, type Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

const props = defineProps<{ items: LibraryItem[]; modelValue: Filters }>();
const emit = defineEmits<{ "update:modelValue": [Filters] }>();

const showAdvanced = ref(false);
const local = reactive<Filters>({ ...props.modelValue });

watch(
  () => props.modelValue,
  (val) => {
    Object.assign(local, val);
  },
  { deep: true }
);

function emitChange(): void {
  emit("update:modelValue", { ...local });
}

function selectType(t: string): void {
  local.type = t || undefined;
  emitChange();
}

function clearFilters(): void {
  local.level = undefined;
  local.type = undefined;
  local.subject = undefined;
  local.chapter = undefined;
  local.search = undefined;
  emitChange();
}

const activeCount = computed(() => {
  let count = 0;
  if (local.level) count++;
  if (local.type) count++;
  if (local.subject) count++;
  if (local.chapter) count++;
  if (local.search && local.search.trim()) count++;
  return count;
});

const hasActiveFilters = computed(() => activeCount.value > 0);

const levels = computed(() => distinctValues(props.items, "level"));
const types = computed(() => distinctValues(props.items, "type"));
const subjects = computed(() => distinctValues(props.items, "subject"));
const chapters = computed(() => distinctChapters(props.items));
</script>

<style scoped>
.filter-card {
  background: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(var(--v-border-color), 0.12) !important;
}

.search-input :deep(.v-field) {
  border-radius: 12px !important;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.filter-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  transform: translateY(-1px);
}
</style>
