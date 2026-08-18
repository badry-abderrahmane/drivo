<template>
  <!-- List Layout Mode -->
  <v-card
    v-if="mode === 'list'"
    variant="flat"
    :to="docRoute"
    class="course-card list-mode rounded-xl pa-3 d-flex align-center ga-3 w-100 border"
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
        <v-chip v-if="item.meta.type" size="x-small" color="primary" variant="tonal" class="font-weight-medium rounded-pill">
          {{ item.meta.type }}
        </v-chip>
      </div>

      <div v-if="subtitle" class="text-caption text-medium-emphasis text-truncate">{{ subtitle }}</div>

      <div v-if="item.meta.chapter.length" class="d-flex flex-wrap ga-1 mt-1">
        <span v-for="ch in visibleChapters" :key="ch" class="chapter-tag">
          <v-icon icon="mdi-atom" size="12" />
          {{ ch }}
        </span>
        <button
          v-if="hiddenChapterCount > 0"
          type="button"
          class="chapter-tag chapter-toggle"
          data-test="chapter-toggle"
          @click.stop.prevent="showAllChapters = true"
        >
          +{{ hiddenChapterCount }}
        </button>
      </div>
    </div>

    <v-icon icon="mdi-open-in-new" size="18" class="text-medium-emphasis flex-shrink-0 mr-2" />
  </v-card>

  <!-- Grid Layout Mode (Default) -->
  <v-card
    v-else
    variant="flat"
    :to="docRoute"
    class="course-card grid-mode h-100 d-flex flex-column rounded-2xl border pa-5 position-relative overflow-hidden"
  >
    <div class="card-glow-accent"></div>

    <div class="d-flex align-center justify-space-between mb-3 z-index-1">
      <div
        class="icon-wrapper d-flex align-center justify-center rounded-xl pa-2"
        :style="{ backgroundColor: `${kind.color}18`, color: kind.color }"
      >
        <v-icon :icon="kind.icon" size="26" />
      </div>

      <v-chip v-if="item.meta.type" size="small" color="primary" variant="tonal" class="font-weight-semibold rounded-pill px-3">
        {{ item.meta.type }}
      </v-chip>
    </div>

    <h3 class="text-body-1 font-weight-bold text-wrap line-clamp-2 mb-1 title-text">
      {{ item.displayTitle }}
    </h3>

    <p v-if="subtitle" class="text-caption text-medium-emphasis mb-2 font-weight-medium">{{ subtitle }}</p>

    <!-- Chapters, collapsed to 3 with a toggle to reveal the rest -->
    <div v-if="item.meta.chapter.length" class="d-flex flex-wrap ga-1 mb-3">
      <span v-for="ch in visibleChapters" :key="ch" class="chapter-tag">
        <v-icon icon="mdi-bookmark-outline" size="13" />
        {{ ch }}
      </span>
      <button
        v-if="hiddenChapterCount > 0"
        type="button"
        class="chapter-tag chapter-toggle"
        data-test="chapter-toggle"
        @click.stop.prevent="showAllChapters = true"
      >
        +{{ hiddenChapterCount }}
      </button>
    </div>

    <p v-if="item.meta.description" class="text-body-2 text-medium-emphasis line-clamp-2 mb-3">
      {{ item.meta.description }}
    </p>

    <v-spacer />

    <div class="d-flex align-center justify-space-between pt-2 border-t mt-2">
      <div v-if="item.meta.tags && item.meta.tags.length > 0" class="d-flex flex-wrap ga-1">
        <v-chip
          v-for="tag in item.meta.tags.slice(0, 2)"
          :key="tag"
          size="x-small"
          variant="tonal"
          class="text-caption rounded-pill"
        >
          #{{ tag }}
        </v-chip>
      </div>
      <div v-else class="text-caption text-medium-emphasis">Drive PDF</div>

      <v-icon icon="mdi-arrow-right" size="18" color="primary" class="card-arrow-icon" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { LibraryItem } from "../lib/types";
import { fileKind } from "../lib/fileKind";
import { docSlug } from "../lib/doc";

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

// Cards open the in-app document page rather than ejecting the student to Drive; the
// document page carries the Drive preview plus download and share actions.
const docRoute = computed(() => ({
  name: "doc",
  params: { fileId: props.item.fileId, slug: docSlug(props.item) },
}));

// Chapter tags are collapsed to 3 by default — a card tagged with many chapters (common
// for national exams, which span the whole program) shouldn't grow taller than its peers.
const CHAPTER_PREVIEW_COUNT = 3;
const showAllChapters = ref(false);
const visibleChapters = computed(() =>
  showAllChapters.value ? props.item.meta.chapter : props.item.meta.chapter.slice(0, CHAPTER_PREVIEW_COUNT)
);
const hiddenChapterCount = computed(() =>
  showAllChapters.value ? 0 : Math.max(0, props.item.meta.chapter.length - CHAPTER_PREVIEW_COUNT)
);
</script>

<style scoped>
.course-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  color: inherit;
}

.course-card.grid-mode:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.4) !important;
}

.course-card.grid-mode:hover .card-arrow-icon {
  transform: translateX(3px);
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
  font-family: 'Space Grotesk', 'Inter', sans-serif;
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
  gap: 4px;
  max-width: 100%;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.25;
  white-space: normal;
}

.chapter-toggle {
  border: 0;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  background: rgba(var(--v-theme-primary), 0.14);
  transition: background 0.15s ease;
}

.chapter-toggle:hover {
  background: rgba(var(--v-theme-primary), 0.24);
}

.card-arrow-icon {
  transition: transform 0.2s ease;
}
</style>
