<template>
  <div class="admin-view pb-12">
    <PasswordGate v-if="!password" @unlocked="onUnlocked" />

    <div v-else class="max-width-xl mx-auto py-6 px-4">
      <!-- Admin Toolbar Card -->
      <v-card class="rounded-2xl border mb-6 pa-4 filter-toolbar sticky-toolbar elevation-1" elevation="0">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <v-text-field
            v-model="search"
            data-test="search"
            placeholder="Rechercher par fichier, titre, niveau..."
            prepend-inner-icon="mdi-magnify"
            hide-details
            density="comfortable"
            variant="solo-filled"
            flat
            clearable
            class="search-input rounded-xl flex-grow-1"
            style="max-width: 380px"
          />

          <!-- Unsaved changes status badge -->
          <v-chip
            v-if="pendingChangesCount > 0"
            color="warning"
            variant="tonal"
            size="small"
            class="font-weight-bold"
            prepend-icon="mdi-pencil-outline"
          >
            {{ pendingChangesCount }} modification{{ pendingChangesCount > 1 ? "s" : "" }} non enregistrée{{ pendingChangesCount > 1 ? "s" : "" }}
          </v-chip>

          <v-spacer />

          <div class="d-flex align-center flex-wrap ga-2">
            <v-btn
              color="primary"
              data-test="save"
              :loading="saving"
              class="rounded-pill px-5 font-weight-bold"
              prepend-icon="mdi-content-save-outline"
              @click="save"
            >
              Enregistrer
            </v-btn>

            <v-btn
              variant="tonal"
              data-test="reindex"
              :loading="reindexing"
              class="rounded-pill"
              prepend-icon="mdi-sync"
              @click="doReindex"
            >
              Réindexer Drive
            </v-btn>

            <v-btn
              variant="text"
              color="error"
              data-test="logout"
              prepend-icon="mdi-logout"
              class="rounded-pill"
              @click="logout"
            >
              Déconnexion
            </v-btn>
          </div>
        </div>
      </v-card>

      <!-- Progress Indicators & Alerts -->
      <v-progress-linear
        v-if="loading || refreshing"
        indeterminate
        color="primary"
        class="rounded-pill mb-4"
        data-test="loading"
      />

      <div v-if="loading && rows.length === 0" class="d-flex flex-column align-center pa-12 ga-3 text-medium-emphasis">
        <v-progress-circular indeterminate color="primary" size="48" />
        <span class="text-body-1">Chargement des fichiers Google Drive...</span>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-6 rounded-xl border" icon="mdi-alert-circle">
        Échec du chargement des fichiers : {{ error }}
      </v-alert>

      <v-alert v-if="stale" type="warning" variant="tonal" class="mb-6 rounded-xl border" icon="mdi-wifi-off">
        Hors ligne — données en cache.
      </v-alert>

      <v-row class="ma-0">
        <!-- Folder sidebar (md and up) -->
        <v-col cols="12" md="3" class="pa-0 pr-md-4 d-none d-md-block">
          <v-card class="rounded-xl border pa-2 folder-pane" elevation="0">
            <div class="text-overline px-2 pb-1 text-medium-emphasis">Dossiers</div>
            <FolderTree :node="tree" :selected="selectedPath" @select="onSelectFolder" />
          </v-card>
        </v-col>

        <v-col cols="12" md="9" class="pa-0">
      <!-- Classification progress (scoped to the selected folder) -->
      <v-card v-show="rows.length > 0" class="rounded-2xl border pa-5 mb-4 shadow-sm" elevation="0" data-test="progress">
        <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
          <span class="text-body-1 font-weight-bold d-flex align-center ga-2">
            <v-icon icon="mdi-progress-check" size="20" color="primary" />
            Progression du classement (Niveau · Type · Matière · Chapitre)
          </span>
          <v-chip
            size="small"
            :color="stats.percent === 100 ? 'success' : 'primary'"
            variant="flat"
            class="font-weight-bold rounded-pill px-3"
          >
            {{ stats.classified }} / {{ stats.total }} ({{ stats.percent }}%)
          </v-chip>
        </div>
        <v-progress-linear
          :model-value="stats.percent"
          :color="stats.percent === 100 ? 'success' : 'primary'"
          height="10"
          rounded
          class="rounded-pill"
        />
      </v-card>

      <!-- Breadcrumb + scope toggle -->
      <v-card v-show="rows.length > 0" class="rounded-xl border pa-3 mb-4" elevation="0">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div data-test="breadcrumb" class="d-flex align-center flex-wrap ga-1">
            <v-btn size="small" variant="text" class="rounded-pill px-2" @click="onSelectFolder([])">
              <v-icon icon="mdi-folder-home-outline" size="16" class="mr-1" />
              Tout
            </v-btn>
            <template v-for="(seg, i) in selectedPath" :key="i">
              <span class="text-disabled">/</span>
              <v-btn
                size="small"
                variant="text"
                class="rounded-pill px-2"
                @click="onSelectFolder(selectedPath.slice(0, i + 1))"
              >
                {{ seg }}
              </v-btn>
            </template>
          </div>

          <div class="d-flex align-center ga-3">
            <v-btn
              class="d-md-none rounded-pill"
              size="small"
              variant="tonal"
              prepend-icon="mdi-folder-outline"
              @click="folderDrawer = true"
            >
              Dossiers
            </v-btn>
            <v-switch
              v-model="recursive"
              data-test="folder-recursive"
              label="Inclure les sous-dossiers"
              color="primary"
              density="compact"
              hide-details
              class="flex-grow-0"
            />
          </div>
        </div>

        <v-divider class="my-3" />

        <v-btn-toggle
          v-model="statusFilter"
          mandatory
          density="compact"
          variant="outlined"
          divided
          class="rounded-pill"
        >
          <v-btn value="todo" size="small" data-test="status-todo" class="px-3">
            À classer ({{ statusCounts.todo }})
          </v-btn>
          <v-btn value="done" size="small" data-test="status-done" class="px-3">
            Classés ({{ statusCounts.done }})
          </v-btn>
          <v-btn value="all" size="small" data-test="status-all" class="px-3">
            Tous ({{ statusCounts.all }})
          </v-btn>
        </v-btn-toggle>
      </v-card>

      <!-- Selection bar -->
      <v-card
        v-if="selectedIds.length > 0"
        data-test="selection-bar"
        class="rounded-xl border pa-3 mb-4 d-flex align-center flex-wrap ga-3"
        color="primary"
        variant="tonal"
        elevation="0"
      >
        <span class="font-weight-bold">
          {{ selectedIds.length }} fichier{{ selectedIds.length > 1 ? "s" : "" }}
          sélectionné{{ selectedIds.length > 1 ? "s" : "" }}
        </span>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="rounded-pill px-4 font-weight-bold"
          prepend-icon="mdi-tag-multiple-outline"
          data-test="open-bulk"
          @click="bulkDialog = true"
        >
          Classer la sélection
        </v-btn>
        <v-btn size="small" variant="text" class="rounded-pill" @click="selectedIds = []">
          Désélectionner
        </v-btn>
      </v-card>

      <!-- Data Table Card -->
      <v-card v-show="rows.length > 0" class="rounded-2xl border pa-2 overflow-hidden shadow-sm" elevation="0">
        <v-data-table
          v-model="selectedIds"
          :headers="headers"
          :items="visibleRows"
          :search="search"
          :loading="loading"
          item-value="fileId"
          show-select
          select-strategy="all"
          :items-per-page="25"
          :items-per-page-options="[10, 25, 50, 100]"
          density="comfortable"
          hover
          class="admin-table"
        >
          <!-- Select-all: overridden to give the checkbox a stable test hook. -->
          <template #header.data-table-select="{ allSelected, selectAll }">
            <v-checkbox-btn
              data-test="select-all"
              :model-value="allSelected"
              @update:model-value="selectAll(!allSelected)"
            />
          </template>

          <!-- File Column: display title above filename + folder path (read-only) -->
          <template #item.name="{ item }">
            <div class="d-flex align-center ga-2 py-2">
              <div
                class="icon-wrapper flex-shrink-0 d-flex align-center justify-center rounded-lg pa-1"
                :style="{ backgroundColor: `${kindOf(item).color}15`, color: kindOf(item).color }"
              >
                <v-icon :icon="kindOf(item).icon" size="20" />
              </div>
              <div class="d-flex flex-column overflow-hidden">
                <span class="font-weight-bold text-body-2 text-truncate" style="max-width: 300px" :title="item.title || item.name">
                  {{ item.title || item.name }}
                </span>
                <span
                  v-if="item.title"
                  class="text-caption text-medium-emphasis text-truncate"
                  style="max-width: 300px"
                  :title="item.name"
                >
                  {{ item.name }}
                </span>
                <span
                  v-if="item.path.length"
                  class="text-caption text-disabled text-truncate d-flex align-center ga-1"
                  style="max-width: 300px"
                  :title="item.path.join(' / ')"
                >
                  <v-icon icon="mdi-folder-outline" size="12" />
                  {{ item.path.join(" / ") }}
                </span>
              </div>
            </div>
          </template>

          <!-- Niveau / Type Column (stacked chips) -->
          <template #item.level="{ item }">
            <div class="d-flex flex-column ga-1 py-1" style="max-width: 200px">
              <div v-if="item.level.length" class="d-flex flex-wrap ga-1">
                <v-chip v-for="lvl in item.level" :key="lvl" size="x-small" color="primary" variant="tonal" class="font-weight-medium">
                  {{ lvl }}
                </v-chip>
              </div>
              <v-chip v-if="item.type" size="x-small" color="secondary" variant="tonal" class="font-weight-medium align-self-start">
                {{ item.type }}
              </v-chip>
              <div v-if="missingFields(item).length" class="d-flex flex-wrap ga-1 mt-1">
                <v-chip
                  v-for="f in missingFields(item)"
                  :key="f"
                  size="x-small"
                  color="warning"
                  variant="tonal"
                  prepend-icon="mdi-alert-outline"
                >
                  {{ f }}
                </v-chip>
              </div>
            </div>
          </template>

          <!-- Actions Column (Preview + Edit) -->
          <template #item.actions="{ item }">
            <div class="d-flex align-center justify-end ga-1">
              <v-btn
                icon="mdi-eye-outline"
                variant="text"
                size="small"
                color="primary"
                data-test="preview-row"
                :title="`Aperçu de ${item.name}`"
                @click="openPreview(item)"
              />
              <v-btn
                color="primary"
                variant="tonal"
                size="small"
                class="rounded-pill px-3 font-weight-medium"
                prepend-icon="mdi-square-edit-outline"
                data-test="edit-row"
                @click="openEditModal(item)"
              >
                Éditer
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>
        </v-col>
      </v-row>

      <!-- Folder picker on small screens. A dialog rather than a navigation-drawer: the
           drawer needs an injected v-layout from an ancestor, which this view cannot
           guarantee on its own. -->
      <v-dialog v-model="folderDrawer" max-width="420" scrollable>
        <v-card class="rounded-2xl">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
            <v-icon icon="mdi-folder-outline" size="20" />
            Dossiers
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-2" style="max-height: 60vh">
            <FolderTree :node="tree" :selected="selectedPath" @select="onSelectFolder" />
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-3">
            <v-spacer />
            <v-btn variant="text" class="rounded-pill px-4" @click="folderDrawer = false">
              Fermer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>

    <!-- File Preview Modal (in-app, no leaving the app) -->
    <FilePreview v-model="previewDialog" :item="previewRow" />

    <!-- Edit Row Modal (MD3 Dialog) -->
    <v-dialog v-model="editDialog" max-width="640" transition="dialog-bottom-transition" persistent>
      <v-card v-if="editingRow" class="rounded-2xl pa-2">
        <v-card-item class="pb-2">
          <template #prepend>
            <div
              class="icon-wrapper d-flex align-center justify-center rounded-xl pa-2 mr-2"
              :style="{ backgroundColor: `${kindOf(editingRow).color}15`, color: kindOf(editingRow).color }"
            >
              <v-icon :icon="kindOf(editingRow).icon" size="28" />
            </div>
          </template>

          <v-card-title class="text-h6 font-weight-bold">
            Modifier le document
          </v-card-title>
          <v-card-subtitle class="text-body-1 text-truncate">
            Fichier d'origine : <span class="font-weight-medium">{{ editingRow.name }}</span>
          </v-card-subtitle>
          <v-card-subtitle
            v-if="editingRow.path.length"
            class="text-caption text-medium-emphasis text-truncate d-flex align-center ga-1 mt-1"
            :title="editingRow.path.join(' / ')"
          >
            <v-icon icon="mdi-folder-outline" size="14" />
            {{ editingRow.path.join(" / ") }}
          </v-card-subtitle>
        </v-card-item>

        <v-divider class="my-2" />

        <v-card-text class="pt-2">
          <v-row dense>
            <!-- Title Field: suggests this file's chapters (a title is nearly always one),
                 while still accepting anything typed freely. -->
            <v-col cols="12">
              <v-combobox
                v-model="editForm.title"
                data-test="modal-title"
                label="Titre d'affichage"
                :items="titleOptions"
                placeholder="Ex: Cours de Mécanique - Chapitre 1"
                :hint="titleOptions.length ? 'Suggestions d’après les chapitres du fichier — ou saisissez le vôtre' : 'Choisissez un chapitre pour voir des suggestions'"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-format-title"
                class="rounded-lg mb-2"
                :menu-props="{ maxHeight: 300 }"
              />
            </v-col>

            <!-- Level Select (multiple: a course can be shared across branches) -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.level"
                label="Niveau(x) d'études"
                :items="LEVELS"
                multiple
                chips
                closable-chips
                clearable
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-school-outline"
                class="rounded-lg mb-2"
              />
            </v-col>

            <!-- Type Select -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.type"
                label="Type de document"
                :items="TYPES"
                clearable
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-file-document-outline"
                class="rounded-lg mb-2"
              />
            </v-col>

            <!-- Subject Select -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.subject"
                label="Matière"
                :items="SUBJECTS"
                clearable
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-book-open-variant"
                class="rounded-lg mb-2"
              />
            </v-col>

            <!-- Chapter Field: level-aware autocomplete that also accepts a new value -->
            <v-col cols="12" sm="6">
              <v-combobox
                v-model="editForm.chapter"
                label="Chapitre(s)"
                :items="chapterOptions"
                :placeholder="editForm.level.length ? 'Choisir ou saisir un ou plusieurs chapitres' : 'Saisir un chapitre'"
                :hint="chapterOptions.length ? 'Programme officiel — plusieurs possibles, ou saisissez le vôtre' : 'Choisissez un niveau pour voir les chapitres du programme'"
                persistent-hint
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-bookmark-outline"
                class="rounded-lg mb-2"
                auto-select-first
                :menu-props="{ maxHeight: 340 }"
              />
            </v-col>

            <!-- Advanced Fields Toggle -->
            <v-col cols="12" class="d-flex justify-end">
              <v-btn
                size="small"
                variant="tonal"
                :color="showAdvanced ? 'primary' : 'default'"
                :append-icon="showAdvanced ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                prepend-icon="mdi-tune-variant"
                @click="showAdvanced = !showAdvanced"
              >
                Paramètres avancés
              </v-btn>
            </v-col>
          </v-row>

          <v-expand-transition>
            <v-row v-show="showAdvanced" dense>
              <!-- Tags Field -->
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="editForm.tags"
                  label="Mots-clés (séparés par des virgules)"
                  placeholder="physique, mecanique, bac2026"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-tag-outline"
                  class="rounded-lg mb-2"
                />
              </v-col>

              <!-- Order Field -->
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="editForm.order"
                  type="number"
                  label="Ordre d'affichage"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-sort-numeric-ascending"
                  class="rounded-lg mb-2"
                />
              </v-col>

              <!-- Description Field -->
              <v-col cols="12">
                <v-textarea
                  v-model="editForm.description"
                  label="Description"
                  placeholder="Brève description du contenu de la ressource..."
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  prepend-inner-icon="mdi-text-box-outline"
                  class="rounded-lg mb-2"
                />
              </v-col>
            </v-row>
          </v-expand-transition>
        </v-card-text>

        <v-divider class="my-1" />

        <v-card-actions class="pa-4">
          <v-btn
            variant="text"
            color="default"
            class="rounded-pill px-4"
            @click="closeEditModal"
          >
            Annuler
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="rounded-pill px-6 font-weight-bold"
            prepend-icon="mdi-check"
            data-test="apply-edit"
            @click="applyModalEdits"
          >
            Appliquer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bulk Classify Dialog -->
    <BulkClassifyDialog v-model="bulkDialog" :count="selectedIds.length" @apply="onBulkApply" />

    <!-- Global Feedback Snackbar -->
    <v-snackbar
      v-model="snack.show"
      :color="snack.color"
      location="bottom right"
      class="rounded-xl"
      elevation="4"
      :timeout="3000"
    >
      <div class="d-flex align-center ga-2 font-weight-medium">
        <v-icon :icon="snack.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'" />
        {{ snack.text }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from "vue";
import PasswordGate from "../components/PasswordGate.vue";
import { useLibrary } from "../composables/useLibrary";
import { saveMeta } from "../api";
import { reindex } from "../api";
import { LEVELS, TYPES, SUBJECTS } from "../config";
import { loadAdminPassword, saveAdminPassword, clearAdminPassword } from "../lib/adminAuth";
import { fileKind } from "../lib/fileKind";
import FilePreview from "../components/FilePreview.vue";
import { isClassified, classificationStats, missingFields } from "../lib/classification";
import FolderTree from "../components/FolderTree.vue";
import { buildFolderTree, filesUnder } from "../lib/folderTree";
import { chaptersFor } from "../data/chapters";
import {
  toEditRow, toSaveInput, saveKey, changedRows, applyBulkPatch, titleSuggestions,
  type EditRow, type BulkPatch,
} from "./adminRows";
import BulkClassifyDialog from "../components/BulkClassifyDialog.vue";

function kindOf(r: EditRow) {
  return fileKind(r.name, r.mimeType);
}

const { items, loading, refreshing, error, stale, ensureLoaded, reload } = useLibrary();
// Reactive so that updating it after a save re-triggers the "unsaved changes" badge
// (a plain Map's mutations wouldn't invalidate the computed that reads it).
const baseline = reactive(new Map<string, string>());
const password = ref("");
const search = ref("");
const saving = ref(false);
const reindexing = ref(false);
const rows = ref<EditRow[]>([]);
const snack = reactive({ show: false, text: "", color: "success" });

// Folder navigation. An empty path is the synthetic "Tout" root.
const selectedPath = ref<string[]>([]);
const recursive = ref(true);
const folderDrawer = ref(false); // mobile only

// The tree is built from `rows`, not `items`, so its percentages move as you classify
// and before you save — matching the global progress bar.
const tree = computed(() => buildFolderTree(rows.value));

/** Rows under the selected folder, before status filtering. */
const scopedRows = computed(() => filesUnder(rows.value, selectedPath.value, recursive.value));

const selectedIds = ref<string[]>([]);
const bulkDialog = ref(false);

function onSelectFolder(path: string[]): void {
  selectedPath.value = path;
  // A stale selection must never be bulk-applied to files that are no longer on screen.
  selectedIds.value = [];
  folderDrawer.value = false;
}

// Sticky across folder changes: the workflow is moving folder to folder hunting
// unclassified files, so resetting this on every hop would fight the user.
const statusFilter = ref<"todo" | "done" | "all">("todo");

/** Counts for the three buttons: scoped to the folder, deliberately ignoring `search`. */
const statusCounts = computed(() => {
  const done = scopedRows.value.filter(isClassified).length;
  return { todo: scopedRows.value.length - done, done, all: scopedRows.value.length };
});

/** Rows actually shown: folder scope narrowed by status. `search` is applied by the table. */
const visibleRows = computed(() => {
  if (statusFilter.value === "all") return scopedRows.value;
  const wantClassified = statusFilter.value === "done";
  return scopedRows.value.filter((r) => isClassified(r) === wantClassified);
});

// In-app file preview state
const previewDialog = ref(false);
const previewRow = ref<EditRow | null>(null);

function openPreview(row: EditRow): void {
  previewRow.value = row;
  previewDialog.value = true;
}

// Modal editing state
const editDialog = ref(false);
const editingRow = ref<EditRow | null>(null);
const showAdvanced = ref(false);
const editForm = reactive<EditRow>({
  fileId: "",
  name: "",
  mimeType: "",
  path: [],
  level: [],
  type: "",
  subject: "",
  chapter: [],
  title: "",
  description: "",
  tags: "",
  order: 0,
});

const headers = [
  { title: "Fichier", key: "name", sortable: true },
  { title: "Niveau / Type", key: "level", sortable: true },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const },
];

function rebuildRows(): void {
  rows.value = items.value.map(toEditRow);
  baseline.clear();
  for (const r of rows.value) baseline.set(r.fileId, saveKey(r));
}
const pendingChangesCount = computed(() => {
  if (rows.value.length === 0) return 0;
  return changedRows(rows.value, baseline).length;
});

// The library can arrive twice now: once from the local cache for an instant render, then
// again from the background refresh. Rebuilding rows discards unsaved edits, so a refresh
// that lands mid-edit must leave the editor alone — the alternative is silently losing work.
watch(items, () => {
  if (pendingChangesCount.value > 0) {
    notify("Données actualisées en arrière-plan — vos modifications ont été conservées.", "info");
    return;
  }
  rebuildRows();
});

// Progress for the folder currently in view ("Tout" = the whole library). Reads rows, so
// it reflects unsaved edits too.
const stats = computed(() => classificationStats(scopedRows.value));

function openEditModal(row: EditRow): void {
  editingRow.value = row;
  // Clone list fields so editing the modal doesn't mutate the row until "Appliquer".
  Object.assign(editForm, { ...row, level: [...row.level], chapter: [...row.chapter] });
  showAdvanced.value = false;
  editDialog.value = true;
}

function closeEditModal(): void {
  editDialog.value = false;
  editingRow.value = null;
}

// Chapters suggested for the currently-edited level + matière (combobox still
// accepts any free-typed value not in this list).
const chapterOptions = computed(() => {
  const merged = editForm.level.flatMap((l) => chaptersFor(l, editForm.subject));
  return [...new Set(merged)];
});

// Display-title suggestions: the original file name first, then this file's chapters,
// plain and with the type appended.
const titleOptions = computed(() =>
  titleSuggestions(editForm.name, editForm.chapter, editForm.type, chapterOptions.value)
);

function applyModalEdits(): void {
  if (!editingRow.value) return;
  const target = rows.value.find((r) => r.fileId === editingRow.value?.fileId);
  if (target) {
    Object.assign(target, editForm, { level: [...editForm.level], chapter: [...editForm.chapter] });
  }
  closeEditModal();
}

function onBulkApply(patch: BulkPatch): void {
  const n = applyBulkPatch(rows.value, new Set(selectedIds.value), patch);
  selectedIds.value = [];
  notify(`Appliqué à ${n} fichier${n > 1 ? "s" : ""} ✓`, "success");
}

onMounted(async () => {
  const stored = loadAdminPassword();
  if (stored) {
    password.value = stored;
    await ensureLoaded();
    rebuildRows();
  }
});

function notify(text: string, color: string): void {
  snack.text = text;
  snack.color = color;
  snack.show = true;
}

async function onUnlocked(pw: string): Promise<void> {
  password.value = pw;
  saveAdminPassword(pw);
  await ensureLoaded();
  rebuildRows();
}

function logout(): void {
  clearAdminPassword();
  password.value = "";
}

async function save(): Promise<void> {
  const changed = changedRows(rows.value, baseline);
  if (changed.length === 0) {
    notify("Aucune modification à enregistrer.", "info");
    return;
  }
  saving.value = true;
  try {
    const res = await saveMeta(password.value, changed.map(toSaveInput));
    if (res.ok) {
      for (const r of changed) baseline.set(r.fileId, saveKey(r));
      notify(`Enregistré ✓ (${changed.length} fichier${changed.length > 1 ? "s" : ""})`, "success");
    } else {
      notify(`Erreur : ${res.error ?? "inconnue"}`, "error");
    }
  } catch (e) {
    notify(`Échec de l'enregistrement : ${e instanceof Error ? e.message : String(e)}`, "error");
  } finally {
    saving.value = false;
  }
}

async function doReindex(): Promise<void> {
  reindexing.value = true;
  try {
    const res = await reindex(password.value);
    if (res.ok) {
      notify(`Réindexé (${res.count ?? "?"} fichiers) ✓`, "success");
      await reload();
      rebuildRows();
    } else {
      notify(`Erreur : ${res.error ?? "inconnue"}`, "error");
    }
  } catch (e) {
    notify(`Échec de la réindexation : ${e instanceof Error ? e.message : String(e)}`, "error");
  } finally {
    reindexing.value = false;
  }
}
</script>

<style scoped>
.folder-pane {
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.admin-view {
  max-width: 1500px;
}

.sticky-toolbar {
  position: sticky;
  top: 72px;
  z-index: 50;
  background: rgba(var(--v-theme-surface), 0.9) !important;
  backdrop-filter: blur(12px);
}

.icon-wrapper {
  width: 38px;
  height: 38px;
}

.table-input :deep(.v-field) {
  border-radius: 8px !important;
}
</style>
