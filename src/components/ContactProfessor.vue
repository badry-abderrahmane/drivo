<template>
  <!-- A full-bleed band between the content and the footer, on a neutral ground.
       Deliberately NOT the landing's brand green: the landing is a once-per-session
       takeover and can afford to shout, but this sits under every page, and a full-bleed
       green slab there out-weighed the content it was appended to. Green survives in one
       place only — the button — which is the rule the palette already states: green means
       "you can act on this". -->
  <section
    class="contact"
    aria-labelledby="contact-heading"
    data-test="contact-professor"
  >
    <div class="inner">
      <div class="portrait">
        <!-- Initials underneath rather than in an error handler: if the photo is slow or
             blocked, something recognisable is already in place. Mirrors AuthorCredit. -->
        <span class="initials" aria-hidden="true">{{ initials }}</span>
        <img
          :src="AUTHOR_PHOTO"
          :alt="`M. ${AUTHOR_NAME}`"
          class="portrait-img"
          width="96"
          height="96"
          loading="lazy"
          decoding="async"
          data-test="contact-photo"
        />
      </div>

      <div class="say">
        <h2 id="contact-heading" class="heading font-heading">Une question ? Écrivez-moi.</h2>
        <p class="blurb">
          Pour une question sur un cours, pour signaler un problème sur le site, ou
          simplement pour dire bonjour.
        </p>
      </div>

      <div class="act">
        <v-btn
          :href="mailto"
          color="primary"
          variant="flat"
          size="large"
          class="write rounded-pill font-weight-semibold text-none px-6"
          prepend-icon="mdi-email-outline"
          data-test="contact-mailto"
        >
          Écrire au professeur
        </v-btn>
        <!-- The address in plain text as well as behind the button: a phone without a mail
             client configured gets nothing from a mailto, and can still copy this. -->
        <span class="address text-caption">{{ AUTHOR_EMAIL }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { AUTHOR_NAME, AUTHOR_EMAIL, AUTHOR_PHOTO } from "../config";

// Derived rather than typed out, so the initials cannot drift from the name.
const initials = computed(() =>
  AUTHOR_NAME.split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
);

/** A subject line so the site's mail arrives already sorted from the rest of his inbox. */
const mailto = computed(
  () => `mailto:${AUTHOR_EMAIL}?subject=${encodeURIComponent("Message depuis PIPC")}`
);
</script>

<style scoped>
.contact {
  position: relative;
  /* The gap the footer used to carry as `mt-12`. It lives here now so the band and the
     footer stack flush and close the page together — see the note in App.vue. */
  margin-top: 48px;
  padding: 40px 24px;

  /* The solid token, not a translucent wash of it. `on-surface-variant` below is measured
     against exactly this value in theme.test.ts; laying it over `background` at partial
     alpha would compose a third colour that nothing has measured. The palette notes are
     explicit that a tonal wash must be read against its own panel — this sidesteps that
     by not being a wash. */
  background: rgb(var(--v-theme-surface-variant));

  /* `outline`, not the `outline-variant` the footer uses. That token is tuned to sit on
     `surface`; against this closer ground it measures 1.14:1 and the edge disappears, and
     the ground itself is only 1.07:1 above the page in light mode — so the rule is the
     only thing saying where the band begins. `outline` is the token already guarded at the
     3:1 a border needs (theme.test.ts), and measures 3.05:1 light / 3.49:1 dark against
     the page above. The footer's own `border-t` closes the band at the bottom. */
  border-top: 1px solid rgb(var(--v-theme-outline));
}

.inner {
  max-width: 1100px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  gap: 28px;
}

.portrait {
  position: relative;
  flex: none;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  /* The same marine ring AuthorCredit gives him. Marine carries authorship; it is the one
     other place the palette lets colour in, and it keeps the photo's own light background
     from bleeding into the band. */
  box-shadow: 0 0 0 2px rgb(var(--v-theme-secondary));
}

.initials,
.portrait-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
  font-family: "Plus Jakarta Sans", sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: 0.02em;
}

.portrait-img {
  object-fit: cover;
}

.say {
  flex: 1 1 auto;
  min-width: 0;
}

.heading {
  margin: 0 0 6px;
  font-size: clamp(1.125rem, 1rem + 0.55vw, 1.375rem);
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.25;
  color: rgb(var(--v-theme-on-surface));
}

.blurb {
  margin: 0;
  /* Under 80 characters at every width the band is used at. */
  max-width: 56ch;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: rgb(var(--v-theme-on-surface-variant));
}

.act {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* The same lift the footer's other buttons use, so the band's one control behaves like the
   rest of the app rather than like a landing-page call to action. */
.write {
  transition: transform 0.2s ease;
}

.write:hover {
  transform: translateY(-2px);
}

.address {
  color: rgb(var(--v-theme-on-surface-variant));
  /* Selectable on purpose: a phone with no mail client set up still gets the address. */
  user-select: all;
}

/* ---- phone ---- */
@media (max-width: 720px) {
  .contact {
    padding: 32px 20px;
  }

  .inner {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .blurb {
    margin-inline: auto;
  }

  .portrait {
    width: 80px;
    height: 80px;
  }

  .initials {
    font-size: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .write {
    transition: none;
  }

  .write:hover {
    transform: none;
  }
}
</style>
