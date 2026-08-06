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

      <div v-if="subtitle" class="text-caption text-medium-emphasis text-truncate">{{ subtitle }}</div>

      <div v-if="item.meta.chapter.length" class="d-flex flex-wrap ga-1 mt-1">
        <span v-for="ch in item.meta.chapter" :key="ch" class="chapter-tag">
          <v-icon icon="mdi-bookmark-outline" size="12" />
          {{ ch }}
        </span>
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

    <p v-if="subtitle" class="text-caption text-medium-emphasis mb-2">{{ subtitle }}</p>

    <!-- All chapters, fully visible (wrapping tags) -->
    <div v-if="item.meta.chapter.length" class="d-flex flex-wrap ga-1 mb-2">
      <span v-for="ch in item.meta.chapter" :key="ch" class="chapter-tag">
        <v-icon icon="mdi-bookmark-outline" size="13" />
        {{ ch }}
      </span>
    </div>

    <p v-if="item.meta.description" class="text-body-2 text-medium-emphasis line-clamp-2 mb-2">
      {{ item.meta.description }}
    </p>

    <div v-if="item.meta.tags && item.meta.tags.length > 0" class="d-flex flex-wrap ga-1">
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

// Context line — chapters are shown separately as tags so they stay fully visible.
const subtitle = computed(() =>
  [...props.item.meta.level, props.item.meta.subject].filter(Boolean).join(" · ")
);

const kind = computed(() => fileKind(props.item.name, props.item.mimeType));
</script>

<style scoped>
.course-card {
  background: rgb(var(--v-theme-surface));
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
  color: rgb(var(--v-theme-on-surface));
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Chapter tag: pill that wraps its text so long chapter titles stay fully visible. */
.chapter-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  line-height: 1.25;
  white-space: normal;
}
</style>
