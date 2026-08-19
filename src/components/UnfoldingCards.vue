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
              :style="{ animationDelay: `${staggerDelay(index)}ms` }"
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
              <v-btn icon="mdi-arrow-left" size="x-small" variant="tonal" class="mr-1" data-test="unfold-back-to-levels" @click="selectedLevel = null" />
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

            <div class="chapter-spine">
              <button
                v-for="(ch, index) in subGroup.chapters"
                :key="ch.name"
                type="button"
                class="spine-row d-flex align-start ga-4 w-100 text-left"
                :data-test="`unfold-chapter-${ch.name}`"
                :style="{ animationDelay: `${staggerDelay(index)}ms` }"
                @click="selectChapter(ch.name)"
              >
                <span class="spine-number font-heading" data-test="chapter-spine-number">
                  {{ formatChapterNumber(subGroup.subject, ch.name) }}
                </span>
                <span class="spine-body flex-grow-1 pb-4">
                  <span class="d-block font-heading font-weight-bold spine-name">{{ ch.name }}</span>
                  <span class="d-block text-caption text-medium-emphasis mt-1">
                    {{ ch.count }} document{{ ch.count > 1 ? "s" : "" }}
                  </span>
                </span>
                <v-icon icon="mdi-chevron-right" size="20" color="primary" class="mt-1 spine-arrow" />
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- STEP 3: Documents Display -->
      <div v-else key="step-docs">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <h2 class="text-h5 font-weight-black font-heading mb-1 d-flex align-center ga-2">
              <v-btn icon="mdi-arrow-left" size="x-small" variant="tonal" class="mr-1" data-test="unfold-back-to-chapters" @click="selectedChapter = null" />
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

        <template v-else>
          <div v-for="group in docsByType" :key="group.type" class="mb-8">
            <div class="d-flex align-center ga-2 mb-4 px-1 text-no-wrap flex-nowrap">
              <v-icon :icon="getTypeIcon(group.type)" color="primary" size="18" />
              <h3 class="text-subtitle-2 font-weight-bold font-heading text-no-wrap flex-shrink-0">
                {{ group.type }}
              </h3>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold ml-1 flex-shrink-0">
                {{ group.docs.length }} document{{ group.docs.length > 1 ? "s" : "" }}
              </v-chip>
              <v-divider class="ms-3 flex-grow-1" />
            </div>

            <v-row class="match-height">
              <v-col
                v-for="item in group.docs"
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
        </template>
      </div>
    </v-slide-y-transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { LibraryItem } from "../lib/types";
import { chaptersOf, levelsOf, subjectOf } from "../lib/group";
import { chapterNumber, chapterMatiere } from "../lib/chapterNumber";
import { slugify, resolveSlug } from "../lib/slug";
import { TYPES, EXAMEN_NATIONAL_TYPE } from "../config";
import FileCard from "./FileCard.vue";

const props = defineProps<{
  items: LibraryItem[];
}>();

const route = useRoute();
const router = useRouter();

// Drill-down position lives in the route path (not local state or a query param) so the
// browser's Back button steps back through Niveau -> Chapitre -> Documents, and every
// level and chapter is a real URL that can be prerendered and indexed. Slugs resolve
// against the levels and chapters actually present, so an unknown slug reads as null
// and the view falls back to its picker instead of showing an empty drill-down.
const availableLevels = computed(() => [...new Set(props.items.flatMap(levelsOf))]);

const selectedLevel = computed<string | null>({
  get: () => {
    const slug = route.params.level;
    return typeof slug === "string" ? resolveSlug(slug, availableLevels.value) : null;
  },
  set: (level) => {
    router.push(level ? { name: "level", params: { level: slugify(level) } } : { name: "browse" });
  },
});

const availableChapters = computed(() => {
  const lvl = selectedLevel.value;
  if (!lvl) return [];
  return [
    ...new Set(props.items.filter((it) => levelsOf(it).includes(lvl)).flatMap(chaptersOf)),
  ];
});

const selectedChapter = computed<string | null>({
  get: () => {
    const slug = route.params.chapter;
    return typeof slug === "string" ? resolveSlug(slug, availableChapters.value) : null;
  },
  set: (chapter) => {
    const lvl = selectedLevel.value;
    if (!lvl) return;
    router.push(
      chapter
        ? { name: "chapter", params: { level: slugify(lvl), chapter: slugify(chapter) } }
        : { name: "level", params: { level: slugify(lvl) } }
    );
  },
});

// Entrance stagger, capped so a long chapter list (up to 17 cards in one Matière
// group) doesn't leave the tail end fading in over a second-plus while the grid
// above it has already settled.
const MAX_STAGGERED_CARDS = 6;
const STAGGER_STEP_MS = 40;
function staggerDelay(index: number): number {
  return Math.min(index, MAX_STAGGERED_CARDS) * STAGGER_STEP_MS;
}

/**
 * Two-digit program number, or an em dash for a chapter the admin typed freely. A wrong
 * number in a contents page is worse than no number.
 */
function formatChapterNumber(subject: string, chapter: string): string {
  const n = selectedLevel.value ? chapterNumber(selectedLevel.value, subject, chapter) : null;
  return n === null ? "—" : String(n).padStart(2, "0");
}

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
    // Presented as a table of contents, so it has to read like one: program order, with
    // off-program chapters (no number) collected at the end rather than interleaved.
    const matiereRank = (name: string): number => {
      const m = chapterMatiere(selectedLevel.value!, name);
      return m === "Physique" ? 0 : m === "Chimie" ? 1 : 2;
    };
    chapters.sort((a, b) => {
      const ra = matiereRank(a.name);
      const rb = matiereRank(b.name);
      if (ra !== rb) return ra - rb;
      const na = chapterNumber(selectedLevel.value!, a.subject, a.name);
      const nb = chapterNumber(selectedLevel.value!, b.subject, b.name);
      if (na !== null && nb !== null) return na - nb || a.name.localeCompare(b.name, "fr");
      if (na !== null) return -1;
      if (nb !== null) return 1;
      return a.name.localeCompare(b.name, "fr");
    });
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

// Documents within a chapter, split into sections by Type — Cours, then Exercices, then
// Devoir surveillé, then whatever's left, in TYPES' canonical order (the one place this
// priority is defined, so it stays in sync with the filter chips elsewhere in the app).
const docsByType = computed(() => {
  const groups = new Map<string, LibraryItem[]>();
  for (const it of currentDocs.value) {
    const type = it.meta.type || "Autre";
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(it);
  }
  const orderOf = (type: string) => {
    const idx = TYPES.indexOf(type);
    return idx === -1 ? TYPES.length : idx;
  };
  return Array.from(groups.entries())
    .sort(([a], [b]) => orderOf(a) - orderOf(b))
    .map(([type, docs]) => ({ type, docs }));
});

function getTypeIcon(type: string): string {
  switch (type) {
    case "Cours":
      return "mdi-book-open-variant";
    case "Exercices":
      return "mdi-pencil-outline";
    case "Devoir surveillé":
      return "mdi-clipboard-text-clock-outline";
    case EXAMEN_NATIONAL_TYPE:
      return "mdi-certificate-outline";
    case "Vidéo":
      return "mdi-play-circle-outline";
    default:
      return "mdi-file-outline";
  }
}

function selectLevel(lvl: string): void {
  // The setter already clears `chapter` from the query.
  selectedLevel.value = lvl;
}

function selectChapter(ch: string): void {
  selectedChapter.value = ch;
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

/* The chapter list is set like a printed table of contents: the program number hangs in
   a margin against a rule, rather than each chapter sitting in its own card. */
.spine-row {
  background: none;
  border: 0;
  cursor: pointer;
  padding: 0;
  animation: cardFocusIn 0.5s ease backwards;
}

.spine-number {
  width: 52px;
  flex: none;
  text-align: right;
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -1.5px;
  color: rgb(var(--v-theme-primary));
  opacity: 0.3;
  transition: opacity var(--pipc-fast, 120ms) var(--pipc-ease, cubic-bezier(.2, .8, .2, 1));
}

.spine-row:hover .spine-number {
  opacity: 0.75;
}

.spine-body {
  border-left: 2px solid rgb(var(--v-theme-outline-variant));
  padding-left: 14px;
  transition: border-color var(--pipc-fast, 120ms) var(--pipc-ease, cubic-bezier(.2, .8, .2, 1));
}

.spine-row:hover .spine-body {
  border-left-color: rgb(var(--v-theme-primary));
}

.spine-name {
  font-size: 0.95rem;
  line-height: 1.35;
}

.spine-arrow {
  opacity: 0;
  transition: opacity var(--pipc-fast, 120ms) var(--pipc-ease, cubic-bezier(.2, .8, .2, 1));
}

.spine-row:hover .spine-arrow {
  opacity: 1;
}

@media (max-width: 600px) {
  .spine-number {
    width: 36px;
    font-size: 1.4rem;
  }
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
