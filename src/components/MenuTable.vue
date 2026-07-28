<template>
  <div class="menu-table">
    <div v-for="section in menu.sections" :key="section.subject" class="mb-8">
      <div class="matiere-header d-flex align-center ga-2 mb-2">
        <v-icon icon="mdi-book-open-page-variant-outline" color="primary" size="20" />
        <span class="text-h6 font-weight-bold text-primary">{{ section.subject }}</span>
      </div>

      <div class="table-scroll">
        <v-table density="comfortable" class="rounded-lg border">
          <thead>
            <tr>
              <th class="text-left font-weight-bold theme-col">Thème / Chapitre</th>
              <th v-for="t in menu.types" :key="t" class="text-left font-weight-bold">{{ t }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in section.rows" :key="row.chapter">
              <td class="font-weight-medium theme-cell">{{ row.chapter }}</td>
              <td v-for="cell in row.cells" :key="cell.type">
                <div v-if="cell.files.length" class="d-flex flex-wrap ga-1">
                  <button
                    v-for="(f, i) in cell.files"
                    :key="f.fileId"
                    type="button"
                    class="num-link"
                    :title="f.displayTitle"
                    data-test="menu-link"
                    @click="emit('preview', f)"
                  >
                    {{ i + 1 }}
                  </button>
                </div>
                <span v-else class="text-disabled">—</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LevelMenu } from "../lib/menu";
import type { LibraryItem } from "../lib/types";

defineProps<{ menu: LevelMenu }>();
const emit = defineEmits<{ preview: [LibraryItem] }>();
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
.theme-col {
  min-width: 220px;
}
.theme-cell {
  min-width: 220px;
}
.num-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  border: 0;
  transition: background 0.15s ease;
}
.num-link:hover {
  background: rgba(var(--v-theme-primary), 0.22);
}
</style>
