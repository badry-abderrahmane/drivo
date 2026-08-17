<template>
  <div class="filter-container mb-4">
    <!-- Main Filters Card -->
    <div class="rounded border pa-3 filter-card">
      <!-- Desktop / wide screens: filters stay inline -->
      <FilterControlsPanel
        v-if="!mobile"
        :items="items"
        :model-value="local"
        @update:model-value="onControlsChange"
      />

      <!-- Mobile: filters live behind a button -->
      <template v-else>
        <v-btn
          variant="tonal"
          color="primary"
          class="rounded-pill"
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

// Badge on the mobile "Filtres" button.
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

.filter-chip {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-chip:hover {
  transform: translateY(-2px);
}
</style>
