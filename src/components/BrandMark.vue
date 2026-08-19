<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    role="img"
    aria-label="PIPC"
    class="brand-mark"
  >
    <rect width="64" height="64" rx="14" :fill="tileColor" />
    <g :fill="glyphColor">
      <rect x="12" y="18" width="40" height="8" rx="4" />
      <rect x="22" y="22" width="8" height="26" rx="4" />
      <rect x="38" y="22" width="8" height="26" rx="4" />
    </g>
  </svg>
</template>

<script setup lang="ts">
/**
 * The π mark. Rects rather than a stroked path, because that is the only form every
 * rasteriser renders — ImageMagick silently drops stroked paths and produces a blank
 * tile — so the favicon, the header and the splash are literally the same geometry.
 *
 * The tile keeps #16A34A rather than the theme's primary: at tile size it is a graphical
 * object needing 3:1, and the brighter green is the brand colour. Buttons use the
 * darker #1E7A4D via the theme.
 */
withDefaults(
  defineProps<{ size?: number; tileColor?: string; glyphColor?: string }>(),
  { size: 42, tileColor: "#16A34A", glyphColor: "#FFFFFF" }
);
</script>
