// Public web-app URL of the Apps Script backend. NOT a secret.
export const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbzxrDtvVBdg0XuBD0hXCuaBpF3WUlWAmCt0WWbUMJNOilXV0ualQYT5AqNSrZ965Jzqww/exec";

/** Canonical origin + base path of the deployed site. Trailing slash required. */
export const SITE_URL = "https://pipc.ma/";

export const LEVELS = [
  "Tronc Commun",
  "1ère Bac Sc. Exp",
  "1ère Bac SM",
  "2ème Bac SM",
  "2ème Bac PC",
  "2ème Bac SVT",
];
export const EXAMEN_NATIONAL_TYPE = "Examen National";
export const TYPES = ["Cours", "Exercices", "Devoir surveillé", EXAMEN_NATIONAL_TYPE, "Vidéo"];
export const SUBJECTS = ["Physique", "Chimie", "Physique & Chimie"];

/** The 3 final-year levels the national exam ("Examen National") applies to. */
export const EXAMEN_NATIONAL_LEVELS = LEVELS.filter((l) => l.startsWith("2ème Bac"));

/** The teacher who gathered and edited every document in the library. */
export const AUTHOR_NAME = "Hassan Badry";

/** His title, shown under his name wherever the library is credited. */
export const AUTHOR_ROLE = "Professeur de Physique-Chimie";

/** His portrait. Served from public/, so it is a site-absolute path, not a bundled import. */
export const AUTHOR_PHOTO = "/hassan-badry.jpg";

/**
 * The full emblem: π on amber, ringed by "PIPC" above and the portal's name below. Used
 * for the landing and the app bar. Its arched lettering does not survive 42px, so in the
 * header it reads as a mark rather than as words — the "PIPC" wordmark beside it carries
 * the name.
 *
 * The emblem no longer carries M. Hassan Badry's name in its upper ring; the app credits
 * him in the footer and on the landing instead (see AuthorCredit), which is the only place
 * that credit is now made.
 *
 * The favicon and the pre-bundle splash are untouched: both are static (public/favicon.*
 * and the inline SVG in index.html) and still draw the π tile.
 */
export const BRAND_BADGE = "/pipc-badge.png";

/**
 * The link-preview card, and the only brand asset built for a 1.91:1 frame. WhatsApp,
 * Facebook, LinkedIn and Slack all read `og:image`; none of them will crop a square emblem
 * into a decent wide card, so this is a purpose-made 1200x630 composition of the gradient,
 * the emblem and the wordmark rather than a resize of BRAND_BADGE.
 *
 * Regenerated with ImageMagick from public/pipc-badge.png plus Plus Jakarta Sans — see
 * OG_CARD_SIZE below for the dimensions injectPage() declares.
 */
export const BRAND_OG_CARD = "/og-card.png";

/** Declared in og:image:width / og:image:height, so a crawler can lay the card out
 *  before it has finished downloading it. Must match the real file. */
export const OG_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Where students write to him. Spelled `badri`, deliberately: the address predates the
 * site and does not match the `y` in AUTHOR_NAME. Confirmed with him — do not "fix" it.
 */
export const AUTHOR_EMAIL = "hassanbadri@gmail.com";
