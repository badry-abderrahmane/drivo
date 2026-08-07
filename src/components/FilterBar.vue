<template>
  <div class="filter-container  mb-6">
    <!-- Main Search Card -->
    <div class="rounded-2xl border  pa-5 filter-card rounded-xl elevation-1">
      <!-- Search Input -->
      <v-text-field
        data-test="search"
        v-model="local.search"
        placeholder="Rechercher par titre de cours, formule, chapitre ou mot-clé..."
        variant="solo-filled"
        flat
        density="comfortable"
        clearable
        hide-details
        prepend-inner-icon="mdi-magnify"
        class="search-input rounded-xl"
        :class="{ 'mb-4': !mobile }"
        @update:model-value="emitChange"
      />

      <!-- Desktop / wide screens: filters stay inline, right under search -->
      <FilterControlsPanel
        v-if="!mobile"
        :items="items"
        :model-value="local"
        @update:model-value="onControlsChange"
      />

      <!-- Mobile: filters live behind a button, so search isn't buried under chips -->
      <template v-else>
        <v-btn
          variant="tonal"
          color="primary"
          class="rounded-pill mt-4"
          prepend-icon="mdi-tune-variant"
          data-test="mobile-filters-trigger"
          @click="openSheet"
        >
          Filtres
          <v-chip
            v-if="mobileFilterCount > 0"
            size="x-small"
            color="primary"
            variant="flat"
            class="ml-2 font-weight-bold"
          >
            {{ mobileFilterCount }}
          </v-chip>
        </v-btn>

        <v-bottom-sheet v-model="sheetOpen">
          <v-card class="rounded-t-xl pa-4" data-test="mobile-filters-sheet">
            <FilterControlsPanel
              :items="items"
              :model-value="draft"
              chip-size="large"
              show-divider
              @update:model-value="onDraftChange"
            />

            <div class="d-flex ga-3 mt-4">
              <v-btn
                variant="outlined"
                color="default"
                class="rounded-pill flex-grow-1"
                data-test="mobile-filters-cancel"
                @click="cancelDraft"
              >
                Annuler
              </v-btn>
              <v-btn
                variant="flat"
                color="primary"
                class="rounded-pill flex-grow-1"
                data-test="mobile-filters-apply"
                @click="applyDraft"
              >
                Filtrer
              </v-btn>
            </div>
          </v-card>
        </v-bottom-sheet>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useDisplay } from "vuetify";
import FilterControlsPanel from "./FilterControlsPanel.vue";
import type { Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

const props = defineProps<{ items: LibraryItem[]; modelValue: Filters }>();
const emit = defineEmits<{ "update:modelValue": [Filters] }>();

const { mobile } = useDisplay();
const sheetOpen = ref(false);

const local = reactive<Filters>({ ...props.modelValue });

// Mobile only: chip taps inside the sheet edit this draft, not `local` directly, so
// results only update once "Filtrer" is tapped — "Annuler" just discards it.
const draft = reactive<Filters>({ ...props.modelValue });

watch(
  local,
  () => {
    emitChange();
  },
  { deep: true }
);

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

// FilterControlsPanel manages level/type/subject/chapter (and passes search through
// untouched) with the exact same v-model contract this component has with its own
// parent — so a "reset everything" from inside the panel also clears search here.
function onControlsChange(val: Filters): void {
  Object.assign(local, val);
  emitChange();
}

function onDraftChange(val: Filters): void {
  Object.assign(draft, val);
}

function openSheet(): void {
  Object.assign(draft, local);
  sheetOpen.value = true;
}

function applyDraft(): void {
  Object.assign(local, draft);
  emitChange();
  sheetOpen.value = false;
}

function cancelDraft(): void {
  sheetOpen.value = false;
}

// Badge on the mobile "Filtres" button — search isn't counted, it has its own visible box.
const mobileFilterCount = computed(() => {
  let count = 0;
  if (local.level) count++;
  if (local.type) count++;
  if (local.subject) count++;
  if (local.chapter) count++;
  return count;
});
</script>

<style scoped>
.filter-card {
  background: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.search-input :deep(.v-field) {
  border-radius: 16px !important;
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
  background: rgba(var(--v-theme-surface-variant), 0.3) !important;
}

.search-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.4) !important;
}

.filter-chip {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-chip:hover {
  transform: translateY(-2px);
}
</style>
