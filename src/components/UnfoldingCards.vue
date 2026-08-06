<template>
  <div class="unfolding-explorer my-8">

    <!-- STEP 1: Level Cards Selection -->
    <v-slide-y-transition mode="out-in">
      <div v-if="!selectedLevel" key="step-levels">
        <div class="d-flex align-center justify-space-between mb-4 px-4">
          <div>
            <h2 class="text-h5 font-weight-black font-heading mb-1">
              Choisissez votre Niveau
            </h2>
            <p class="text-body-2 text-medium-emphasis">
              Dépliez un niveau pour explorer ses chapitres et cours associés.
            </p>
          </div>
        </div>

        <v-row>
          <v-col
            v-for="(lvl, index) in levels"
            :key="lvl.level"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              variant="flat"
              class="unfold-card level-unfold-card rounded-2xl border pa-6 h-100 d-flex flex-column justify-space-between cursor-pointer"
              :data-test="`unfold-level-${lvl.level}`"
              :style="{ animationDelay: `${index * 80}ms` }"
              @click="selectLevel(lvl.level)"
            >
              <div>
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="icon-avatar rounded-xl d-flex align-center justify-center pa-3">
                    <v-icon :icon="getLevelIcon(lvl.level)" color="primary" size="30" />
                  </div>
                  <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold rounded-pill">
                    {{ lvl.count }} fichier{{ lvl.count > 1 ? "s" : "" }}
                  </v-chip>
                </div>

                <h3 class="text-h5 font-weight-bold font-heading mb-2">
                  {{ lvl.level }}
                </h3>
                <p class="text-caption text-medium-emphasis mb-4">
                  {{ lvl.chapters.length }} chapitre{{ lvl.chapters.length > 1 ? "s" : "" }} disponible{{ lvl.chapters.length > 1 ? "s" : "" }}
                </p>
              </div>

              <div class="unfold-action-bar d-flex align-center justify-space-between pt-3 border-t">
                <span class="text-caption font-weight-bold text-primary">Déplier les chapitres</span>
                <div class="unfold-icon-circle rounded-circle d-flex align-center justify-center">
                  <v-icon icon="mdi-chevron-down" color="primary" size="20" class="unfold-arrow" />
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- STEP 2: Chapter Cards Selection (Divided by Matière) -->
      <div v-else-if="!selectedChapter" key="step-chapters">
        <div class="d-flex align-center justify-space-between mb-6">
          <div>
            <h2 class="text-h5 font-weight-black font-heading mb-1 d-flex align-center ga-2">
              <v-btn icon="mdi-arrow-left" size="x-small" variant="tonal" class="mr-1" @click="selectedLevel = null" />
              Chapitres de {{ selectedLevel }}
            </h2>
            <p class="text-body-2 text-medium-emphasis">
              Sélectionnez un chapitre classé par Matière ci-dessous pour afficher les documents de cours.
            </p>
          </div>
        </div>

        <div v-if="currentSubjectGroups.length === 0" class="pa-8 text-center bg-surface rounded-2xl border text-medium-emphasis">
          Aucun chapitre répertorié pour ce niveau.
        </div>

        <template v-else>
          <div v-for="subGroup in currentSubjectGroups" :key="subGroup.subject" class="mb-8">
            <!-- Matière Group Header (Single Line) -->
            <div class="d-flex align-center ga-2 mb-4 px-1 text-no-wrap flex-nowrap">
              <div class="icon-avatar-sm rounded-lg d-flex align-center justify-center pa-2 flex-shrink-0">
                <v-icon :icon="getSubjectIcon(subGroup.subject)" color="primary" size="20" />
              </div>
              <h3 class="text-subtitle-1 font-weight-bold font-heading text-no-wrap flex-shrink-0">
                Matière : {{ subGroup.subject }}
              </h3>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold ml-1 flex-shrink-0">
                {{ subGroup.chapters.length }} chapitre{{ subGroup.chapters.length > 1 ? "s" : "" }}
              </v-chip>
              <v-divider class="ms-3 flex-grow-1" />
            </div>

            <v-row>
              <v-col
                v-for="(ch, index) in subGroup.chapters"
                :key="ch.name"
                cols="12"
                sm="6"
                md="4"
              >
                <v-card
                  variant="flat"
                  class="unfold-card chapter-unfold-card rounded-2xl border pa-5 h-100 d-flex flex-column justify-space-between cursor-pointer"
                  :data-test="`unfold-chapter-${ch.name}`"
                  :style="{ animationDelay: `${index * 60}ms` }"
                  @click="selectChapter(ch.name)"
                >
                  <div>
                    <div class="d-flex align-center justify-space-between mb-3">
                      <v-chip size="x-small" color="secondary" variant="tonal" class="font-weight-semibold rounded-pill">
                        {{ subGroup.subject }}
                      </v-chip>
                      <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold rounded-pill">
                        {{ ch.count }} doc{{ ch.count > 1 ? "s" : "" }}
                      </v-chip>
                    </div>

                    <h4 class="text-body-1 font-weight-bold font-heading mb-2 line-clamp-2">
                      {{ ch.name }}
                    </h4>
                  </div>

                  <div class="unfold-action-bar d-flex align-center justify-space-between pt-3 border-t mt-3">
                    <span class="text-caption font-weight-bold text-primary">Afficher les documents</span>
                    <v-icon icon="mdi-folder-open-outline" color="primary" size="18" />
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </template>
      </div>

      <!-- STEP 3: Documents Display -->
      <div v-else key="step-docs">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <h2 class="text-h5 font-weight-black font-heading mb-1 d-flex align-center ga-2">
              <v-btn icon="mdi-arrow-left" size="x-small" variant="tonal" class="mr-1" @click="selectedChapter = null" />
              Documents — {{ selectedChapter }}
            </h2>
            <p class="text-body-2 text-medium-emphasis">
              {{ currentDocs.length }} document{{ currentDocs.length > 1 ? "s" : "" }} disponible{{ currentDocs.length > 1 ? "s" : "" }} pour ce chapitre.
            </p>
          </div>
        </div>

        <div v-if="currentDocs.length === 0" class="pa-8 text-center bg-surface rounded-2xl border text-medium-emphasis">
          Aucun document disponible dans ce chapitre.
        </div>

        <v-row v-else class="match-height">
          <v-col
            v-for="item in currentDocs"
            :key="item.fileId"
            cols="12"
            sm="6"
            md="4"
            lg="3"
            class="d-flex"
          >
            <FileCard :item="item" mode="grid" data-test="unfold-doc-card" />
          </v-col>
        </v-row>
      </div>
    </v-slide-y-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { LibraryItem } from "../lib/types";
import { chaptersOf, levelsOf, subjectOf } from "../lib/group";
import FileCard from "./FileCard.vue";

const props = defineProps<{
  items: LibraryItem[];
}>();

const selectedLevel = ref<string | null>(null);
const selectedChapter = ref<string | null>(null);

function getLevelIcon(lvl: string): string {
  if (lvl.includes("2BAC")) return "mdi-atom";
  if (lvl.includes("1BAC")) return "mdi-lightning-bolt-outline";
  return "mdi-telescope";
}

function getSubjectIcon(subject: string): string {
  if (subject.toLowerCase().includes("physique")) return "mdi-atom";
  if (subject.toLowerCase().includes("chimie")) return "mdi-flask-outline";
  return "mdi-book-open-variant";
}

const currentStep = computed(() => {
  if (!selectedLevel.value) return 1;
  if (!selectedChapter.value) return 2;
  return 3;
});

const stepTitle = computed(() => {
  if (!selectedLevel.value) return "Sélection du Niveau";
  if (!selectedChapter.value) return "Sélection du Chapitre";
  return "Consultation des Documents";
});

// Extract levels with file count & unique chapter lists
const levels = computed(() => {
  const levelMap = new Map<string, { count: number; chapters: Set<string>; items: LibraryItem[] }>();

  for (const it of props.items) {
    for (const lvl of levelsOf(it)) {
      if (!levelMap.has(lvl)) {
        levelMap.set(lvl, { count: 0, chapters: new Set(), items: [] });
      }
      const entry = levelMap.get(lvl)!;
      entry.items.push(it);
      for (const ch of chaptersOf(it)) {
        entry.chapters.add(ch);
      }
    }
  }

  return Array.from(levelMap.entries()).map(([level, data]) => ({
    level,
    count: new Set(data.items.map((i) => i.fileId)).size,
    chapters: Array.from(data.chapters),
  }));
});

// Chapters for the selected level grouped by Matière
const currentSubjectGroups = computed(() => {
  if (!selectedLevel.value) return [];
  const levelItems = props.items.filter((it) => levelsOf(it).includes(selectedLevel.value!));

  const bySubject = new Map<string, Map<string, LibraryItem[]>>();
  for (const it of levelItems) {
    const subj = subjectOf(it);
    if (!bySubject.has(subj)) {
      bySubject.set(subj, new Map());
    }
    const chapterMap = bySubject.get(subj)!;
    for (const ch of chaptersOf(it)) {
      if (!chapterMap.has(ch)) {
        chapterMap.set(ch, []);
      }
      chapterMap.get(ch)!.push(it);
    }
  }

  const result: {
    subject: string;
    chapters: { name: string; subject: string; count: number; items: LibraryItem[] }[];
  }[] = [];

  for (const [subject, chapterMap] of bySubject) {
    const chapters = Array.from(chapterMap.entries()).map(([name, list]) => ({
      name,
      subject,
      count: new Set(list.map((i) => i.fileId)).size,
      items: list,
    }));
    result.push({ subject, chapters });
  }

  return result;
});

// Docs for the selected level and chapter
const currentDocs = computed(() => {
  if (!selectedLevel.value || !selectedChapter.value) return [];
  return props.items.filter(
    (it) =>
      levelsOf(it).includes(selectedLevel.value!) &&
      chaptersOf(it).includes(selectedChapter.value!)
  );
});

function selectLevel(lvl: string): void {
  selectedLevel.value = lvl;
  selectedChapter.value = null;
}

function selectChapter(ch: string): void {
  selectedChapter.value = ch;
}

function resetAll(): void {
  selectedLevel.value = null;
  selectedChapter.value = null;
}
</script>

<style scoped>
.bg-surface-variant-subtle {
  background-color: rgba(var(--v-theme-surface-variant), 0.35);
}

.max-w-200 {
  max-width: 200px;
}

.unfold-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: cardFocusIn 0.5s ease backwards;
}

@keyframes cardFocusIn {
  from {
    opacity: 0;
    filter: blur(6px);
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
}

.unfold-card:hover {
  transform: translateY(-5px) scale(1.01);
  border-color: rgba(var(--v-theme-primary), 0.45) !important;
  box-shadow: 0 14px 36px -8px rgba(0, 0, 0, 0.1) !important;
}

.unfold-card:hover .unfold-arrow {
  transform: translateY(2px);
}

.icon-avatar {
  background: rgba(var(--v-theme-primary), 0.1);
}

.icon-avatar-sm {
  background: rgba(var(--v-theme-primary), 0.1);
  width: 34px;
  height: 34px;
}

.unfold-icon-circle {
  width: 28px;
  height: 28px;
  background: rgba(var(--v-theme-primary), 0.1);
}

.unfold-arrow {
  transition: transform 0.2s ease;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
