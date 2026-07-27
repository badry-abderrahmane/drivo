<template>
  <div class="course-groups">
    <v-expansion-panels v-model="open" multiple variant="popout" class="gap-4">
      <v-expansion-panel
        v-for="s in sections"
        :key="s.level"
        :value="s.level"
        class="rounded-xl border mb-3 group-panel"
        elevation="0"
      >
        <v-expansion-panel-title class="py-3 px-4">
          <div class="d-flex align-center ga-3 w-100">
            <div class="level-icon-avatar rounded-lg d-flex align-center justify-center bg-primary-subtle pa-2">
              <v-icon icon="mdi-school" color="primary" size="22" />
            </div>
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ s.level }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ s.groups.length }} chapitre(s) / section(s)
              </div>
            </div>
            <v-spacer />
            <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold mr-2">
              {{ s.count }} document{{ s.count > 1 ? "s" : "" }}
            </v-chip>
          </div>
        </v-expansion-panel-title>

        <!-- Lazy: this level's chapter accordion mounts only when the level opens. -->
        <v-expansion-panel-text class="pt-2 px-4 pb-4">
          <v-expansion-panels multiple variant="accordion" class="nested-groups">
            <v-expansion-panel
              v-for="g in s.groups"
              :key="g.key"
              :value="g.key"
              elevation="0"
              class="group-subpanel rounded-lg mb-2"
            >
              <!-- Group Header -->
              <v-expansion-panel-title class="py-2 px-3">
                <div class="d-flex align-center ga-2 w-100">
                  <v-icon icon="mdi-folder-open-outline" size="18" color="primary" />
                  <span class="text-subtitle-2 font-weight-bold text-uppercase tracking-wide">
                    {{ g.label }}
                  </span>
                  <v-spacer />
                  <v-chip size="x-small" variant="flat" color="surface-variant" class="font-weight-medium mr-2">
                    {{ g.items.length }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <!-- Lazy: the cards mount only when this chapter is opened. -->
              <v-expansion-panel-text>
                <div v-if="mode === 'list'" class="d-flex flex-column ga-2 pt-2">
                  <FileCard v-for="it in g.items" :key="it.fileId" :item="it" mode="list" />
                </div>
                <v-row v-else dense class="match-height pt-2">
                  <v-col v-for="it in g.items" :key="it.fileId" cols="12" sm="6" md="4" lg="3" class="d-flex">
                    <FileCard :item="it" mode="grid" />
                  </v-col>
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import FileCard from "./FileCard.vue";
import type { LevelSection } from "../lib/group";

const props = withDefaults(
  defineProps<{
    sections: LevelSection[];
    mode?: "grid" | "list";
  }>(),
  {
    mode: "grid",
  }
);

// Open the first section by default so the page never looks empty
const open = ref<string[]>([]);
watch(
  () => props.sections,
  (s) => {
    if (open.value.length === 0 && s.length > 0) open.value = [s[0].level];
  },
  { immediate: true }
);
</script>

<style scoped>
.group-panel {
  background: var(--v-theme-surface);
  border: 1px solid rgba(var(--v-border-color), 0.12) !important;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.group-panel:hover {
  border-color: rgba(var(--v-theme-primary), 0.25) !important;
}

.level-icon-avatar {
  background: rgba(var(--v-theme-primary), 0.08);
  width: 40px;
  height: 40px;
}

.tracking-wide {
  letter-spacing: 0.5px;
}

.bg-primary-subtle {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
