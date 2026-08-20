<template>
  <div class="filter-controls">
    <!-- One line, four selects: Niveau, Type, Matière, Chapitre. `flex-nowrap` is the
         whole point — this panel only ever renders on non-mobile widths (see FilterBar),
         so there is always room for the four side by side. -->
    <div class="d-flex align-center ga-3 flex-nowrap">
      <v-select
        label="Niveau"
        :items="levels"
        v-model="local.level"
        data-test="filter-level"
        clearable
        hide-details
        density="compact"
        variant="outlined"
        color="primary"
        base-color="primary"
        class="filter-select elevation-0"
        prepend-inner-icon="mdi-school-outline"
        @update:model-value="emitChange"
      />

      <v-select
        label="Type"
        :items="types"
        v-model="local.type"
        data-test="filter-type"
        clearable
        hide-details
        density="compact"
        variant="outlined"
        color="primary"
        base-color="primary"
        class="filter-select"
        prepend-inner-icon="mdi-shape-outline"
        @update:model-value="emitChange"
      >
        <!-- A dot, not a coloured field: the select is a control, and tinting it by type
             would fight the "this filter is on" signal. The dot still teaches the
             type-colour mapping used by the cards. -->
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps">
            <template #prepend>
              <span
                class="type-dot"
                :style="{ backgroundColor: `rgb(var(--v-theme-${typeColor(item.value)}))` }"
                data-test="type-dot"
              />
            </template>
          </v-list-item>
        </template>
      </v-select>

      <v-select
        label="Matière"
        :items="subjects"
        v-model="local.subject"
        data-test="filter-subject"
        clearable
        hide-details
        density="compact"
        variant="outlined"
        color="primary"
        base-color="primary"
        class="filter-select"
        prepend-inner-icon="mdi-book-open-variant"
        @update:model-value="emitChange"
      />

      <v-select
        label="Chapitre"
        :items="chapters"
        v-model="local.chapter"
        data-test="filter-chapter"
        clearable
        hide-details
        density="compact"
        variant="outlined"
        color="primary"
        base-color="primary"
        class="filter-select flex-grow-1"
        prepend-inner-icon="mdi-bookmark-outline"
        @update:model-value="emitChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import { distinctValues, distinctChapters, distinctLevels, syncFilters, type Filters } from "../lib/filter";
import { typeColor } from "../lib/docType";
import { sortChaptersByProgram } from "../lib/chapterNumber";
import type { LibraryItem } from "../lib/types";

const props = defineProps<{
  items: LibraryItem[];
  modelValue: Filters;
}>();
const emit = defineEmits<{ "update:modelValue": [Filters] }>();

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

const levels = computed(() => distinctLevels(props.items));
const types = computed(() => distinctValues(props.items, "type"));
const subjects = computed(() => distinctValues(props.items, "subject"));
// Chapitre only offers what the other structural filters can still reach: a chapter of the
// selected Niveau *and* of the selected Matière. Each constraint applies only when it is set.
//
// Listed in program order rather than alphabetically: this dropdown is the closest thing the
// app has to a table of contents, and the teaching sequence is the order a student is looking
// for. Passing the selected Niveau matters — the same chapter name sits at different positions
// in different levels. See sortChaptersByProgram.
const chapters = computed(() => {
  const { level, subject } = local;
  const scoped = props.items.filter(
    (it) =>
      (!level || it.meta.level.includes(level)) &&
      (!subject || it.meta.subject === subject)
  );
  return sortChaptersByProgram(distinctChapters(scoped), level);
});

// Narrowing Niveau or Matière can strand the chosen Chapitre outside the options that remain,
// which would filter the library down to nothing. Drop it instead.
watch(
  () => [local.level, local.subject],
  () => {
    if (local.chapter && !chapters.value.includes(local.chapter)) {
      local.chapter = undefined;
      emitChange();
    }
  }
);
</script>

<style scoped>
/* `base-color` primary tints the outline and the label; the chosen value is a plain
   on-surface string until it is set here too, which is the part that actually says
   "this filter is on" once the menu is closed. */
.filter-select :deep(.v-field__input) {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

/* Vuetify keeps the outline's width and opacity in custom properties declared on
   .v-field__outline itself, so they have to be overridden on that element — set on
   .v-field they would be shadowed by the element's own declarations. */
.filter-select :deep(.v-field__outline) {
  --v-field-border-width: 2px;
  --v-field-border-opacity: 1;
}

/* Focus still has to read as a step up from an already-bold resting outline. Matching
   Vuetify's own specificity (.v-field--variant-outlined.v-field--focused) is what makes
   this win over their 2px focus rule. */
.filter-select :deep(.v-field--variant-outlined.v-field--focused .v-field__outline) {
  --v-field-border-width: 3px;
}

.filter-select :deep(.v-field) {
  border-radius: 9px;
}

/* The outline is drawn in three pieces and the left one is a fixed 12px — narrower than
   the corner it now has to curve around, which would flatten the top-left. Vuetify widens
   it only for a `rounded-*` class sitting on the field itself, which ours is not. */
.filter-select :deep(.v-field__outline__start) {
  flex-basis: 20px;
}

/* Equal quarters of the line, and `min-width: 0` so a long chapter name shrinks the field
   instead of pushing the fourth select onto a second row. */
.filter-select {
  flex: 1 1 0;
  min-width: 0;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  margin-right: 10px;
}
</style>
