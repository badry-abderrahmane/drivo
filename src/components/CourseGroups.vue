<template>
  <v-expansion-panels v-model="open" multiple variant="accordion" class="pa-2">
    <v-expansion-panel v-for="s in sections" :key="s.level" :value="s.level">
      <v-expansion-panel-title>
        <span class="text-subtitle-1 font-weight-medium">{{ s.level }}</span>
        <v-chip size="small" class="ml-3" color="primary" variant="tonal">{{ s.count }}</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div v-for="g in s.groups" :key="g.key" class="mb-6">
          <div class="text-overline text-medium-emphasis mb-2 d-flex align-center">
            {{ g.label }}
            <v-chip size="x-small" class="ml-2" variant="text">{{ g.items.length }}</v-chip>
          </div>
          <v-row dense>
            <v-col v-for="it in g.items" :key="it.fileId" cols="12" sm="6" md="4" lg="3">
              <FileCard :item="it" />
            </v-col>
          </v-row>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import FileCard from "./FileCard.vue";
import type { LevelSection } from "../lib/group";

const props = defineProps<{ sections: LevelSection[] }>();

// Open the first section by default so the page never looks empty; keep the rest
// collapsed for a quick scan.
const open = ref<string[]>([]);
watch(
  () => props.sections,
  (s) => {
    if (open.value.length === 0 && s.length > 0) open.value = [s[0].level];
  },
  { immediate: true }
);
</script>
