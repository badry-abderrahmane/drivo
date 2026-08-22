<template>
  <!-- Phones get an accordion instead of the two-row header. The table's meaning lives in
       a header that spans "Session normale" and "Session de rattrapage" over Sujet/Corrigé
       pairs, and that structure is exactly what horizontal scrolling destroys: scroll right
       and the year is gone, so a Corrigé no longer belongs to anything. Each year becomes a
       panel that names its own sessions. -->
  <v-expansion-panels v-if="mobile" variant="accordion" class="year-panels">
    <v-expansion-panel v-for="row in rows" :key="row.year" data-test="exam-panel">
      <template #title>
        <v-icon icon="mdi-calendar-outline" size="16" class="mr-2 flex-shrink-0" />
        <span class="font-weight-bold flex-grow-1">{{ row.year }}</span>
        <v-chip size="x-small" variant="tonal" class="ml-2 flex-shrink-0">
          {{ countFiles(row) }}
        </v-chip>
      </template>
      <template #text>
        <div v-for="session in sessionsOf(row)" :key="session.label" class="mb-3">
          <p class="session-label mb-1">{{ session.label }}</p>
          <div
            v-for="part in session.parts"
            :key="part.head"
            class="d-flex align-center ga-3 py-1"
          >
            <span class="part-label flex-shrink-0">{{ part.head }}</span>
            <div v-if="part.files.length" class="d-flex flex-wrap ga-1">
              <button
                v-for="f in part.files"
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
          </div>
        </div>
      </template>
    </v-expansion-panel>
  </v-expansion-panels>

  <div v-else class="table-scroll">
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
import { useDisplay } from "vuetify";
import type { ExamRow } from "../lib/examenNational";
import type { LibraryItem } from "../lib/types";
import { docSlug } from "../lib/doc";

defineProps<{ rows: ExamRow[] }>();

// Same order as ExamRow.cells: N/Sujet, N/Corrigé, R/Sujet, R/Corrigé.
const HEADS = ["Sujet", "Corrigé", "Sujet", "Corrigé"];

const { mobile } = useDisplay();

/**
 * The same four cells the table shows, regrouped under the session each belongs to — the
 * relationship the spanning header carries on desktop and that a phone has to state.
 */
function sessionsOf(row: ExamRow) {
  return [
    { label: "Session normale", parts: [
      { head: HEADS[0], files: row.cells[0].files },
      { head: HEADS[1], files: row.cells[1].files },
    ] },
    { label: "Session de rattrapage", parts: [
      { head: HEADS[2], files: row.cells[2].files },
      { head: HEADS[3], files: row.cells[3].files },
    ] },
  ];
}

/** Documents on a year — the count on the collapsed panel. */
function countFiles(row: ExamRow): number {
  return row.cells.reduce((n, c) => n + c.files.length, 0);
}

const router = useRouter();

function goToDoc(f: LibraryItem): void {
  router.push({ name: "doc", params: { fileId: f.fileId, slug: docSlug(f) } });
}
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}

.year-panels :deep(.v-expansion-panel) {
  background: rgb(var(--v-theme-surface));
}

.year-panels :deep(.v-expansion-panel-title) {
  min-height: 52px;
  padding-inline: 14px;
}

.year-panels :deep(.v-expansion-panel-text__wrapper) {
  padding: 4px 14px 12px;
}

.session-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
}

.part-label {
  min-width: 68px;
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
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
