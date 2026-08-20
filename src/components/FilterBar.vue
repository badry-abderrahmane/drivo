<template>
  <!-- Desktop only. On phones the filter bar is dropped entirely rather than folded into a
       sheet: the level -> chapter unfolding cards are the mobile way in, and the command
       palette covers search, so a filter panel there was a control looking for a use. -->
  <div v-if="!mobile" class="filter-container mb-4">
    <div class="rounded border pa-3 filter-card">
      <FilterControlsPanel
        :items="items"
        :model-value="local"
        @update:model-value="onControlsChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import { useDisplay } from "vuetify";
import FilterControlsPanel from "./FilterControlsPanel.vue";
import type { Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

const props = defineProps<{ items: LibraryItem[]; modelValue: Filters }>();
const emit = defineEmits<{ "update:modelValue": [Filters] }>();

const { mobile } = useDisplay();

const local = reactive<Filters>({ ...props.modelValue });

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
</script>

<style scoped>
/* Tinted with primary-container rather than surface, so the filter bar reads as its own
   panel instead of another card. Kept as a token, not a hex, so it follows the theme into
   dark mode and survives the next palette change. */
.filter-card {
  background: rgba(var(--v-theme-primary-container), 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--v-theme-primary), 0.18) !important;
}
</style>
