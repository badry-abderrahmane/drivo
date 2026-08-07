<template>
  <div class="filter-controls">
    <!-- Quick Niveau Filter Chips -->
    <div v-if="levels.length > 0" class="d-flex align-center flex-wrap ga-2 mb-3">
      <span class="text-caption text-medium-emphasis font-weight-bold mr-1 d-none d-sm-inline">
        Niveau :
      </span>
      <v-chip
        :size="chipSize"
        variant="tonal"
        :color="!local.level ? 'primary' : 'default'"
        :class="{ 'font-weight-bold elevation-1': !local.level }"
        class="filter-chip rounded-pill px-3"
        data-test="level-all"
        @click="selectLevel('')"
      >
        Tous
      </v-chip>
      <v-chip
        v-for="lvl in levels"
        :key="lvl"
        :size="chipSize"
        variant="tonal"
        :color="local.level === lvl ? 'primary' : 'default'"
        :class="{ 'font-weight-bold elevation-1': local.level === lvl }"
        class="filter-chip rounded-pill px-3"
        :data-test="`level-${lvl}`"
        @click="selectLevel(lvl)"
      >
        <v-icon icon="mdi-school-outline" size="14" class="mr-1" />
        {{ lvl }}
      </v-chip>
    </div>

    <v-divider v-if="showDivider" class="my-4" />

    <!-- Quick Type Filter Chips & Advanced Toggle -->
    <div class="d-flex align-center justify-space-between flex-wrap ga-3">
      <!-- Quick Type Pills -->
      <div v-if="types.length > 0" class="d-flex align-center flex-wrap ga-2">
        <span class="text-caption text-medium-emphasis font-weight-bold mr-1 d-none d-sm-inline">
          Type :
        </span>
        <v-chip
          :size="chipSize"
          variant="tonal"
          :color="!local.type ? 'primary' : 'default'"
          :class="{ 'font-weight-bold elevation-1': !local.type }"
          class="filter-chip rounded-pill px-3"
          @click="selectType('')"
        >
          Tous
        </v-chip>
        <v-chip
          v-for="t in types"
          :key="t"
          :size="chipSize"
          variant="tonal"
          :color="local.type === t ? 'primary' : 'default'"
          :class="{ 'font-weight-bold elevation-1': local.type === t }"
          class="filter-chip rounded-pill px-3"
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
          class="rounded-pill"
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
          class="rounded-pill px-4"
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
          <v-col cols="12" sm="6" md="6">
            <v-select
              label="Matière"
              :items="subjects"
              v-model="local.subject"
              clearable
              hide-details
              density="comfortable"
              variant="outlined"
              class="rounded-lg"
              prepend-inner-icon="mdi-book-open-variant"
              @update:model-value="emitChange"
            />
          </v-col>
          <v-col cols="12" sm="6" md="6">
            <v-select
              label="Chapitre"
              :items="chapters"
              v-model="local.chapter"
              clearable
              hide-details
              density="comfortable"
              variant="outlined"
              class="rounded-lg"
              prepend-inner-icon="mdi-bookmark-outline"
              @update:model-value="emitChange"
            />
          </v-col>
        </v-row>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { distinctValues, distinctChapters, distinctLevels, type Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

const props = withDefaults(
  defineProps<{
    items: LibraryItem[];
    modelValue: Filters;
    /** Chip size — bumped up for the touch-friendly mobile bottom sheet. */
    chipSize?: "small" | "large";
    /** Divider between the Niveau and Type chip rows — mobile sheet only. */
    showDivider?: boolean;
  }>(),
  {
    chipSize: "small",
    showDivider: false,
  }
);
const emit = defineEmits<{ "update:modelValue": [Filters] }>();

const showAdvanced = ref(false);
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

function selectType(t: string): void {
  local.type = t || undefined;
  emitChange();
}

function selectLevel(lvl: string): void {
  local.level = lvl || undefined;
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

const levels = computed(() => distinctLevels(props.items));
const types = computed(() => distinctValues(props.items, "type"));
const subjects = computed(() => distinctValues(props.items, "subject"));
const chapters = computed(() => {
  const scoped = local.level
    ? props.items.filter((it) => it.meta.level.includes(local.level!))
    : props.items;
  return distinctChapters(scoped);
});

watch(
  () => local.level,
  () => {
    if (local.chapter && !chapters.value.includes(local.chapter)) {
      local.chapter = undefined;
      emitChange();
    }
  }
);
</script>
