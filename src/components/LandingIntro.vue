<template>
  <!-- A gate, not a curtain: it waits for a person rather than a timer, so it is a dialog
       and it is keyboard-operable. Focus moves to Commencer on mount and Escape dismisses. -->
  <div
    ref="rootEl"
    class="landing"
    :class="{ out: dismissing }"
    role="dialog"
    aria-modal="true"
    aria-label="Bienvenue sur PIPC"
    data-test="landing"
  >
    <!-- Layer 1: an aurora wash. Not green — on a green ground green is invisible. -->
    <div class="aurora" aria-hidden="true">
      <div class="aurora-bleed"><b></b><b></b><b></b></div>
    </div>

    <!-- Layer 2: the formulae. A radial mask holds the centre column clear, which position
         alone could not guarantee once each glyph starts drifting. -->
    <div class="formulae" aria-hidden="true">
      <span
        v-for="(f, i) in FORMULAE"
        :key="f.text"
        class="formula"
        :class="{ 'formula-extra': i >= 6 }"
        :style="{
          left: `${f.x}%`,
          top: `${f.y}%`,
          '--drift': `${f.duration}s`,
          '--delay': `-${f.delay}s`,
          '--scale': f.scale,
        }"
      >{{ f.text }}</span>
    </div>

    <!-- The emblem, alone and centred. No atom behind it and no separate wordmark beside
         it: the badge is already a ringed circular mark that spells PIPC and the portal's
         name, so orbits added a second ring and the wordmark a second spelling. It is the
         one big thing on the screen, which is what a logo this detailed needs to be read.

         alt is empty and it is hidden from assistive tech on purpose — every word inside it
         is real text elsewhere here, and a screen reader should not say the identity twice. -->
    <!-- Everything scrollable lives in one child so it can be centred with `margin: auto`
         instead of `justify-content`. See the note on .sheet below — this is the difference
         between a tall screen scrolling and a tall screen losing its top. -->
    <div class="sheet">
      <div ref="markEl" class="emblem" data-test="landing-mark">
        <img
          :src="BRAND_BADGE"
          alt=""
          aria-hidden="true"
          class="badge"
          width="280"
          height="280"
          fetchpriority="high"
          decoding="async"
          data-test="landing-badge"
        />
      </div>

      <div class="stack">
      <!-- The screen's heading now that the wordmark is gone: the emblem is hidden from
           assistive tech, so without this the landing would have no heading at all. It keeps
           its caption styling — the rules still say "this labels what follows". -->
      <h1 class="tagline">
        <span>Portail Interactif de Physique-Chimie</span>
      </h1>

      <!-- Absent until the library answers. A cold backend can take ~50s, and the way in
           must never wait on it — the landing covering that wait is the point. -->
      <div v-if="stats" class="stats" data-test="landing-stats">
        <div v-for="s in stats" :key="s.label" class="stat">
          <v-icon :icon="s.icon" size="17" class="stat-icon" />
          <b>{{ counted[s.label] ?? 0 }}</b>
          <span>{{ s.label }}</span>
        </div>
      </div>

      <div class="credit-glass">
        <AuthorCredit tone="on-color" />
      </div>

      <button ref="startEl" type="button" class="start" data-test="landing-start" @click="dismiss">
        Commencer <span class="arrow" aria-hidden="true">→</span>
      </button>

      <p class="hint">
        ou appuyez sur <kbd>↵ Entrée</kbd>
      </p>

      <!-- Typed, and last: the proverb is the one aside here, so it arrives after the
           visitor already has their way in. -->
      <p class="proverb" :class="{ done: typingDone }" data-test="landing-proverb">
        <span>{{ typed }}</span><span v-if="!typingDone" class="caret" aria-hidden="true"></span>
        <cite v-if="quote.author">— {{ quote.author }}</cite>
        <cite v-else>Proverbe</cite>
      </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from "vue";
import AuthorCredit from "./AuthorCredit.vue";
import { useLibrary } from "../composables/useLibrary";
import { isClassified } from "../lib/classification";
import { distinctLevels, distinctChapters } from "../lib/filter";
import type { Quote } from "../lib/quotes";
import { BRAND_BADGE } from "../config";

const props = withDefaults(
  defineProps<{
    quote: Quote;
    /**
     * Whether the shell splash has finished and this screen is actually visible.
     *
     * The gate has to mount *under* the splash — the opening flight needs its emblem as a
     * landing point — so mount is the wrong moment to come alive. Until the splash clears,
     * the typing, the counts and the key handler would all be spent behind a curtain, and
     * an Escape struck in that window would dismiss a screen nobody has seen.
     *
     * Defaults to true: a visitor who has already played the splash this session has no
     * curtain in front of them.
     */
    ready?: boolean;
  }>(),
  { ready: true }
);
const emit = defineEmits<{ start: [HTMLElement | null] }>();

const FORMULAE = [
  { text: "∮E·dl = -dΦ/dt", x: 3, y: 10, duration: 30, delay: 0, scale: 1.05 },
  { text: "F = ma", x: 84, y: 14, duration: 26, delay: 3, scale: 1.3 },
  { text: "λ = c/ν", x: 5, y: 70, duration: 34, delay: 6, scale: 1.15 },
  { text: "E = mc²", x: 80, y: 78, duration: 28, delay: 2, scale: 1.4 },
  { text: "pH = -log[H₃O⁺]", x: 38, y: 3, duration: 22, delay: 8, scale: 0.85 },
  { text: "ΔG = ΔH - TΔS", x: 2, y: 40, duration: 24, delay: 5, scale: 0.95 },
  { text: "∑F⃗ = 0", x: 90, y: 44, duration: 30, delay: 1, scale: 1.2 },
  { text: "PV = nRT", x: 30, y: 92, duration: 26, delay: 7, scale: 1 },
  { text: "q = m·c·ΔT", x: 86, y: 62, duration: 32, delay: 4, scale: 0.8 },
  { text: "Δp·Δx ≥ ℏ/2", x: 4, y: 24, duration: 28, delay: 9, scale: 0.75 },
] as const;

const markEl = ref<HTMLElement | null>(null);
const startEl = ref<HTMLButtonElement | null>(null);

const { items, loading, ensureLoaded } = useLibrary();

/** The same published set BrowseView shows students: fully classified files only. */
const published = computed(() => items.value.filter((it) => isClassified(it.meta)));

const stats = computed(() => {
  if (loading.value || published.value.length === 0) return null;
  return [
    { label: "documents", icon: "mdi-file-document-outline", value: published.value.length },
    { label: "niveaux", icon: "mdi-school-outline", value: distinctLevels(published.value).length },
    { label: "chapitres", icon: "mdi-bookmark-outline", value: distinctChapters(published.value).length },
  ];
});

// Counting up rather than appearing: the numbers are the one place on this screen where a
// small animation says something true — the library has depth.
const counted = reactive<Record<string, number>>({});
let countFrame = 0;

function countUp(): void {
  const targets = stats.value;
  if (!targets) return;
  // A refetch can take stats from a value back to null and round again, and this is called
  // from two places. Without this, the second run leaves the first loop writing to the same
  // object and the numbers fight each other on the way up.
  cancelAnimationFrame(countFrame);
  if (reducedMotion()) {
    for (const t of targets) counted[t.label] = t.value;
    return;
  }
  const DURATION = 1100;
  // Elapsed comes from the frame timestamp rather than a separate clock: one source of time
  // means the count cannot drift from the frames actually being painted.
  let start = 0;
  const tick = (now: number): void => {
    if (!start) start = now;
    const p = Math.min(1, (now - start) / DURATION);
    const eased = 1 - Math.pow(1 - p, 3);
    for (const t of targets) counted[t.label] = Math.round(t.value * eased);
    if (p < 1) countFrame = requestAnimationFrame(tick);
  };
  countFrame = requestAnimationFrame(tick);
}

const typed = ref("");
const typingDone = ref(false);
let typeTimer = 0;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function typeProverb(): void {
  const full = `« ${props.quote.text} »`;
  if (reducedMotion()) {
    typed.value = full;
    typingDone.value = true;
    return;
  }
  let i = 0;
  const step = (): void => {
    typed.value = full.slice(0, ++i);
    if (i < full.length) typeTimer = window.setTimeout(step, 32);
    else typingDone.value = true;
  };
  typeTimer = window.setTimeout(step, 1200);
}

// Guarded because both the click and the Enter/Escape key can arrive, and a second flight
// would put a second mark on screen.
const dismissing = ref(false);
function dismiss(): void {
  if (dismissing.value) return;
  dismissing.value = true;
  emit("start", markEl.value);
}

const rootEl = ref<HTMLElement | null>(null);

/**
 * Keep Tab inside the gate.
 *
 * `aria-modal` only tells a screen reader to ignore the background; the keyboard still
 * walks into the header links and the theme toggle sitting under this opaque sheet, where
 * the focus ring is invisible. Written as a general wrap rather than "focus the button"
 * because the gate has one focusable element today and that is not a law.
 */
function containFocus(e: KeyboardEvent): void {
  const focusable = rootEl.value?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable?.length) return;
  e.preventDefault();
  const list = Array.from(focusable);
  const at = list.indexOf(document.activeElement as HTMLElement);
  // -1 (focus escaped, or has not landed yet) enters at the top for Tab and at the bottom
  // for Shift+Tab, which is what the visitor means by "keep going in that direction".
  const next = e.shiftKey
    ? (at <= 0 ? list.length : at) - 1
    : (at + 1) % list.length;
  list[next]?.focus();
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") dismiss();
  else if (e.key === "Tab") containFocus(e);
  // Enter is left to the focused button, or the click and the key would both fire.
  else if (e.key === "Enter" && document.activeElement !== startEl.value) dismiss();
}

/** What body overflow was before the gate took it, so unmount hands back the same value. */
let bodyOverflow = "";

/** Everything that assumes the visitor can actually see this screen. */
function begin(): void {
  startEl.value?.focus();
  typeProverb();
  countUp();
  window.addEventListener("keydown", onKey);
}

onMounted(() => {
  // Starts the library loading behind the landing, so the wait happens while there is
  // something to look at. Unlike the rest, this does not wait on the splash — the whole
  // point is to spend that time fetching.
  ensureLoaded();

  // Restore rather than blank: something else may own body overflow, and this gate should
  // hand back exactly what it took.
  bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  if (props.ready) begin();
});

watch(
  () => props.ready,
  (ready) => {
    if (ready) begin();
  }
);

onBeforeUnmount(() => {
  window.clearTimeout(typeTimer);
  cancelAnimationFrame(countFrame);
  window.removeEventListener("keydown", onKey);
  document.body.style.overflow = bodyOverflow;
});

// The counts can arrive long after mount, on a cold backend.
watch(stats, (val, old) => {
  if (val && !old) countUp();
});
</script>

<style scoped>
.landing {
  position: fixed;
  inset: 0;
  z-index: 3000;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  /* NOT justify-content: center. When the content is taller than the screen, centring in a
     scroll container pushes the overflow past the *start* edge, where it cannot be scrolled
     back to — on a phone that ate the top of the emblem. `margin: auto` on the child centres
     it when there is room and simply starts at the top when there is not. */
  justify-content: flex-start;
  align-items: center;
  padding: 40px 30px;
  text-align: center;

  background: var(--landing-bg);
  color: var(--landing-fg);
  transition: background-color 620ms cubic-bezier(0.2, 0.8, 0.2, 1);

  /* Stated rather than inherited: this sheet is fixed-position brand ground and should not
     depend on what the app behind it happens to set. styles/typography.css handles the rest
     of the app. */
  font-family: "Inter", system-ui, -apple-system, sans-serif;

  /* Light mode rides on the brand green itself. */
  --landing-bg: rgb(var(--v-theme-primary));
  --landing-fg: rgb(var(--v-theme-on-primary));
  --sheen-cool: rgb(var(--v-theme-landing-sheen-cool));
  --sheen-warm: rgb(var(--v-theme-landing-sheen-warm));

  /* Frosted panels are a DARK wash, not the usual white one: a white wash lightens the
     green and closes the gap to the text on it (4.21:1 at 12%, worse as it thickens).
     Deepening the ground gives 6.51:1. Measured in theme.test.ts. */
  --glass: rgba(11, 46, 29, 0.2);
  --glass-line: rgba(255, 255, 255, 0.3);
}

/* The exit fades the ground and every layer EXCEPT the emblem, because the emblem is the
   thing flying to the header — it is a child of this element, so fading the element would
   fade the mark mid-flight. The sheet dissolves around a mark that stays solid. */
.landing.out {
  background-color: transparent;
  pointer-events: none;
}

.landing.out .aurora,
.landing.out .formulae,
.landing.out .stack {
  opacity: 0;
  transition: opacity 300ms ease;
}

/* Dark mode cannot use `primary` — there it is a bright mint, and a full screen of it at
   night is a lamp. See LANDING_GROUND in theme.ts. */
:global(.v-theme--dark) .landing {
  --landing-bg: rgb(var(--v-theme-primary-container));
  --landing-fg: rgb(var(--v-theme-on-primary-container));
  --glass: rgba(4, 23, 14, 0.2);
  --glass-line: rgba(191, 235, 211, 0.22);
}

.sheet {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  width: 100%;
}

/* ---- layer 1: aurora ---- */
/* Two elements, because the bleed and the clip have to be different boxes. The blobs need
   to sit outside the sheet so their blur has somewhere to come from, but `.landing` is a
   scroll container and an absolutely positioned descendant hanging below its padding box
   counts toward scrollable overflow — the old single `inset: -20%` layer bought a scrollbar
   and 20vh of empty ground under a sheet that otherwise fit exactly. */
.aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

/* The bleed, now clipped by the parent instead of by nothing. Geometry is unchanged from
   when this lived on .aurora, so the blob positions below still mean what they meant. */
.aurora-bleed {
  position: absolute;
  inset: -20%;
  filter: blur(76px);
  opacity: 0.42;
}

.aurora b {
  position: absolute;
  display: block;
  border-radius: 50%;
}

.aurora b:nth-child(1) {
  width: 48%;
  height: 48%;
  left: 6%;
  top: 4%;
  background: radial-gradient(circle, rgb(var(--v-theme-secondary)), transparent 68%);
  animation: aurora-1 19s ease-in-out infinite alternate;
}

.aurora b:nth-child(2) {
  width: 54%;
  height: 54%;
  right: 2%;
  top: 20%;
  background: radial-gradient(circle, rgb(var(--v-theme-primary-container)), transparent 66%);
  animation: aurora-2 23s ease-in-out infinite alternate;
}

.aurora b:nth-child(3) {
  width: 42%;
  height: 42%;
  left: 28%;
  bottom: 0;
  background: radial-gradient(circle, rgb(var(--v-theme-tertiary)), transparent 72%);
  animation: aurora-3 27s ease-in-out infinite alternate;
}

@keyframes aurora-1 { to { transform: translate(14%, 10%) scale(1.18); } }
@keyframes aurora-2 { to { transform: translate(-12%, 8%) scale(1.12); } }
@keyframes aurora-3 { to { transform: translate(8%, -12%) scale(1.22); } }

/* ---- layer 2: formulae ---- */
.formulae {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(
    ellipse 44% 54% at 50% 50%,
    transparent 42%,
    rgba(0, 0, 0, 0.55) 68%,
    #000 88%
  );
  mask-image: radial-gradient(
    ellipse 44% 54% at 50% 50%,
    transparent 42%,
    rgba(0, 0, 0, 0.55) 68%,
    #000 88%
  );
}

.formula {
  position: absolute;
  font-style: italic;
  font-size: calc(20px * var(--scale));
  white-space: nowrap;
  color: var(--landing-fg);
  opacity: 0.16;
  filter: blur(0.5px);
  animation: formula-drift var(--drift) var(--delay) ease-in-out infinite alternate;
}

.formula:nth-child(even) {
  opacity: 0.11;
  filter: blur(1.8px);
}

@keyframes formula-drift {
  from { transform: translate(0, 0) rotate(-1.5deg); }
  to { transform: translate(24px, -28px) rotate(1.5deg); }
}

/* ---- the emblem ---- */
.emblem {
  position: relative;
  z-index: 3;
  width: 280px;
  height: 280px;
  flex: none;
  /* The drop shadow is on the element, not a box-shadow: the badge is a circle inside a
     transparent square, and a box-shadow would trace the square. */
  filter: drop-shadow(0 18px 38px rgba(0, 0, 0, 0.32));
}

/* The breathe loop rides the image, NOT .emblem. .emblem is the node the Commencer flight
   transforms, and an animation on it would outrank that inline transform outright — the
   mark would sit there pulsing instead of flying. Parent flies, child breathes. */
.badge {
  width: 100%;
  height: 100%;
  display: block;
  animation: emblem-breathe 5.2s ease-in-out infinite;
}

@keyframes emblem-breathe {
  50% { transform: scale(1.03); }
}

/* ---- content ---- */
.stack {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 680px;
}

.tagline {
  display: flex;
  font-family: inherit;
  align-items: center;
  gap: 16px;
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-weight: 600;
}

.tagline span {
  background: linear-gradient(100deg, var(--landing-fg), var(--sheen-cool) 70%, var(--sheen-warm));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.tagline::before,
.tagline::after {
  content: "";
  flex: 1 1 40px;
  height: 1px;
  max-width: 74px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--landing-fg) 42%, transparent));
}

.tagline::after {
  background: linear-gradient(270deg, transparent, color-mix(in srgb, var(--landing-fg) 42%, transparent));
}

.stats {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 132px;
  padding: 14px 22px;
  border-radius: 18px;
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-line);
}

.stat-icon {
  opacity: 0.62;
}

.stat b {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}

.stat span {
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.76;
}

.credit-glass {
  padding: 16px 28px 16px 16px;
  border-radius: 999px;
  background: var(--glass);
  backdrop-filter: blur(14px);
  border: 1px solid var(--glass-line);
}

.start {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-weight: 800;
  font-size: 21px;
  letter-spacing: -0.2px;
  padding: 22px 58px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  background: linear-gradient(135deg, var(--landing-fg) 0%, var(--sheen-cool) 52%, var(--sheen-warm) 100%);
  background-size: 180% 100%;
  color: rgb(var(--v-theme-primary));
  display: inline-flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 0 0 10px color-mix(in srgb, var(--landing-fg) 10%, transparent),
    0 18px 44px rgba(0, 0, 0, 0.28);
  transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 260ms,
    background-position 500ms ease;
  position: relative;
  overflow: hidden;
}

/* The button's face is a light gradient in both themes, so its label must be dark in both.
   It was `on-primary-container` here — #BFEBD3, which is *exactly* the gradient's first
   stop: 1.00:1, an invisible label. `on-primary` is the token that means "ink on brand
   green" and measures 6.74:1 at the gradient's worst point. */
:global(.v-theme--dark) .landing .start {
  color: rgb(var(--v-theme-on-primary));
}

.start:hover {
  transform: translateY(-3px);
  background-position: 100% 50%;
  box-shadow: 0 0 0 16px color-mix(in srgb, var(--landing-fg) 13%, transparent),
    0 24px 56px rgba(0, 0, 0, 0.34);
}

.start:focus-visible {
  outline: 3px solid var(--landing-fg);
  outline-offset: 5px;
}

.start .arrow {
  transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.start:hover .arrow {
  transform: translateX(5px);
}

.hint {
  font-size: 12.5px;
  opacity: 0.78;
  margin: -6px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

kbd {
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  padding: 5px 9px;
  border-radius: 7px;
  background: var(--glass);
  border: 1px solid var(--glass-line);
  box-shadow: 0 2px 0 var(--glass-line);
}

.proverb {
  margin: 4px 0 0;
  padding-top: 20px;
  max-width: 34em;
  border-top: 1px solid color-mix(in srgb, var(--landing-fg) 22%, transparent);
  font-size: 15.5px;
  font-style: italic;
  line-height: 1.65;
  opacity: 0.9;
  min-height: 3.4em;
}

.caret {
  display: inline-block;
  width: 2px;
  height: 1.05em;
  margin-left: 2px;
  background: var(--landing-fg);
  vertical-align: -0.16em;
  animation: caret-blink 1.05s step-end infinite;
}

@keyframes caret-blink {
  50% { opacity: 0; }
}

.proverb cite {
  display: block;
  font-style: normal;
  font-weight: 600;
  font-size: 12.5px;
  margin-top: 8px;
  letter-spacing: 0.04em;
  opacity: 0;
}

/* An explicit `to`. A keyframe with only a `from` ends at the element's own value — which
   here is opacity 0, so the attribution would fade from invisible to invisible. */
.proverb.done cite {
  animation: cite-in 500ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes cite-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 0.82; transform: translateY(0); }
}

@media (max-width: 960px) {
  .landing { padding: 28px 16px; }
  .sheet { gap: 18px; }
  .emblem { width: 200px; height: 200px; }
  .tagline { font-size: 9.5px; letter-spacing: 0.18em; gap: 10px; }
  .tagline::before, .tagline::after { max-width: 30px; }
  /* Three across, always. They were a hair too wide for a 375px screen and wrapped 2 + 1,
     which reads as a mistake; letting them share the row equally is what keeps them a set. */
  .stats { gap: 8px; width: 100%; flex-wrap: nowrap; }
  .stat { min-width: 0; flex: 1 1 0; padding: 11px 6px; }
  .stat b { font-size: 24px; }
  .stat span { font-size: 9px; letter-spacing: 0.06em; }
  .start { font-size: 18px; padding: 18px 42px; }
  .proverb { font-size: 14px; min-height: 4.6em; padding-top: 16px; }
  .formula-extra { display: none; }
}
</style>
