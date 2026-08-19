<template>
  <div
    class="author-credit d-inline-flex align-center ga-2 rounded-pill px-3 py-1"
    data-test="author-credit"
  >
    <span class="initials d-flex align-center justify-center rounded-circle">HB</span>
    <span class="text-caption font-weight-medium">
      Documents rassemblés et édités par M. {{ AUTHOR_NAME }}
    </span>
  </div>
</template>

<script setup lang="ts">
// Marine, not orange: orange means "you can act on this". Authorship is not an action.
import { AUTHOR_NAME } from "../config";
</script>

<style scoped>
.author-credit {
  background: rgb(var(--v-theme-secondary-container));
  color: rgb(var(--v-theme-on-secondary-container));
}

.initials {
  width: 20px;
  height: 20px;
  flex: none;
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
  font-size: 0.6rem;
  font-weight: 700;
}
</style>
