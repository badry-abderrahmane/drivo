<template>
  <VCommandPalette
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    v-model:search="query"
    :items="paletteItems"
    hotkey="cmd+k"
    placeholder="Rechercher un cours, une formule, un chapitre..."
    no-filter
    :no-data-text="noDataText"
    max-width="680"
    :fullscreen="mobile"
    class="glass-palette rounded-24 overflow-hidden elevation-8 border-primary"
  >
    <!-- Bold Primary Container Header Accent & Filter Section -->
    <template #prepend>
      <v-sheet color="primary" height="4" class="w-100" />
      <div class="palette-filters px-6 pt-4 pb-3 bg-primary-container border-b d-flex flex-column ga-2">
        <div class="d-flex align-center justify-space-between">
          <span class="text-caption font-weight-bold text-uppercase text-on-primary-container tracking-wider">
            Filtres de recherche
          </span>
          <div class="d-flex align-center ga-2">
            <v-fade-transition>
              <v-btn
                v-if="hasActiveFilters"
                size="x-small"
                color="error"
                variant="flat"
                class="rounded-pill font-weight-medium px-3"
                @click="clearFilters"
              >
                <v-icon size="x-small" icon="mdi-filter-off" class="mr-1" />
                Réinitialiser
              </v-btn>
            </v-fade-transition>
            <v-btn
              icon="mdi-close"
              variant="tonal"
              size="x-small"
              color="on-primary-container"
              class="rounded-circle"
              title="Fermer la modal"
              aria-label="Fermer la modal"
              @click="$emit('update:modelValue', false)"
            />
          </div>
        </div>

        <div class="d-flex flex-wrap align-center ga-2 pt-1">
          <v-chip
            v-for="lvl in levels"
            :key="lvl"
            size="small"
            :variant="selectedLevel === lvl ? 'flat' : 'tonal'"
            :color="selectedLevel === lvl ? 'primary' : 'on-primary-container'"
            class="font-weight-medium rounded-pill transition-ease-in-out px-3"
            @click="selectedLevel = selectedLevel === lvl ? undefined : lvl"
          >
            <template #prepend v-if="selectedLevel === lvl">
              <v-icon size="x-small" icon="mdi-check-circle" class="mr-1" />
            </template>
            {{ lvl }}
          </v-chip>

          <v-divider v-if="levels.length && types.length" vertical class="mx-1 my-1" color="primary" />

          <v-chip
            v-for="t in types"
            :key="t"
            size="small"
            :variant="selectedType === t ? 'flat' : 'tonal'"
            :color="selectedType === t ? 'secondary' : 'on-primary-container'"
            class="font-weight-medium rounded-pill transition-ease-in-out px-3"
            @click="selectedType = selectedType === t ? undefined : t"
          >
            <template #prepend v-if="selectedType === t">
              <v-icon size="x-small" icon="mdi-check-circle" class="mr-1" />
            </template>
            {{ t }}
          </v-chip>
        </div>
      </div>
    </template>

    <!-- Appended to search input field (clear button + ESC hint, desktop only — the
         header's close button is the one and only way to close the dialog with a click;
         on mobile there's no physical Escape key, and there isn't room for the hint
         chip anyway, so it's dropped there rather than crowding the placeholder text). -->
    <template #input.append-inner>
      <div class="d-flex align-center ga-2 pr-1">
        <v-fade-transition>
          <v-btn
            v-if="query"
            icon="mdi-close-circle"
            variant="text"
            density="compact"
            size="small"
            color="primary"
            @click="query = ''"
            aria-label="Effacer la recherche"
          />
        </v-fade-transition>
        <v-chip
          v-if="!mobile"
          size="x-small"
          color="primary"
          variant="flat"
          class="font-weight-bold text-caption px-2 rounded-md"
        >
          ESC
        </v-chip>
      </div>
    </template>

    <!-- Custom Result Item Styling. These three slots only ever receive our own
         action-type entries — Vuetify's VList dispatches subheader/divider rows
         through its own separate slots, never this one — but the slot's declared
         type is the full item union, so asAction() narrows it back for TS. -->
    <template #item.prepend="{ item }">
      <v-avatar
        :color="asAction(item).title?.startsWith('Voir tous') ? 'primary' : 'primary-container'"
        size="40"
        class="mr-3 rounded-xl"
      >
        <v-icon
          :color="asAction(item).title?.startsWith('Voir tous') ? 'on-primary' : 'primary'"
          size="20"
          :icon="asAction(item).prependIcon || 'mdi-file-document-outline'"
        />
      </v-avatar>
    </template>

    <template #item.title="{ item }">
      <div class="d-flex align-center justify-space-between w-100">
        <span
          :class="asAction(item).title?.startsWith('Voir tous')
            ? 'text-primary font-weight-bold text-body-1'
            : 'font-weight-bold text-body-1 text-on-surface'"
        >
          {{ asAction(item).title }}
        </span>
      </div>
    </template>

    <template #item.append="{ item }">
      <template v-if="asAction(item).title?.startsWith('Voir tous')">
        <v-chip size="small" color="primary" variant="flat" class="font-weight-medium rounded-pill">
          {{ matches.length }} résultats
        </v-chip>
      </template>
      <template v-else>
        <v-avatar color="primary-container" size="28">
          <v-icon size="small" color="primary">
            mdi-arrow-right-bold
          </v-icon>
        </v-avatar>
      </template>
    </template>

    <!-- Empty & Initial State -->
    <template #no-data>
      <v-fade-transition appear>
        <div class="d-flex flex-column align-center justify-center py-12 px-6 text-center">
          <v-avatar color="primary-container" size="72" class="mb-4">
            <v-icon size="36" color="primary" :icon="query.trim() ? 'mdi-file-search-outline' : 'mdi-creation'" />
          </v-avatar>
          <div class="text-h6 font-weight-bold text-on-surface mb-1">
            {{ query.trim() ? 'Aucun résultat trouvé' : 'Recherche intelligente dans la bibliothèque' }}
          </div>
          <div class="text-body-2 text-medium-emphasis" style="max-width: 440px">
            {{ noDataText }}
          </div>
        </div>
      </v-fade-transition>
    </template>

    <!-- Bottom keyboard-hints toolbar. Desktop only: every hint on it names a key a phone
         does not have — arrows to navigate, Enter to open, Escape to close — and on a small
         screen it was spending a strip of the results area saying so. -->
    <template #append>
      <v-sheet
        v-if="!mobile"
        color="primary-container"
        class="px-6 py-3 border-t d-flex align-center justify-space-between text-caption"
      >
        <div class="d-flex align-center ga-4 text-on-primary-container font-weight-medium">
          <span class="d-inline-flex align-center ga-1.5">
            <v-chip size="x-small" color="primary" variant="flat" class="px-2 font-weight-bold rounded-md">↑↓</v-chip>
            <span>Naviguer</span>
          </span>
          <span class="d-inline-flex align-center ga-1.5">
            <v-chip size="x-small" color="primary" variant="flat" class="px-2 font-weight-bold rounded-md">↵</v-chip>
            <span>Ouvrir</span>
          </span>
          <span class="d-inline-flex align-center ga-1.5">
            <v-chip size="x-small" color="surface" variant="flat" class="px-2 font-weight-bold rounded-md">ESC</v-chip>
            <span>Fermer</span>
          </span>
        </div>

        <v-fade-transition>
          <v-chip
            v-if="matches.length"
            size="x-small"
            color="primary"
            variant="flat"
            class="font-weight-medium rounded-pill"
          >
            {{ matches.length }} {{ matches.length === 1 ? 'résultat' : 'résultats' }}
          </v-chip>
        </v-fade-transition>
      </v-sheet>
    </template>
  </VCommandPalette>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { docSlug } from "../lib/doc";
import { useDisplay } from "vuetify";
import { VCommandPalette } from "vuetify/labs/VCommandPalette";
import { useLibrary } from "../composables/useLibrary";
import { isClassified } from "../lib/classification";
import { applyFilters, distinctLevels, distinctValues } from "../lib/filter";
import { fileKind } from "../lib/fileKind";
import type { LibraryItem } from "../lib/types";

interface PaletteActionItem {
  type?: "item";
  title?: string;
  subtitle?: string;
  prependIcon?: string;
  onClick?: (event: MouseEvent | KeyboardEvent, value?: unknown) => void;
}
interface PaletteSubheader {
  type: "subheader";
  title: string;
}
interface PaletteDivider {
  type: "divider";
}
type PaletteItem = PaletteActionItem | PaletteSubheader | PaletteDivider;

// The item.prepend/title/append slots are typed by Vuetify against its own item
// union (subheader/divider included), but at runtime VList dispatches those two
// through its own separate slots — this one only ever receives an action item.
function asAction(item: unknown): PaletteActionItem {
  return item as PaletteActionItem;
}

const props = defineProps<{ modelValue: boolean }>();
defineEmits<{ "update:modelValue": [boolean] }>();

const router = useRouter();
const { items } = useLibrary();
const { mobile } = useDisplay();

const published = computed(() => items.value.filter((it) => isClassified(it.meta)));

const query = ref("");
const selectedLevel = ref<string | undefined>(undefined);
const selectedType = ref<string | undefined>(undefined);
const levels = computed(() => distinctLevels(published.value));
const types = computed(() => distinctValues(published.value, "type"));

const hasActiveFilters = computed(() => selectedLevel.value !== undefined || selectedType.value !== undefined);

function clearFilters() {
  selectedLevel.value = undefined;
  selectedType.value = undefined;
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      clearFilters();
    }
  }
);

const matches = computed(() =>
  query.value.trim()
    ? applyFilters(published.value, { level: selectedLevel.value, type: selectedType.value, search: query.value })
    : []
);

const MAX_PER_GROUP = 4;

function resultToItem(it: LibraryItem): PaletteActionItem {
  const kind = fileKind(it.name, it.mimeType);
  return {
    type: "item",
    title: it.displayTitle,
    subtitle: [...it.meta.level, it.meta.subject].filter(Boolean).join(" · "),
    prependIcon: kind.icon,
    onClick: () => router.push({ name: "doc", params: { fileId: it.fileId, slug: docSlug(it) } }),
  };
}

const paletteItems = computed<PaletteItem[]>(() => {
  const results = matches.value;
  if (results.length === 0) return [];

  const byType = new Map<string, LibraryItem[]>();
  for (const it of results) {
    const type = it.meta.type || "Autre";
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(it);
  }

  const out: PaletteItem[] = [];
  for (const [type, group] of byType) {
    out.push({ type: "subheader", title: type });
    for (const it of group.slice(0, MAX_PER_GROUP)) out.push(resultToItem(it));
  }

  const q = query.value;
  out.push({ type: "divider" });
  out.push({
    type: "item",
    title: `Voir tous les résultats (${results.length})`,
    prependIcon: "mdi-arrow-right",
    onClick: () => router.push({ name: "browse", query: { search: q } }),
  });
  return out;
});

const noDataText = computed(() =>
  query.value.trim()
    ? `Aucun résultat pour « ${query.value.trim()} ».`
    : "Tapez pour rechercher un cours, une formule, un chapitre..."
);
</script>

<style scoped>
/* Vuetify's fullscreen rule is
     .v-dialog--fullscreen > .v-overlay__content > form > .v-sheet { min-height: 100% }
   which reaches its sheet THROUGH A FORM. VCommandPalette renders
   `.v-overlay__content > .v-sheet` with no form wrapper, so that rule never matched and the
   panel stopped partway down the screen with dead space under it, even though `fullscreen`
   was set. Vuetify's own `.v-command-palette > .v-overlay__content > .v-sheet` carries
   `flex: 1 1 100%`, which needs a flex parent it never gets either — so both are supplied
   here. Scoped to the fullscreen breakpoint: on desktop the palette is a centred box and
   must keep sizing to its content. */
@media (max-width: 959.98px) {
  :deep(.v-overlay__content) {
    display: flex;
    flex-direction: column;
  }

  :deep(.v-overlay__content > .v-sheet) {
    min-height: 100%;
    flex: 1 1 auto;
  }

  /* The results list is what should absorb the extra height, not the input or the header. */
  :deep(.v-command-palette__content) {
    flex: 1 1 auto;
  }
}

.glass-palette {
  background: rgba(var(--v-theme-surface), 0.94) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

:deep(.v-command-palette__input-container) {
  padding: 16px 24px !important;
  background: rgba(var(--v-theme-surface), 1) !important;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.15);
}

:deep(.v-command-palette__input-container .v-field) {
  background: rgba(var(--v-theme-primary-container), 0.35) !important;
  border: 2px solid rgba(var(--v-theme-primary), 0.3) !important;
  border-radius: 16px !important;
  padding-inline: 14px !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:deep(.v-command-palette__input-container .v-field--focused) {
  border-color: rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-surface), 1) !important;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.15) !important;
}

:deep(.v-command-palette__input-container input) {
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}
</style>

