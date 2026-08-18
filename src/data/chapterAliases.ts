// How students actually type chapter names: Arabic labels, transliterations and the
// shorthand used in class. Indexed as a virtual search key so a query never has to match
// the official French wording. Extending this map is content editing, not code — add a
// key copied verbatim from `chapters.ts` and list the ways students say it.

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
  "Dosage acido-basique": ["المعايرة", "dosage", "titrage", "acide base"],
  "Transformations spontanées dans les piles et production d'énergie": ["الأعمدة", "piles", "pile"],
  "Transformations forcées (électrolyse)": ["التحليل الكهربائي", "electrolyse"],
  "Réactions d'estérification et d'hydrolyse": ["الأسترة", "esterification", "hydrolyse", "ester"],
};

/** Every alias for the given chapters, flattened. Unknown chapters contribute nothing. */
export function aliasesFor(chapters: string[]): string[] {
  return chapters.flatMap((c) => CHAPTER_ALIASES[c] ?? []);
}
