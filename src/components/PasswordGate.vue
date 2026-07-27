<template>
  <div class="d-flex flex-column align-center pa-8 ga-4" style="max-width: 420px; margin: 0 auto">
    <v-text-field
      type="password"
      label="Mot de passe"
      v-model="password"
      class="w-100"
      hide-details
      @keyup.enter="unlock"
    />
    <v-btn color="primary" data-test="unlock" :loading="busy" block @click="unlock">Déverrouiller</v-btn>
    <v-alert v-if="err" type="error" variant="tonal" class="w-100">{{ err }}</v-alert>
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
