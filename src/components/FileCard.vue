<template>
  <!-- List Layout Mode -->
  <v-card
    v-if="mode === 'list'"
    variant="flat"
    :href="item.webViewLink"
    target="_blank"
    rel="noopener"
    class="course-card list-mode rounded-lg pa-3 d-flex align-center ga-3 w-100"
  >
    <div
      class="icon-wrapper flex-shrink-0 d-flex align-center justify-center rounded-lg"
      :style="{ backgroundColor: `${kind.color}15`, color: kind.color }"
    >
      <v-icon :icon="kind.icon" size="24" />
    </div>

    <div class="flex-grow-1 overflow-hidden">
      <div class="d-flex align-center ga-2 flex-wrap mb-1">
        <span class="text-subtitle-2 font-weight-bold text-truncate">{{ item.displayTitle }}</span>
        <v-chip v-if="item.meta.type" size="x-small" color="primary" variant="tonal" class="font-weight-medium">
          {{ item.meta.type }}
        </v-chip>
      </div>

      <div class="text-caption text-medium-emphasis text-truncate">
        {{ subtitle || item.name }}
      </div>
    </div>
  </v-card>

  <!-- Grid Layout Mode (Default) -->
  <v-card
    v-else
    variant="flat"
    :href="item.webViewLink"
    target="_blank"
    rel="noopener"
    class="course-card grid-mode h-100 d-flex flex-column rounded-xl border pa-4"
  >
    <div class="d-flex align-center justify-space-between mb-3">
      <div
        class="icon-wrapper d-flex align-center justify-center rounded-xl pa-2"
        :style="{ backgroundColor: `${kind.color}15`, color: kind.color }"
      >
        <v-icon :icon="kind.icon" size="26" />
      </div>

      <v-chip v-if="item.meta.type" size="small" color="primary" variant="tonal" class="font-weight-semibold">
        {{ item.meta.type }}
      </v-chip>
    </div>

    <h3 class="text-body-1 font-weight-bold text-wrap line-clamp-2 mb-1 title-text">
      {{ item.displayTitle }}
    </h3>

    <p v-if="subtitle" class="text-caption text-medium-emphasis mb-2 d-flex align-center ga-1">
      <v-icon icon="mdi-bookmark-outline" size="14" />
      <span class="text-truncate">{{ subtitle }}</span>
    </p>

    <p v-if="item.meta.description" class="text-body-2 text-medium-emphasis line-clamp-2 mb-3">
      {{ item.meta.description }}
    </p>

    <div v-if="item.meta.tags && item.meta.tags.length > 0" class="d-flex flex-wrap ga-1 mb-3">
      <v-chip
        v-for="tag in item.meta.tags.slice(0, 3)"
        :key="tag"
        size="x-small"
        variant="outlined"
        class="text-caption"
      >
        #{{ tag }}
      </v-chip>
    </div>

    <v-spacer />

    <div class="d-flex align-center justify-space-between pt-2 border-t mt-2">
      <span class="text-caption text-disabled">
        {{ formattedDate }}
      </span>

      <v-icon icon="mdi-open-in-new" size="16" class="text-disabled" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LibraryItem } from "../lib/types";
import { fileKind } from "../lib/fileKind";

const props = withDefaults(
  defineProps<{
    item: LibraryItem;
    mode?: "grid" | "list";
  }>(),
  {
    mode: "grid",
  }
);

const subtitle = computed(() =>
  [props.item.meta.level, props.item.meta.subject, ...props.item.meta.chapter]
    .filter(Boolean)
    .join(" · ")
);

const kind = computed(() => fileKind(props.item.name, props.item.mimeType));

const formattedDate = computed(() => {
  if (!props.item.modifiedTime) return "";
  try {
    const d = new Date(props.item.modifiedTime);
    return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
});
</script>

<style scoped>
.course-card {
  background: var(--v-theme-surface);
  border: 1px solid rgba(var(--v-border-color), 0.12) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  color: inherit;
}

.course-card.grid-mode:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.3) !important;
}

.course-card.list-mode:hover {
  background: rgba(var(--v-theme-primary), 0.03);
  border-color: rgba(var(--v-theme-primary), 0.3) !important;
}

.icon-wrapper {
  width: 44px;
  height: 44px;
}

.title-text {
  line-height: 1.35;
  color: var(--v-theme-on-surface);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
