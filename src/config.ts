// Public web-app URL of the Apps Script backend. NOT a secret.
export const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbzxrDtvVBdg0XuBD0hXCuaBpF3WUlWAmCt0WWbUMJNOilXV0ualQYT5AqNSrZ965Jzqww/exec";

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
