<template>
  <div>
    <PasswordGate v-if="!password" @unlocked="onUnlocked" />

    <div v-else>
      <v-toolbar density="comfortable" color="surface" class="px-4" style="position: sticky; top: 64px; z-index: 2">
        <v-text-field v-model="search" placeholder="Rechercher…" prepend-inner-icon="mdi-magnify" hide-details density="compact" style="max-width: 320px" />
        <v-spacer />
        <v-btn color="primary" data-test="save" :loading="saving" @click="save">Enregistrer</v-btn>
        <v-btn class="ml-2" variant="tonal" data-test="reindex" :loading="reindexing" @click="doReindex">Réindexer Drive</v-btn>
      </v-toolbar>

      <v-alert v-if="stale" type="warning" variant="tonal" class="ma-4">Hors ligne — données en cache.</v-alert>

      <v-data-table
        :headers="headers"
        :items="rows"
        :search="search"
        item-value="fileId"
        :items-per-page="25"
        :items-per-page-options="[10, 25, 50, 100]"
        density="comfortable"
        class="px-2"
      >
        <template #item.title="{ item }">
          <v-text-field data-test="cell-title" v-model="item.title" :placeholder="item.name" variant="plain" hide-details density="compact" />
        </template>
        <template #item.level="{ item }">
          <v-select v-model="item.level" :items="LEVELS" clearable variant="plain" hide-details density="compact" style="min-width: 140px" />
        </template>
        <template #item.type="{ item }">
          <v-select v-model="item.type" :items="TYPES" clearable variant="plain" hide-details density="compact" style="min-width: 120px" />
        </template>
        <template #item.subject="{ item }">
          <v-select v-model="item.subject" :items="SUBJECTS" clearable variant="plain" hide-details density="compact" style="min-width: 110px" />
        </template>
        <template #item.chapter="{ item }">
          <v-text-field v-model="item.chapter" variant="plain" hide-details density="compact" />
        </template>
        <template #item.tags="{ item }">
          <v-text-field v-model="item.tags" placeholder="a,b,c" variant="plain" hide-details density="compact" />
        </template>
        <template #item.description="{ item }">
          <v-text-field v-model="item.description" variant="plain" hide-details density="compact" />
        </template>
        <template #item.order="{ item }">
          <v-text-field v-model.number="item.order" type="number" variant="plain" hide-details density="compact" style="max-width: 80px" />
        </template>
      </v-data-table>
    </div>

    <v-snackbar v-model="snack.show" :color="snack.color" :timeout="3000">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import PasswordGate from "../components/PasswordGate.vue";
import { useLibrary } from "../composables/useLibrary";
import { saveMeta, reindex } from "../api";
import { LEVELS, TYPES, SUBJECTS } from "../config";
import { toEditRow, toSaveInput, saveKey, changedRows, type EditRow } from "./adminRows";

const { items, stale, ensureLoaded, reload } = useLibrary();
// Snapshot of each row's saved state at load/save time, to send only edited rows.
const baseline = new Map<string, string>();
const password = ref("");
const search = ref("");
const saving = ref(false);
const reindexing = ref(false);
const rows = ref<EditRow[]>([]);
const snack = reactive({ show: false, text: "", color: "success" });

const headers = [
  { title: "Fichier", key: "name", sortable: true },
  { title: "Titre", key: "title" },
  { title: "Niveau", key: "level" },
  { title: "Type", key: "type" },
  { title: "Matière", key: "subject" },
  { title: "Chapitre", key: "chapter" },
  { title: "Tags", key: "tags" },
  { title: "Description", key: "description" },
  { title: "Ordre", key: "order" },
];

function rebuildRows(): void {
  rows.value = items.value.map(toEditRow);
  baseline.clear();
  for (const r of rows.value) baseline.set(r.fileId, saveKey(r));
}
watch(items, rebuildRows);

onMounted(ensureLoaded);

function notify(text: string, color: string): void {
  snack.text = text;
  snack.color = color;
  snack.show = true;
}

async function onUnlocked(pw: string): Promise<void> {
  password.value = pw;
  await ensureLoaded();
  rebuildRows();
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
