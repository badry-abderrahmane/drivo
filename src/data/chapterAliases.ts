// How students actually type chapter names: Arabic labels, transliterations and the
// shorthand used in class. Indexed as a virtual search key so a query never has to match
// the official French wording. Extending this map is content editing, not code — add a
// key copied verbatim from `chapters.ts` and list the ways students say it.

/**
 * Chapters the programme has dropped or renamed, whose aliases stay anyway.
 *
 * Aliases are looked up against a document's own `meta.chapter`, not against the
 * programme, so a file in Drive still tagged with an old name stays findable long after
 * chapters.ts stops listing it. Take a name off this list only once nothing is tagged with
 * it any more — and expect its aliases to come off with it.
 */
export const RETIRED_CHAPTERS: string[] = [
  // Merged into "Ondes électromagnétiques - Modulation et démodulation d'amplitude".
  "Ondes électromagnétiques",
  "Modulation d'amplitude",
  // Off the programme entirely.
  "Dosage acido-basique",
];

export const CHAPTER_ALIASES: Record<string, string[]> = {
  "Ondes mécaniques progressives": ["الموجات الميكانيكية", "ondes", "mawjat", "onde progressive"],
  "Ondes mécaniques progressives périodiques": ["الموجات الدورية", "ondes periodiques"],
  "Propagation des ondes lumineuses": ["الضوء", "diffraction", "lumiere"],
  "Décroissance radioactive": ["التناقص الإشعاعي", "radioactivite", "radioactif"],
  "Noyaux, masse et énergie": ["النواة", "energie nucleaire", "noyau"],
  "Dipôle RC": ["ثنائي القطب RC", "condensateur", "rc"],
  "Dipôle RL": ["ثنائي القطب RL", "bobine", "rl"],
  "Oscillations libres d'un circuit RLC en série": ["الدارة RLC", "rlc", "oscillations libres"],
  "Circuit RLC série en régime sinusoïdal forcé": ["rlc force", "regime force", "resonance"],
  // The merged chapter carries the union of what the two used to answer to, so a student
  // searching either half still lands on it.
  "Ondes électromagnétiques - Modulation et démodulation d'amplitude": [
    "الأمواج الكهرمغنطيسية", "electromagnetique", "التضمين", "modulation", "am",
    "demodulation", "الكشف",
  ],
  // Retired, kept for files still tagged with them. See RETIRED_CHAPTERS above.
  "Ondes électromagnétiques": ["الأمواج الكهرمغنطيسية", "electromagnetique"],
  "Modulation d'amplitude": ["التضمين", "modulation", "am"],
  "Lois de Newton": ["قوانين نيوتن", "newton", "lois newton"],
  "Chute verticale d'un corps solide": ["السقوط الرأسي", "chute libre", "chute verticale"],
  "Mouvements plans : projectile dans le champ de pesanteur": ["projectile", "champ pesanteur", "mouvement plan"],
  "Mouvement des satellites et des planètes": ["الأقمار الاصطناعية", "satellites", "kepler", "planetes"],
  "Mouvement de rotation d'un solide autour d'un axe fixe": ["دوران جسم صلب", "rotation solide"],
  "Oscillateurs mécaniques": ["المتذبذب الميكانيكي", "pendule", "oscillateur"],
  "Transformations lentes et transformations rapides": ["التحولات السريعة والبطيئة", "transformations lentes"],
  "Suivi temporel d'une transformation chimique - Vitesse de réaction": ["سرعة التفاعل", "vitesse reaction", "suivi temporel"],
  // Retired, kept for files still tagged with it. See RETIRED_CHAPTERS above.
  "Dosage acido-basique": ["المعايرة", "dosage", "titrage", "acide base"],
  "Transformations spontanées dans les piles et production d'énergie": ["الأعمدة", "piles", "pile"],
  "Transformations forcées (électrolyse)": ["التحليل الكهربائي", "electrolyse"],
  "Réactions d'estérification et d'hydrolyse": ["الأسترة", "esterification", "hydrolyse", "ester"],
};

/** Every alias for the given chapters, flattened. Unknown chapters contribute nothing. */
export function aliasesFor(chapters: string[]): string[] {
  return chapters.flatMap((c) => CHAPTER_ALIASES[c] ?? []);
}
