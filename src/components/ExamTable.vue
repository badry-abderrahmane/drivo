<template>
  <div class="table-scroll">
    <v-table density="comfortable" class="exam-table rounded-lg border">
      <thead>
        <tr>
          <th rowspan="2" class="text-left font-weight-bold year-col">Année</th>
          <th colspan="2" class="text-center font-weight-bold session-head">Session Normale</th>
          <th colspan="2" class="text-center font-weight-bold session-head session-split">
            Session de rattrapage
          </th>
        </tr>
        <tr>
          <th
            v-for="(cell, i) in HEADS"
            :key="i"
            class="text-left font-weight-bold sub-head"
            :class="{ 'session-split': i === 2 }"
          >
            {{ cell }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.year" data-test="exam-row">
          <td class="year-cell font-weight-bold">
            <v-icon icon="mdi-calendar-outline" size="16" class="mr-1" />
            {{ row.year }}
          </td>
          <td v-for="(cell, i) in row.cells" :key="i" :class="{ 'session-split': i === 2 }">
            <div v-if="cell.files.length" class="d-flex flex-wrap ga-1">
              <button
                v-for="f in cell.files"
                :key="f.item.fileId"
                type="button"
                class="exam-link"
                :title="f.item.displayTitle"
                data-test="exam-link"
                @click="goToDoc(f.item)"
              >
                <v-icon icon="mdi-file-pdf-box" size="14" class="mr-1" />
                {{ f.label }}
              </button>
            </div>
            <span v-else class="text-disabled">—</span>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import type { ExamRow } from "../lib/examenNational";
import type { LibraryItem } from "../lib/types";
import { docSlug } from "../lib/doc";

defineProps<{ rows: ExamRow[] }>();

// Same order as ExamRow.cells: N/Sujet, N/Corrigé, R/Sujet, R/Corrigé.
const HEADS = ["Sujet", "Corrigé", "Sujet", "Corrigé"];

const router = useRouter();

function goToDoc(f: LibraryItem): void {
  router.push({ name: "doc", params: { fileId: f.fileId, slug: docSlug(f) } });
}
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
.year-col,
.year-cell {
  min-width: 110px;
  white-space: nowrap;
}
.year-cell {
  color: rgb(var(--v-theme-primary));
}
.session-head {
  background: rgba(var(--v-theme-primary), 0.06);
}
.sub-head {
  min-width: 150px;
  font-size: 0.8rem;
}
/* Keeps the two sittings visually apart, so a row reads as two pairs. */
.session-split {
  border-left: 1px solid rgba(var(--v-border-color), 0.22) !important;
}
.exam-link {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  font-size: 0.78rem;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
  border: 0;
  transition: background 0.15s ease;
}
.exam-link:hover {
  background: rgba(var(--v-theme-primary), 0.22);
}
</style>
