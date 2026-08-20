<template>
  <!-- Desktop only. On phones the filter bar is dropped entirely rather than folded into a
       sheet: the level -> chapter unfolding cards are the mobile way in, and the command
       palette covers search, so a filter panel there was a control looking for a use. -->
  <div v-if="!mobile" class="filter-container mb-4">
    <FilterControlsPanel
      :items="items"
      :model-value="local"
      @update:model-value="onControlsChange"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import { useDisplay } from "vuetify";
import FilterControlsPanel from "./FilterControlsPanel.vue";
import { syncFilters, type Filters } from "../lib/filter";
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
    syncFilters(local, val);
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
  syncFilters(local, val);
  emitChange();
}
</script>

