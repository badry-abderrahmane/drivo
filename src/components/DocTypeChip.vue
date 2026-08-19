<template>
  <v-chip
    v-if="type"
    :size="size"
    :color="typeColor(type)"
    variant="tonal"
    class="doc-type-chip font-weight-bold"
    data-test="doc-type-chip"
  >
    {{ type }}
  </v-chip>
</template>

<script setup lang="ts">
/**
 * The document type as a coloured label. One component so the colour of "Cours" is the
 * same on a card, on the document page and anywhere else it appears — three call sites
 * previously repeated the same orange chip.
 */
import { typeColor } from "../lib/docType";

withDefaults(defineProps<{ type: string; size?: string }>(), { size: "small" });
</script>

<style scoped>
/* 12px, matching every other corner in the app — the pill shape is reserved for controls
   you can click, which a label is not. */
.doc-type-chip {
  border-radius: 12px;
  letter-spacing: 0.02em;
}
</style>
