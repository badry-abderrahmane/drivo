<template>
  <div class="menu-table">
    <div v-for="section in menu.sections" :key="section.subject" class="mb-8">
      <div class="matiere-header d-flex align-center ga-2 mb-2">
        <v-icon icon="mdi-book-open-page-variant-outline" color="medium-emphasis" size="20" />
        <span class="text-h6 font-weight-bold text-primary">{{ section.subject }}</span>
      </div>

      <!-- Phones get an accordion instead of the matrix. A chapters x types grid cannot fit
           a phone at any readable size, and the horizontal scroll it needed hid whole
           columns off-screen with nothing to say they were there. One panel per chapter
           shows only the types that actually hold a document. -->
      <v-expansion-panels v-if="mobile" variant="accordion" class="mb-2 chapter-panels">
        <v-expansion-panel
          v-for="row in section.rows"
          :key="row.chapter"
          data-test="menu-panel"
          :title="row.chapter"
        >
          <template #title>
            <span class="chapter-num mr-2">{{ formatChapterNumber(section.subject, row.chapter) }}</span>
            <span class="flex-grow-1 font-weight-medium">{{ row.chapter }}</span>
            <v-chip size="x-small" variant="tonal" class="ml-2 flex-shrink-0">
              {{ countFiles(row) }}
            </v-chip>
          </template>
          <template #text>
            <div v-if="filledCells(row).length" class="d-flex flex-column ga-2">
              <div v-for="cell in filledCells(row)" :key="cell.type" class="d-flex align-start ga-3">
                <span class="type-label flex-shrink-0">{{ cell.type }}</span>
                <div class="d-flex flex-wrap ga-1">
                  <button
                    v-for="(f, i) in cell.files"
                    :key="f.fileId"
                    type="button"
                    class="num-link"
                    :title="f.displayTitle"
                    data-test="menu-link"
                    @click="goToDoc(f)"
                  >
                    {{ i + 1 }}
                  </button>
                </div>
              </div>
            </div>
            <span v-else class="text-disabled text-caption">Aucun document.</span>
          </template>
        </v-expansion-panel>
      </v-expansion-panels>

      <div v-else class="table-scroll">
        <v-table density="comfortable" class="rounded-lg border">
          <thead>
            <tr>
              <th class="text-left font-weight-bold theme-col">Thème / Chapitre</th>
              <th v-for="t in menu.types" :key="t" class="text-left font-weight-bold">{{ t }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in section.rows" :key="row.chapter">
              <td class="font-weight-medium theme-cell">
                <span class="chapter-num">{{ formatChapterNumber(section.subject, row.chapter) }}</span>
                {{ row.chapter }}
              </td>
              <td v-for="cell in row.cells" :key="cell.type">
                <div v-if="cell.files.length" class="d-flex flex-wrap ga-1">
                  <button
                    v-for="(f, i) in cell.files"
                    :key="f.fileId"
                    type="button"
                    class="num-link"
                    :title="f.displayTitle"
                    data-test="menu-link"
                    @click="goToDoc(f)"
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
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import type { LevelMenu, MenuRow, MenuCell } from "../lib/menu";
import type { LibraryItem } from "../lib/types";
import { docSlug } from "../lib/doc";
import { chapterNumber } from "../lib/chapterNumber";

const props = defineProps<{ menu: LevelMenu }>();

/** Two-digit program number, or an em dash for a chapter outside the official program. */
function formatChapterNumber(subject: string, chapter: string): string {
  const n = chapterNumber(props.menu.level, subject, chapter);
  return n === null ? "—" : String(n).padStart(2, "0");
}

const { mobile } = useDisplay();

/** Only the types this chapter actually has, so a phone lists documents and not dashes. */
function filledCells(row: MenuRow): MenuCell[] {
  return row.cells.filter((c) => c.files.length > 0);
}

/** Total documents on a chapter — the count on the collapsed panel. */
function countFiles(row: MenuRow): number {
  return row.cells.reduce((n, c) => n + c.files.length, 0);
}

const router = useRouter();

// Rows open the in-app document page; the menu no longer raises a preview modal.
function goToDoc(f: LibraryItem): void {
  router.push({ name: "doc", params: { fileId: f.fileId, slug: docSlug(f) } });
}
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}

/* The accordion is chrome around the same links the table shows, so it stays quiet: no
   card elevation, one hairline between panels. */
.chapter-panels :deep(.v-expansion-panel) {
  background: rgb(var(--v-theme-surface));
}

.chapter-panels :deep(.v-expansion-panel-title) {
  min-height: 52px;
  padding-inline: 14px;
}

.chapter-panels :deep(.v-expansion-panel-text__wrapper) {
  padding: 4px 14px 14px;
}

.type-label {
  min-width: 104px;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  padding-top: 3px;
}
.theme-col {
  min-width: 220px;
}
.theme-cell {
  min-width: 220px;
}
.chapter-num {
  display: inline-block;
  min-width: 26px;
  margin-right: 8px;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  opacity: 0.55;
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
