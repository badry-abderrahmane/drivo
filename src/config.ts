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
