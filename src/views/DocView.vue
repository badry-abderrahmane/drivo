<template>
  <div class="doc-view max-width-xl mx-auto py-8 px-4 px-md-6">
    <div v-if="loading" data-test="doc-skeleton">
      <v-skeleton-loader type="heading, chip, image" class="rounded-xl" />
    </div>

    <v-card
      v-else-if="!doc"
      data-test="doc-not-found"
      class="text-center py-12 px-4 rounded-2xl border"
      variant="flat"
    >
      <v-icon icon="mdi-file-question-outline" size="64" color="medium-emphasis" class="mb-4" />
      <h1 class="text-h6 font-weight-bold mb-1">Ressource introuvable</h1>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Ce document n'existe pas ou n'est pas encore publié.
      </p>
      <v-btn :to="{ name: 'browse' }" color="primary" variant="flat" class="rounded-pill px-6">
        Retour à la bibliothèque
      </v-btn>
    </v-card>

    <template v-else>
      <!-- Breadcrumb: orientation for students, and extra crawl paths up to the
           chapter and level pages for search engines. -->
      <nav class="d-flex align-center flex-wrap ga-1 text-caption text-medium-emphasis mb-4">
        <router-link :to="{ name: 'browse' }" class="text-decoration-none color-inherit">Bibliothèque</router-link>
        <template v-if="primaryLevel">
          <span>›</span>
          <router-link
            :to="{ name: 'level', params: { level: slugify(primaryLevel) } }"
            class="text-decoration-none color-inherit"
          >{{ primaryLevel }}</router-link>
        </template>
        <template v-if="primaryLevel && primaryChapter">
          <span>›</span>
          <router-link
            :to="{ name: 'chapter', params: { level: slugify(primaryLevel), chapter: slugify(primaryChapter) } }"
            class="text-decoration-none color-inherit"
          >{{ primaryChapter }}</router-link>
        </template>
      </nav>

      <h1 class="text-h4 font-weight-black font-heading mb-3">{{ doc.displayTitle }}</h1>

      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <v-chip v-if="doc.meta.type" size="small" color="primary" variant="tonal" class="font-weight-bold rounded-pill">
          {{ doc.meta.type }}
        </v-chip>
        <v-chip v-if="doc.meta.subject" size="small" variant="tonal" class="rounded-pill">
          {{ doc.meta.subject }}
        </v-chip>
        <v-chip v-for="lvl in doc.meta.level" :key="lvl" size="small" variant="tonal" class="rounded-pill">
          {{ lvl }}
        </v-chip>
      </div>

      <div v-if="doc.meta.chapter.length" class="d-flex flex-wrap ga-1 mb-4">
        <v-chip v-for="ch in doc.meta.chapter" :key="ch" size="x-small" variant="outlined" class="rounded-pill">
          {{ ch }}
        </v-chip>
      </div>

      <div class="d-flex align-center ga-2 mb-4" data-test="doc-author">
        <v-icon icon="mdi-account-edit-outline" size="16" color="secondary" />
        <span class="text-caption text-medium-emphasis">
          Rassemblé et édité par M. {{ AUTHOR_NAME }}
        </span>
      </div>

      <p v-if="doc.meta.description" class="text-body-1 text-medium-emphasis mb-6">
        {{ doc.meta.description }}
      </p>

      <div class="doc-frame-wrapper rounded-xl overflow-hidden border mb-4">
        <iframe :src="previewSrc" data-test="doc-frame" class="doc-frame" allowfullscreen />
      </div>

      <div class="d-flex flex-wrap ga-2 mb-10">
        <v-btn
          :href="downloadHref"
          data-test="doc-download"
          color="primary"
          variant="flat"
          prepend-icon="mdi-download-outline"
          class="rounded-pill px-5"
        >
          Télécharger
        </v-btn>
        <v-btn
          :href="openHref"
          target="_blank"
          rel="noopener"
          variant="tonal"
          prepend-icon="mdi-open-in-new"
          class="rounded-pill px-5"
        >
          Ouvrir dans Drive
        </v-btn>
        <v-btn
          data-test="doc-share"
          variant="tonal"
          prepend-icon="mdi-share-variant-outline"
          class="rounded-pill px-5"
          @click="share"
        >
          Partager
        </v-btn>
      </div>

      <template v-if="related.length">
        <h2 class="text-h6 font-weight-bold font-heading mb-3">Dans le même chapitre</h2>
        <v-row>
          <v-col v-for="it in related" :key="it.fileId" cols="12" sm="6" md="4">
            <FileCard :item="it" mode="grid" data-test="doc-related" />
          </v-col>
        </v-row>
      </template>

      <v-snackbar v-model="shared" timeout="2500">Lien copié</v-snackbar>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import FileCard from "../components/FileCard.vue";
import { useLibrary } from "../composables/useLibrary";
import { findDoc, relatedDocs } from "../lib/doc";
import { slugify } from "../lib/slug";
import { drivePreviewUrl, driveOpenUrl, driveDownloadUrl } from "../lib/drivePreview";
import { AUTHOR_NAME } from "../config";

const { items, loading, ensureLoaded } = useLibrary();
const route = useRoute();

const fileId = computed(() => (typeof route.params.fileId === "string" ? route.params.fileId : ""));

// `findDoc` returns null for an unclassified file as well as an unknown id, so a direct
// URL can't reach a document that every other student-facing view hides.
const doc = computed(() => findDoc(items.value, fileId.value));

const primaryLevel = computed(() => doc.value?.meta.level[0] ?? null);
const primaryChapter = computed(() => doc.value?.meta.chapter[0] ?? null);

const previewSrc = computed(() => (doc.value ? drivePreviewUrl(doc.value.fileId, doc.value.mimeType) : ""));
const openHref = computed(() => (doc.value ? driveOpenUrl(doc.value.fileId, doc.value.mimeType) : "#"));
const downloadHref = computed(() => (doc.value ? driveDownloadUrl(doc.value.fileId, doc.value.mimeType) : "#"));

const related = computed(() => (doc.value ? relatedDocs(items.value, doc.value) : []));

// Most students are on mobile, where the native share sheet is what they expect;
// the clipboard is the desktop fallback.
const shared = ref(false);
async function share(): Promise<void> {
  const url = window.location.href;
  const title = doc.value?.displayTitle ?? "PIPC";
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch {
      /* dismissed — fall through to copying */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    shared.value = true;
  } catch {
    /* clipboard unavailable — nothing useful to offer */
  }
}

onMounted(ensureLoaded);
</script>

<style scoped>
.doc-view {
  max-width: 1100px;
}
.doc-frame-wrapper {
  width: 100%;
  height: 72vh;
  background: #000;
}
.doc-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
