<template>
  <v-dialog
    :model-value="modelValue"
    max-width="960"
    transition="dialog-bottom-transition"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card v-if="item" class="rounded-2xl overflow-hidden">
      <v-toolbar density="comfortable" color="surface" class="px-2">
        <div
          class="pv-icon d-flex align-center justify-center rounded-lg ml-2 mr-1 pa-1"
          :style="{ backgroundColor: `${kind.color}15`, color: kind.color }"
        >
          <v-icon :icon="kind.icon" size="20" />
        </div>
        <v-toolbar-title class="text-body-1 font-weight-medium text-truncate">
          {{ item.title || item.name }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          :href="openUrl"
          target="_blank"
          rel="noopener"
          variant="text"
          size="small"
          prepend-icon="mdi-open-in-new"
          class="rounded-pill"
        >
          Ouvrir dans Drive
        </v-btn>
        <v-btn icon="mdi-close" variant="text" @click="emit('update:modelValue', false)" />
      </v-toolbar>
      <div class="preview-frame-wrapper">
        <iframe
          :src="src"
          data-test="preview-frame"
          class="preview-frame"
          allow="autoplay"
          allowfullscreen
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// Admin-only. Student-facing views navigate to the document page instead; the admin still
// needs a modal because it previews files that are not yet classified, and those have no
// public document page by design.
import { computed } from "vue";
import { fileKind } from "../lib/fileKind";
import { drivePreviewUrl, driveOpenUrl } from "../lib/drivePreview";

export interface PreviewItem {
  fileId: string;
  name: string;
  mimeType: string;
  title?: string;
}

const props = defineProps<{ modelValue: boolean; item: PreviewItem | null }>();
const emit = defineEmits<{ "update:modelValue": [boolean] }>();

const kind = computed(() => fileKind(props.item?.name ?? "", props.item?.mimeType));
const src = computed(() => (props.item ? drivePreviewUrl(props.item.fileId, props.item.mimeType) : ""));
const openUrl = computed(() => (props.item ? driveOpenUrl(props.item.fileId, props.item.mimeType) : "#"));
</script>

<style scoped>
.pv-icon {
  width: 34px;
  height: 34px;
}
.preview-frame-wrapper {
  width: 100%;
  height: 78vh;
  background: #000;
}
.preview-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
