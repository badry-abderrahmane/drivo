<template>
  <v-card variant="outlined" class="h-100 d-flex flex-column">
    <v-card-item>
      <div class="d-flex align-center ga-2 mb-2">
        <v-icon :icon="kind.icon" :color="kind.color" size="28" />
        <v-chip v-if="item.meta.type" size="small" color="secondary">{{ item.meta.type }}</v-chip>
      </div>
      <v-card-title class="text-wrap text-body-1 font-weight-medium">{{ item.displayTitle }}</v-card-title>
      <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    </v-card-item>
    <v-card-text v-if="item.meta.description" class="text-body-2">{{ item.meta.description }}</v-card-text>
    <v-spacer />
    <v-card-actions>
      <v-btn
        :href="item.webViewLink"
        target="_blank"
        rel="noopener"
        color="primary"
        variant="text"
        append-icon="mdi-open-in-new"
      >Ouvrir</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LibraryItem } from "../lib/types";
import { fileKind } from "../lib/fileKind";

const props = defineProps<{ item: LibraryItem }>();
const subtitle = computed(() =>
  [props.item.meta.level, props.item.meta.chapter].filter(Boolean).join(" · ")
);
const kind = computed(() => fileKind(props.item.name, props.item.mimeType));
</script>
