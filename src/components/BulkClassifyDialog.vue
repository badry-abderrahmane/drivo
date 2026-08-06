<template>
  <v-dialog :model-value="modelValue" max-width="640" persistent @update:model-value="close">
    <v-card class="rounded-2xl pa-2">
      <!-- Step 1: the form -->
      <template v-if="!confirming">
        <v-card-item class="pb-2">
          <v-card-title class="text-h6 font-weight-bold">Classer la sélection</v-card-title>
          <v-card-subtitle>
            {{ count }} fichier{{ count > 1 ? "s" : "" }} · les champs laissés sur
            « ne pas changer » ne seront pas modifiés
          </v-card-subtitle>
        </v-card-item>

        <v-divider class="my-2" />

        <v-card-text class="pt-2">
          <v-row dense>
            <v-col cols="12">
              <v-combobox
                v-model="form.title"
                data-test="bulk-title"
                label="Titre d'affichage"
                :items="titleOptions"
                :placeholder="untouchedLabel"
                persistent-placeholder
                :hint="titleOptions.length ? 'Suggestions d’après le(s) chapitre(s) choisi(s) ci-dessous — ou saisissez le vôtre' : 'Choisissez un chapitre pour voir des suggestions'"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-format-title"
                class="rounded-lg mb-2"
                :menu-props="{ maxHeight: 300 }"
                @update:model-value="touched.title = true"
              />
              <v-btn
                v-if="touched.title"
                size="x-small"
                variant="text"
                class="mb-2"
                data-test="reset-title"
                @click="reset('title')"
              >
                Ne pas changer
              </v-btn>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.level"
                data-test="bulk-level"
                label="Niveau(x) d'études"
                :items="LEVELS"
                :placeholder="untouchedLabel"
                persistent-placeholder
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-school-outline"
                class="rounded-lg mb-2"
                @update:model-value="touched.level = true"
              />
              <v-btn
                v-if="touched.level"
                size="x-small"
                variant="text"
                class="mb-2"
                data-test="reset-level"
                @click="reset('level')"
              >
                Ne pas changer
              </v-btn>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.type"
                data-test="bulk-type"
                label="Type de document"
                :items="TYPES"
                :placeholder="untouchedLabel"
                persistent-placeholder
                clearable
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-file-document-outline"
                class="rounded-lg mb-2"
                @update:model-value="touched.type = true"
              />
              <v-btn
                v-if="touched.type"
                size="x-small"
                variant="text"
                class="mb-2"
                data-test="reset-type"
                @click="reset('type')"
              >
                Ne pas changer
              </v-btn>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.subject"
                data-test="bulk-subject"
                label="Matière"
                :items="SUBJECTS"
                :placeholder="untouchedLabel"
                persistent-placeholder
                clearable
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-book-open-variant"
                class="rounded-lg mb-2"
                @update:model-value="touched.subject = true"
              />
              <v-btn
                v-if="touched.subject"
                size="x-small"
                variant="text"
                class="mb-2"
                data-test="reset-subject"
                @click="reset('subject')"
              >
                Ne pas changer
              </v-btn>
            </v-col>

            <v-col cols="12" sm="6">
              <v-combobox
                v-model="form.chapter"
                data-test="bulk-chapter"
                label="Chapitre(s)"
                :items="chapterOptions"
                :placeholder="untouchedLabel"
                persistent-placeholder
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-bookmark-outline"
                class="rounded-lg mb-2"
                :menu-props="{ maxHeight: 340 }"
                @update:model-value="touched.chapter = true"
              />
              <v-btn
                v-if="touched.chapter"
                size="x-small"
                variant="text"
                class="mb-2"
                data-test="reset-chapter"
                @click="reset('chapter')"
              >
                Ne pas changer
              </v-btn>
            </v-col>
          </v-row>

          <v-alert
            v-if="!anyTouched"
            type="info"
            variant="tonal"
            density="compact"
            class="rounded-lg mt-2"
          >
            Modifiez au moins un champ pour pouvoir appliquer.
          </v-alert>
        </v-card-text>

        <v-divider class="my-1" />

        <v-card-actions class="pa-4">
          <v-btn variant="text" class="rounded-pill px-4" @click="close">Annuler</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="rounded-pill px-6 font-weight-bold"
            prepend-icon="mdi-check"
            data-test="bulk-apply"
            :disabled="!anyTouched"
            @click="confirming = true"
          >
            Appliquer
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Step 2: the confirmation -->
      <template v-else>
        <v-card-item class="pb-2">
          <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
            <v-icon icon="mdi-alert-outline" color="warning" />
            Appliquer à {{ count }} fichier{{ count > 1 ? "s" : "" }} ?
          </v-card-title>
        </v-card-item>

        <v-card-text data-test="bulk-confirm-text">
          <div v-for="line in summary" :key="line" class="text-body-2 mb-1">• {{ line }}</div>
          <div class="text-body-2 mt-3 font-weight-medium">
            {{ count }} fichier{{ count > 1 ? "s" : "" }}
            {{ count > 1 ? "seront modifiés" : "sera modifié" }}.
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-btn variant="text" class="rounded-pill px-4" @click="confirming = false">
            Retour
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            class="rounded-pill px-6 font-weight-bold"
            data-test="bulk-confirm"
            @click="confirm"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// Bulk edit of the title and the four classification fields.
//
// A field is emitted ONLY when it has been touched. "Touched but empty" is a real
// instruction ("vider ce champ") and is still emitted — which is why the patch is built
// from the `touched` flags and never from whether a value looks empty.
import { ref, reactive, computed, watch } from "vue";
import { LEVELS, TYPES, SUBJECTS } from "../config";
import { chaptersFor } from "../data/chapters";
import { titleSuggestions } from "../views/adminRows";
import type { BulkPatch } from "../views/adminRows";

const props = defineProps<{ modelValue: boolean; count: number }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [patch: BulkPatch];
}>();

const untouchedLabel = "— ne pas changer —";

const form = reactive({ title: "", level: [] as string[], type: "", subject: "", chapter: [] as string[] });
const touched = reactive({ title: false, level: false, type: false, subject: false, chapter: false });
const confirming = ref(false);

type Field = keyof typeof touched;

function reset(field: Field): void {
  touched[field] = false;
  if (field === "level") form.level = [];
  else if (field === "chapter") form.chapter = [];
  else form[field] = "";
}

function resetAll(): void {
  (Object.keys(touched) as Field[]).forEach(reset);
  confirming.value = false;
}

// Start clean every time the dialog opens, so a previous edit never leaks into the next.
watch(
  () => props.modelValue,
  (open) => {
    if (open) resetAll();
  }
);

const anyTouched = computed(() => Object.values(touched).some(Boolean));

// Chapters of the official programme for whichever levels are chosen here.
const chapterOptions = computed(() => [
  ...new Set(form.level.flatMap((l) => chaptersFor(l, form.subject))),
]);

// Suggestions for this dialog's title field: driven by whatever chapter(s)/type are chosen
// here, never by any single file's name (a bulk selection spans files with different names).
const titleOptions = computed(() =>
  titleSuggestions("", form.chapter, form.type, chapterOptions.value)
);

const summary = computed(() => {
  const lines: string[] = [];
  const show = (v: string) => (v === "" ? "(vidé)" : v);
  if (touched.title) lines.push(`Titre → ${show(form.title)}`);
  if (touched.level) lines.push(`Niveau → ${form.level.length ? form.level.join(", ") : "(vidé)"}`);
  if (touched.type) lines.push(`Type → ${show(form.type)}`);
  if (touched.subject) lines.push(`Matière → ${show(form.subject)}`);
  if (touched.chapter) {
    lines.push(`Chapitre → ${form.chapter.length ? form.chapter.join(", ") : "(vidé)"}`);
  }
  return lines;
});

function close(): void {
  emit("update:modelValue", false);
}

function confirm(): void {
  const patch: BulkPatch = {};
  if (touched.title) patch.title = form.title ?? "";
  if (touched.level) patch.level = [...form.level];
  if (touched.type) patch.type = form.type ?? "";
  if (touched.subject) patch.subject = form.subject ?? "";
  if (touched.chapter) patch.chapter = [...form.chapter];
  emit("apply", patch);
  close();
}

// Exposed so the mount tests can drive the form without fighting Vuetify's menus in jsdom.
defineExpose({ form, touched, summary, confirm, titleOptions });
</script>
