<template>
  <v-sheet class="pa-4">
    <v-row dense>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Niveau" :items="levels" v-model="local.level" clearable hide-details density="comfortable" @update:model-value="emitChange" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Type" :items="types" v-model="local.type" clearable hide-details density="comfortable" @update:model-value="emitChange" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Matière" :items="subjects" v-model="local.subject" clearable hide-details density="comfortable" @update:model-value="emitChange" />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select label="Chapitre" :items="chapters" v-model="local.chapter" clearable hide-details density="comfortable" @update:model-value="emitChange" />
      </v-col>
      <v-col cols="12">
        <v-text-field data-test="search" type="text" label="Recherche (titre ou tag)" v-model="local.search" clearable hide-details density="comfortable" prepend-inner-icon="mdi-magnify" @update:model-value="emitChange" />
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import { distinctValues, type Filters } from "../lib/filter";
import type { LibraryItem } from "../lib/types";

const props = defineProps<{ items: LibraryItem[]; modelValue: Filters }>();
const emit = defineEmits<{ "update:modelValue": [Filters] }>();

const local = reactive<Filters>({ ...props.modelValue });

function emitChange(): void {
  emit("update:modelValue", { ...local });
}

const levels = computed(() => distinctValues(props.items, "level"));
const types = computed(() => distinctValues(props.items, "type"));
const subjects = computed(() => distinctValues(props.items, "subject"));
const chapters = computed(() => distinctValues(props.items, "chapter"));
</script>
