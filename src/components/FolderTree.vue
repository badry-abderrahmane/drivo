<template>
  <div class="folder-tree">
    <div
      data-test="folder-node"
      class="folder-row d-flex align-center ga-1 rounded-lg px-2 py-1"
      :class="{ 'folder-row--selected': isSelected }"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="emit('select', node.path)"
    >
      <v-icon
        v-if="node.children.length"
        :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        size="16"
        class="flex-shrink-0"
        @click.stop="expanded = !expanded"
      />
      <span v-else class="chevron-spacer flex-shrink-0" />

      <v-icon icon="mdi-folder-outline" size="16" class="flex-shrink-0" />

      <div class="d-flex flex-column flex-grow-1 overflow-hidden">
        <div class="d-flex align-center justify-space-between ga-2">
          <span class="text-caption font-weight-medium text-truncate" :title="node.name">
            {{ node.name }}
          </span>
          <span class="text-caption text-disabled flex-shrink-0">
            {{ node.fileCount }} · {{ node.percent }}%
          </span>
        </div>
        <v-progress-linear
          :model-value="node.percent"
          :color="barColor"
          height="3"
          rounded
          class="mt-1"
        />
      </div>
    </div>

    <template v-if="expanded">
      <FolderTree
        v-for="child in node.children"
        :key="child.path.join('/')"
        :node="child"
        :selected="selected"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
// Recursive, presentational: renders whatever tree it is handed and emits the path that
// was clicked. No store access, so it can be reasoned about (and tested) on its own.
import { ref, computed, watch } from "vue";
import type { FolderNode } from "../lib/folderTree";

const props = withDefaults(
  defineProps<{ node: FolderNode; selected: string[]; depth?: number }>(),
  { depth: 0 }
);
const emit = defineEmits<{ select: [path: string[]] }>();

const key = computed(() => props.node.path.join("/"));
const selectedKey = computed(() => props.selected.join("/"));

const isSelected = computed(() => key.value === selectedKey.value);

/** True when this node is an ancestor of (or is) the selection. */
const onSelectedBranch = computed(
  () =>
    key.value === "" ||
    selectedKey.value === key.value ||
    selectedKey.value.startsWith(key.value + "/")
);

// The root starts open; everything else opens only along the selected branch, because 99
// folders expanded at once is unusable.
const expanded = ref(props.depth === 0 || onSelectedBranch.value);
watch(onSelectedBranch, (on) => {
  if (on) expanded.value = true;
});

const barColor = computed(() => {
  if (props.node.percent === 100) return "success";
  return props.node.percent === 0 ? "grey-lighten-1" : "primary";
});
</script>

<style scoped>
.folder-row {
  cursor: pointer;
}
.folder-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.folder-row--selected {
  background: rgba(var(--v-theme-primary), 0.12);
}
.chevron-spacer {
  width: 16px;
}
</style>
