<template>
  <div class="d-flex flex-column align-center justify-center py-12 px-4" style="max-width: 440px; margin: 0 auto">
    <v-card class="w-100 pa-6 rounded-2xl border text-center shadow-sm" elevation="0">
      <div class="lock-avatar mx-auto mb-4 rounded-circle d-flex align-center justify-center">
        <v-icon icon="mdi-shield-lock-outline" color="primary" size="32" />
      </div>

      <h2 class="text-h6 font-weight-bold mb-1">Espace Administration</h2>
      <p class="text-caption text-medium-emphasis mb-6">
        Veuillez saisir votre mot de passe pour accéder aux fonctionnalités d'édition.
      </p>

      <v-text-field
        type="password"
        label="Mot de passe admin"
        v-model="password"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-key-outline"
        class="w-100 mb-4 rounded-lg"
        hide-details="auto"
        @keyup.enter="unlock"
      />

      <v-btn
        color="primary"
        data-test="unlock"
        :loading="busy"
        block
        size="large"
        class="rounded-pill font-weight-bold"
        append-icon="mdi-arrow-right"
        @click="unlock"
      >
        Déverrouiller
      </v-btn>

      <v-alert v-if="err" type="error" variant="tonal" class="w-100 mt-4 rounded-xl text-left" icon="mdi-alert-circle">
        {{ err }}
      </v-alert>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { saveMeta, type SaveInput } from "../api";

const props = defineProps<{
  validate?: (password: string, rows: SaveInput[]) => Promise<{ ok: boolean; error?: string }>;
}>();
const emit = defineEmits<{ unlocked: [string] }>();

const password = ref("");
const err = ref<string | null>(null);
const busy = ref(false);

async function unlock(): Promise<void> {
  busy.value = true;
  err.value = null;
  const validator = props.validate ?? saveMeta;
  const res = await validator(password.value, []);
  busy.value = false;
  if (res.ok) {
    emit("unlocked", password.value);
  } else {
    err.value = res.error === "unauthorized" ? "Mot de passe incorrect." : (res.error ?? "Erreur.");
  }
}
</script>

<style scoped>
.lock-avatar {
  width: 64px;
  height: 64px;
  background: rgba(var(--v-theme-primary), 0.1);
}
</style>
