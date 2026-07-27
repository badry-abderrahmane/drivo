<template>
  <div class="admin-view pb-12">
    <PasswordGate v-if="!password" @unlocked="onUnlocked" />

    <div v-else class="max-width-xl mx-auto py-6 px-4">
      <!-- Admin Toolbar Card -->
      <v-card class="rounded-xl border mb-6 pa-3 filter-toolbar sticky-toolbar" elevation="0">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <v-text-field
            v-model="search"
            placeholder="Rechercher par fichier, titre, niveau..."
            prepend-inner-icon="mdi-magnify"
            hide-details
            density="compact"
            variant="solo-filled"
            flat
            clearable
            class="search-input rounded-lg flex-grow-1"
            style="max-width: 360px"
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
      <v-progress-linear v-if="loading" indeterminate color="primary" class="rounded-pill mb-4" data-test="loading" />

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

      <!-- Data Table Card -->
      <v-card v-show="rows.length > 0" class="rounded-2xl border pa-2 overflow-hidden shadow-sm" elevation="0">
        <v-data-table
          :headers="headers"
          :items="rows"
          :search="search"
          :loading="loading"
          item-value="fileId"
          :items-per-page="25"
          :items-per-page-options="[10, 25, 50, 100]"
          density="comfortable"
          hover
          class="admin-table"
        >
          <!-- File Column -->
          <template #item.name="{ item }">
            <div class="d-flex align-center ga-2 py-2">
              <div
                class="icon-wrapper flex-shrink-0 d-flex align-center justify-center rounded-lg pa-1"
                :style="{ backgroundColor: `${kindOf(item).color}15`, color: kindOf(item).color }"
              >
                <v-icon :icon="kindOf(item).icon" size="20" />
              </div>
              <span class="font-weight-bold text-body-2 text-truncate" style="max-width: 200px" :title="item.name">
                {{ item.name }}
              </span>
            </div>
          </template>

          <!-- Title Column with Inline Input & Quick Preview -->
          <template #item.title="{ item }">
            <v-text-field
              data-test="cell-title"
              v-model="item.title"
              :placeholder="item.name"
              variant="outlined"
              hide-details
              density="compact"
              class="table-input"
              style="min-width: 160px"
            />
          </template>

          <!-- Level Column -->
          <template #item.level="{ item }">
            <v-chip v-if="item.level" size="small" color="primary" variant="tonal" class="font-weight-medium">
              {{ item.level }}
            </v-chip>
            <span v-else class="text-caption text-disabled">—</span>
          </template>

          <!-- Type Column -->
          <template #item.type="{ item }">
            <v-chip v-if="item.type" size="small" color="secondary" variant="tonal" class="font-weight-medium">
              {{ item.type }}
            </v-chip>
            <span v-else class="text-caption text-disabled">—</span>
          </template>

          <!-- Subject Column -->
          <template #item.subject="{ item }">
            <span v-if="item.subject" class="text-body-2 font-weight-medium">{{ item.subject }}</span>
            <span v-else class="text-caption text-disabled">—</span>
          </template>

          <!-- Chapter Column -->
          <template #item.chapter="{ item }">
            <span v-if="item.chapter.length" class="text-body-2 text-truncate" style="max-width: 180px" :title="item.chapter.join(' · ')">
              {{ item.chapter.join(" · ") }}
            </span>
            <span v-else class="text-caption text-disabled">—</span>
          </template>

          <!-- Order Column -->
          <template #item.order="{ item }">
            <span class="text-body-2 font-weight-medium">{{ item.order ?? 0 }}</span>
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
    </div>

    <!-- File Preview Modal (in-app, no leaving the app) -->
    <v-dialog v-model="previewDialog" max-width="960" transition="dialog-bottom-transition">
      <v-card v-if="previewRow" class="rounded-2xl overflow-hidden">
        <v-toolbar density="comfortable" color="surface" class="px-2">
          <div
            class="icon-wrapper d-flex align-center justify-center rounded-lg ml-2 mr-1 pa-1"
            :style="{ backgroundColor: `${kindOf(previewRow).color}15`, color: kindOf(previewRow).color }"
          >
            <v-icon :icon="kindOf(previewRow).icon" size="20" />
          </div>
          <v-toolbar-title class="text-body-1 font-weight-medium text-truncate">
            {{ previewRow.title || previewRow.name }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            :href="previewOpenUrl"
            target="_blank"
            rel="noopener"
            variant="text"
            size="small"
            prepend-icon="mdi-open-in-new"
            class="rounded-pill"
          >
            Ouvrir dans Drive
          </v-btn>
          <v-btn icon="mdi-close" variant="text" @click="closePreview" />
        </v-toolbar>
        <div class="preview-frame-wrapper">
          <iframe
            :src="previewSrc"
            data-test="preview-frame"
            class="preview-frame"
            allow="autoplay"
            allowfullscreen
          />
        </div>
      </v-card>
    </v-dialog>

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
          <v-card-subtitle class="text-caption text-medium-emphasis text-truncate">
            Fichier d'origine : {{ editingRow.name }}
          </v-card-subtitle>
        </v-card-item>

        <v-divider class="my-2" />

        <v-card-text class="pt-2">
          <v-row dense>
            <!-- Title Field -->
            <v-col cols="12">
              <v-text-field
                v-model="editForm.title"
                label="Titre d'affichage"
                placeholder="Ex: Cours de Mécanique - Chapitre 1"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-format-title"
                class="rounded-lg mb-2"
              />
            </v-col>

            <!-- Level Select -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.level"
                label="Niveau d'études"
                :items="LEVELS"
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
                :placeholder="editForm.level ? 'Choisir ou saisir un ou plusieurs chapitres' : 'Saisir un chapitre'"
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
            @click="applyModalEdits"
          >
            Appliquer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { drivePreviewUrl, driveOpenUrl } from "../lib/drivePreview";
import { chaptersFor } from "../data/chapters";
import { toEditRow, toSaveInput, saveKey, changedRows, type EditRow } from "./adminRows";

function kindOf(r: EditRow) {
  return fileKind(r.name, r.mimeType);
}

const { items, loading, error, stale, ensureLoaded, reload } = useLibrary();
const baseline = new Map<string, string>();
const password = ref("");
const search = ref("");
const saving = ref(false);
const reindexing = ref(false);
const rows = ref<EditRow[]>([]);
const snack = reactive({ show: false, text: "", color: "success" });

// In-app file preview state
const previewDialog = ref(false);
const previewRow = ref<EditRow | null>(null);
const previewSrc = computed(() =>
  previewRow.value ? drivePreviewUrl(previewRow.value.fileId, previewRow.value.mimeType) : ""
);
const previewOpenUrl = computed(() =>
  previewRow.value ? driveOpenUrl(previewRow.value.fileId, previewRow.value.mimeType) : "#"
);

function openPreview(row: EditRow): void {
  previewRow.value = row;
  previewDialog.value = true;
}
function closePreview(): void {
  previewDialog.value = false;
  previewRow.value = null;
}

// Modal editing state
const editDialog = ref(false);
const editingRow = ref<EditRow | null>(null);
const editForm = reactive<EditRow>({
  fileId: "",
  name: "",
  mimeType: "",
  level: "",
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
  { title: "Titre d'affichage", key: "title", sortable: true },
  { title: "Niveau", key: "level", sortable: true },
  { title: "Type", key: "type", sortable: true },
  { title: "Matière", key: "subject", sortable: true },
  { title: "Chapitre", key: "chapter", sortable: true },
  { title: "Ordre", key: "order", sortable: true },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const },
];

function rebuildRows(): void {
  rows.value = items.value.map(toEditRow);
  baseline.clear();
  for (const r of rows.value) baseline.set(r.fileId, saveKey(r));
}
watch(items, rebuildRows);

const pendingChangesCount = computed(() => {
  if (rows.value.length === 0) return 0;
  return changedRows(rows.value, baseline).length;
});

function openEditModal(row: EditRow): void {
  editingRow.value = row;
  // Clone chapter array so editing the modal doesn't mutate the row until "Appliquer".
  Object.assign(editForm, { ...row, chapter: [...row.chapter] });
  editDialog.value = true;
}

function closeEditModal(): void {
  editDialog.value = false;
  editingRow.value = null;
}

// Chapters suggested for the currently-edited level + matière (combobox still
// accepts any free-typed value not in this list).
const chapterOptions = computed(() => chaptersFor(editForm.level, editForm.subject));

function applyModalEdits(): void {
  if (!editingRow.value) return;
  const target = rows.value.find((r) => r.fileId === editingRow.value?.fileId);
  if (target) {
    Object.assign(target, editForm, { chapter: [...editForm.chapter] });
  }
  closeEditModal();
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

.preview-frame-wrapper {
  width: 100%;
  height: 78vh;
  background: #000;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
