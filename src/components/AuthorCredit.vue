<template>
  <!-- A signature, not a badge: the portrait and name lead, the claim follows. The old filled
       pill gave a line of small print the visual weight of a call to action, and it repeated
       the sentence the footer was already printing. -->
  <div class="author-credit d-flex align-center ga-4" data-test="author-credit">
    <div class="portrait rounded-circle flex-none">
      <!-- The initials sit underneath the photo rather than in an #error slot: if the image
           is slow, blocked or missing, something recognisable is already in place instead of
           a grey hole, and there is no failure path to get right. -->
      <span class="initials d-flex align-center justify-center rounded-circle">{{ initials }}</span>
      <img
        :src="AUTHOR_PHOTO"
        :alt="`M. ${AUTHOR_NAME}`"
        class="portrait-img rounded-circle"
        width="64"
        height="64"
        loading="lazy"
        decoding="async"
        data-test="author-photo"
      />
    </div>

    <div class="d-flex flex-column">
      <span class="text-subtitle-1 font-weight-bold credit-line">M. {{ AUTHOR_NAME }}</span>
      <span class="text-caption font-weight-medium credit-line role-line">{{ AUTHOR_ROLE }}</span>
      <span class="text-caption text-medium-emphasis credit-line">
        Documents rassemblés et édités par ses soins
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
// Marine, not green: green means "you can act on this". Authorship is not an action.
import { AUTHOR_NAME, AUTHOR_ROLE, AUTHOR_PHOTO } from "../config";

// Derived rather than typed out, so the initials cannot drift from the name.
const initials = computed(() =>
  AUTHOR_NAME.split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
);
</script>

<style scoped>
/* The footer is text-center; three ragged centred lines beside a left-hand portrait read as
   a mistake, so the block sets its own alignment rather than inheriting the container's. */
.author-credit {
  text-align: start;
  width: fit-content;
}

.portrait {
  position: relative;
  width: 64px;
  height: 64px;
  flex: none;
  /* A marine ring ties the portrait to the brand and keeps it from floating on the footer's
     surface once the photo's own light background meets it. */
  box-shadow: 0 0 0 2px rgb(var(--v-theme-secondary));
}

.portrait-img,
.initials {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initials {
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* Three stacked lines at Vuetify's default leading read as three separate paragraphs;
   tightening them is what makes the block read as one signature. */
.credit-line {
  line-height: 1.35;
}

.role-line {
  color: rgb(var(--v-theme-secondary));
}
</style>
