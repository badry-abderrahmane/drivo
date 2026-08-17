<template>
  <div class="examen-view max-width-xl mx-auto py-8 px-4 px-md-6">
    <div v-if="loading" class="d-flex justify-center pa-12">
      <v-progress-circular indeterminate color="primary" size="48" width="4" />
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" class="ma-4 rounded-xl">
      Impossible de charger la bibliothèque. Réessayez plus tard.
    </v-alert>

    <template v-else>
      <v-alert v-if="stale" type="warning" variant="tonal" class="mb-6 rounded-xl">Hors ligne — données en cache.</v-alert>

      <!-- Level picker -->
      <template v-if="!selectedLevel">
        <div class="mb-8">
          <div class="d-flex align-center ga-2 mb-2">
            <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">
              <v-icon icon="mdi-certificate-outline" size="14" class="mr-1" />
              Examens Nationaux
            </v-chip>
          </div>
          <h1 class="text-h4 font-weight-black font-heading mb-2">Examen National</h1>
          <p class="text-body-1 text-medium-emphasis">
            Sélectionnez votre filière de 2ème Bac pour consulter les sujets d'examen national, classés par année.
          </p>
        </div>

        <v-row>
          <v-col v-for="lvl in levels" :key="lvl.level" cols="12" sm="6" md="4">
            <v-card
              variant="flat"
              class="level-card rounded-2xl border pa-6 h-100 d-flex flex-column justify-space-between"
              data-test="level-card"
              @click="selectedLevel = lvl.level"
            >
              <div>
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="lvl-icon rounded-xl d-flex align-center justify-center pa-3">
                    <v-icon icon="mdi-atom" color="primary" size="28" />
                  </div>
                  <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold rounded-pill">
                    {{ lvl.count }} sujet{{ lvl.count > 1 ? "s" : "" }}
                  </v-chip>
                </div>
                <h3 class="text-h5 font-weight-bold font-heading mb-1">{{ lvl.level }}</h3>
                <p class="text-caption text-medium-emphasis mb-4">
                  Sujets d'examen national
                </p>
              </div>

              <div class="d-flex align-center justify-space-between pt-3 border-t">
                <span class="text-caption font-weight-semibold color-primary">Voir les sujets</span>
                <v-icon icon="mdi-arrow-right" class="arrow" color="primary" />
              </div>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <!-- Selected level: exams grouped by year -->
      <template v-else>
        <div class="d-flex align-center ga-3 mb-6">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-arrow-left" class="rounded-pill px-4" data-test="back" @click="selectedLevel = null">
            Retour aux filières
          </v-btn>
          <h1 class="text-h5 font-weight-bold font-heading">Examen National — {{ selectedLevel }}</h1>
        </div>

        <v-alert v-if="yearGroups.length === 0" type="info" variant="tonal" class="mb-6 rounded-xl">
          Aucun sujet d'examen national classé pour cette filière pour le moment.
        </v-alert>

        <div v-for="group in yearGroups" :key="group.year" class="mb-8" data-test="year-group">
          <div class="d-flex align-center ga-2 mb-3">
            <v-icon icon="mdi-calendar-outline" color="primary" size="20" />
            <span class="text-h6 font-weight-bold text-primary">{{ group.year }}</span>
          </div>
          <v-row class="match-height">
            <v-col v-for="it in group.items" :key="it.fileId" cols="12" sm="6" md="4" lg="3" class="d-flex">
              <FileCard :item="it" mode="grid" />
            </v-col>
          </v-row>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import FileCard from "../components/FileCard.vue";
import { useLibrary } from "../composables/useLibrary";
import { groupExamsByYear, EXAMEN_NATIONAL_LEVELS } from "../lib/examenNational";
import { EXAMEN_NATIONAL_TYPE } from "../config";
import { isClassified } from "../lib/classification";

const { items, loading, stale, error, ensureLoaded } = useLibrary();

const route = useRoute();
const router = useRouter();

// Selected level lives in the route query, not local state, so Back steps out to the
// filière picker instead of leaving the app, and a level is bookmarkable/shareable.
const selectedLevel = computed<string | null>({
  get: () => (typeof route.query.level === "string" ? route.query.level : null),
  set: (level) => {
    router.push({ query: { ...route.query, level: level ?? undefined } });
  },
});

const levels = computed(() =>
  EXAMEN_NATIONAL_LEVELS.map((level) => ({
    level,
    count: items.value.filter(
      (it) => isClassified(it.meta) && it.meta.type === EXAMEN_NATIONAL_TYPE && it.meta.level.includes(level)
    ).length,
  }))
);

const yearGroups = computed(() => groupExamsByYear(items.value, selectedLevel.value ?? ""));

onMounted(ensureLoaded);
</script>

<style scoped>
.max-width-xl {
  max-width: 1200px;
}
.level-card {
  position: relative;
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.level-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--v-theme-primary), 0.4) !important;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.08) !important;
}
.level-card:hover .arrow {
  transform: translateX(4px);
}
.lvl-icon {
  background: rgba(var(--v-theme-primary), 0.1);
}
.arrow {
  transition: transform 0.2s ease;
}
.color-primary {
  color: rgb(var(--v-theme-primary));
}
</style>
