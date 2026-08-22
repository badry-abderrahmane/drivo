/**
 * The PIPC palette, kept as plain data rather than inline in the Vuetify call so it can be
 * imported and measured without dragging in vuetify/styles and the icon font. theme.test.ts
 * checks every pair in here for contrast — see contrast.ts for why that is not optional.
 *
 * Green & Marine since 2026-08-19, replacing Orange & Marine. Green carries the brand and
 * marks what is actionable; marine carries structure and authorship.
 *
 * Light is a tinted near-white. Dark is a warm charcoal on a different principle entirely
 * — see DARK_COLORS. The two modes are not tonal inversions of each other and should not
 * be made into one.
 */
export type ThemeColors = Record<string, string>;

export const LIGHT_COLORS: ThemeColors = {
  // #1E7A4D, not the #16A34A of the logo tile: white text on the brand green
  // needs 4.5:1 and #16A34A gives 3.30:1. The tile is a graphical object and
  // only needs 3:1, so the mark keeps the brighter value.
  primary: "#1E7A4D",
  "on-primary": "#FFFFFF",
  "primary-container": "#DDF0E5",
  "on-primary-container": "#0B4A2C",
  secondary: "#14528C",
  "on-secondary": "#FFFFFF",
  "secondary-container": "#E7EFF7",
  "on-secondary-container": "#0E3A66",
  // The one warm note left in the palette, and deliberately kept: green, marine
  // and ochre make a coherent triad, and it rhymes with the Exercices badge below.
  tertiary: "#8A6A3F",
  "on-tertiary": "#FFFFFF",
  "tertiary-container": "#F3E7D6",
  "on-tertiary-container": "#3D2A12",
  background: "#F6FBF7",
  "on-background": "#101A14",
  surface: "#FFFFFF",
  "on-surface": "#101A14",
  "surface-variant": "#EDF4EF",
  "on-surface-variant": "#566159",
  outline: "#849489",
  "outline-variant": "#DCE7E0",
  "surface-tint": "#1E7A4D",
  error: "#BA1A1A",
  "on-error": "#FFFFFF",
  "error-container": "#FFDAD6",
  "on-error-container": "#410002",
  warning: "#B45309",
  // Stays green even though the brand is now green: a success state that isn't
  // green costs more in recognition than it gains in separation. It is a darker
  // forest than the brand, and it only ever appears in alerts, never on a control.
  success: "#166534",
  // One hue per document type (src/lib/docType.ts), used with variant="tonal".
  // None of them is the brand green — green means "you can act on this", and a
  // type badge is a label. Exercices is ochre rather than the green it used to be,
  // for exactly that reason. Burgundy for the exam deliberately avoids the error
  // red above, so a failed load never reads as an exam badge.
  "type-cours": "#14528C",
  "type-exercices": "#8A5A11",
  "type-devoir": "#5B21B6",
  "type-examen": "#9A2540",
  "type-video": "#0E6E7A",
  "type-autre": "#5B6560",

  // One colour per file format, for the document-card tile. In the theme rather than in
  // lib/fileKind.ts, where they were hardcoded: a value tuned against white is not a value
  // that survives on a dark ground. Light keeps the Material 500 set it always had.
  "file-pdf": "#E53935",
  "file-word": "#1E88E5",
  "file-excel": "#43A047",
  "file-ppt": "#FB8C00",
  "file-video": "#8E24AA",
  "file-audio": "#00897B",
  "file-image": "#00ACC1",
  "file-archive": "#6D4C41",
  "file-text": "#607D8B",
  "file-generic": "#757575",

  // The landing screen rides on the brand green, and its wordmark, button and glass edges
  // are a gradient across these two. Neither is decorative: text and a button label sit on
  // them, so they are tokens the contrast guard measures rather than hexes in a component.
  // The obvious picks failed — primary-container measures 4.48:1 on primary and
  // tertiary-container 4.36:1, both under AA. These clear 4.72:1.
  "landing-sheen-cool": "#EDF6FA",
  "landing-sheen-warm": "#FAF0E2",
};

export const DARK_COLORS: ThemeColors = {
  // A warm-neutral charcoal, in the Notion/Obsidian register: soft rather than black, and
  // built for reading a chapter end to end without glare. Three earlier attempts at this
  // theme all went the other way — #0E1712, then #0A0F0E, then a generated M3 scheme at
  // #0B0F0B — and all three were rejected. They were gloomy where this needs to be calm.
  //
  // The neutrals are a hair warm (R >= G >= B) rather than dead grey; that is the whole
  // difference between restful and clinical, and it costs nothing.
  //
  // DEPTH COMES FROM THE HAIRLINE, NOT FROM LUMINANCE. A card sits only 1.066:1 above the
  // page, which would be flat on its own — the 1.383:1 `outline-variant` border around it
  // is what makes it an object. Components must draw that border at full token strength;
  // the old `rgba(var(--v-border-color), 0.1)` is far too faint to carry it, and a card
  // that loses its edge here loses its shape entirely.
  //
  // GREEN MEANS ACTION, AND NOTHING ELSE. Buttons, links, the active nav pill, the card's
  // open arrow, focus rings. Not headings, not counts, not chips, not icon tiles. The
  // first complaint about this theme was that everything was green with nothing to rest
  // against; restraint here is the fix, not a different green.
  primary: "#4ADE80",
  "on-primary": "#052E16",
  "primary-container": "#14532D",
  "on-primary-container": "#BBF7D0",
  secondary: "#7FB6E8",
  "on-secondary": "#0E2A47",
  "secondary-container": "#14395E",
  "on-secondary-container": "#D5E6F5",
  tertiary: "#D9BE96",
  "on-tertiary": "#3D2A12",
  "tertiary-container": "#574127",
  "on-tertiary-container": "#F3E7D6",
  background: "#191919",
  "on-background": "#E9E9E7",
  surface: "#1F1F1E",
  "on-surface": "#E9E9E7",
  "surface-variant": "#2A2A28",
  "on-surface-variant": "#9B9B99",
  outline: "#6F6F6C",
  "outline-variant": "#373735",
  "surface-tint": "#4ADE80",
  error: "#FFB4AB",
  "on-error": "#690005",
  "error-container": "#93000A",
  "on-error-container": "#FFDAD6",
  warning: "#FBBF24",
  // Emerald rather than the brand green: `primary` is now #4ADE80, and a success alert in
  // that same colour would read as an ordinary control.
  success: "#34D399",
  // These stay colourful precisely BECAUSE everything around them went quiet. With the
  // chrome neutral, the badge is the one thing you scan a page of results by, so the
  // document type is the job colour is spent on here. Retuned for the charcoal ground.
  "type-cours": "#A8CBEA",
  "type-exercices": "#DFB876",
  "type-devoir": "#C6B9F5",
  "type-examen": "#F0A0B2",
  "type-video": "#87D6DE",
  "type-autre": "#B3B3AF",

  // One colour per file format, for the tile on every document card. These used to be
  // hardcoded Material 500 hexes in lib/fileKind.ts — the one part of the app the palette
  // never reached. Tuned against white, they put the worst glyph (archive) at 2.09:1 on a
  // dark ground, so the tile read as a muddy smear with an unreadable mark in it. These
  // are the 200/300-level equivalents and clear 6.19:1 at worst.
  "file-pdf": "#F28B82",
  "file-word": "#8AB4F8",
  "file-excel": "#81C995",
  "file-ppt": "#FCAD70",
  "file-video": "#D7AEFB",
  "file-audio": "#78D9CE",
  "file-image": "#7FD1E8",
  "file-archive": "#BCAAA4",
  "file-text": "#B0BEC5",
  "file-generic": "#BDBDBD",

  // The landing paints primary-container full-bleed and puts these on it: 7.4 and 8.4:1 on
  // that ground, and light enough for the button's dark label to clear 12:1 across the
  // whole gradient.
  "landing-sheen-cool": "#D8F3FF",
  "landing-sheen-warm": "#F0EAD6",
};

export const THEME_COLORS = { light: LIGHT_COLORS, dark: DARK_COLORS } as const;

/**
 * The token the landing screen paints itself with, per theme. Light mode takes the brand
 * green itself; dark mode cannot — `primary` there is a bright mint, and a full-bleed sheet
 * of it at night is a lamp — so it takes the deep `primary-container` instead. Exported so
 * theme.test.ts can measure what the landing actually puts on each ground.
 */
export const LANDING_GROUND = { light: "primary", dark: "primary-container" } as const;
