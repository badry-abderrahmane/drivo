// Official Moroccan physique-chimie chapters per level, split by matière.
// Sourced from the national program and cross-checked against multiple education
// sources (AlloSchool, 9rayti, saborpcmath). These are *suggestions* for the admin
// chapter picker — the field is a combobox, so any value not listed can still be typed.

export interface LevelChapters {
  Physique: string[];
  Chimie: string[];
}

export const CHAPTERS_BY_LEVEL: Record<string, LevelChapters> = {
  "Tronc Commun": {
    Physique: [
      "La gravitation universelle",
      "Exemples d'actions mécaniques",
      "Le mouvement",
      "Le principe d'inertie",
      "Équilibre d'un corps solide sous l'action de deux forces",
      "Équilibre d'un corps solide sous l'action de trois forces",
      "Équilibre d'un solide en rotation autour d'un axe fixe",
      "Le courant électrique continu",
      "La tension électrique",
      "Association des conducteurs ohmiques",
      "Caractéristiques de quelques dipôles passifs",
      "Caractéristique d'un dipôle actif",
      // "Le transistor",
      // "L'amplificateur opérationnel",
    ],
    Chimie: [
      "Les espèces chimiques",
      "Extraction, séparation et identification des espèces chimiques",
      "Synthèse des espèces chimiques",
      "Le modèle de l'atome",
      "La géométrie de quelques molécules",
      "Classification périodique des éléments chimiques",
      "La mole, unité de quantité de matière",
      "La concentration molaire",
      "Modélisation des transformations chimiques - Bilan de matière",
    ],
  },
  "1ère Bac Sc. Exp": {
    Physique: [
      "Rotation d'un solide indéformable autour d'un axe fixe",
      "Travail et puissance d'une force",
      "Travail et énergie cinétique",
      "Travail et énergie potentielle de pesanteur - Énergie mécanique",
      "Transfert d'énergie dans un circuit électrique",
      "Comportement global d'un circuit électrique",
      "Le champ magnétique",
      "Le champ magnétique créé par un courant électrique",
      "Les forces électromagnétiques - La loi de Laplace",
      // "Visibilité d'un objet",
      // "Les images formées par un miroir plan",
      // "Les images formées par une lentille mince convergente",
    ],
    Chimie: [
      // "Importance de la mesure en chimie",
      "Grandeurs physiques liées à la quantité de matière",
      "Solutions électrolytiques et concentrations",
      "Suivi d'une transformation chimique",
      "Mesure des quantités de matière en solution par conductimétrie",
      "Les réactions acido-basiques",
      "Les réactions d'oxydo-réduction",
      "Les dosages directs",
      "Expansion de la chimie organique",
      "Les molécules organiques et les squelettes carbonés",
      "Modification du squelette carboné",
      "Les groupes caractéristiques en chimie organique",
      "La réactivité des alcools",
    ],
  },
  "1ère Bac SM": {
    // Same as Sc. Exp plus 4 SM-only physics chapters (thermodynamics + electrostatics).
    Physique: [
      "Rotation d'un solide indéformable autour d'un axe fixe",
      "Travail et puissance d'une force",
      "Travail et énergie cinétique",
      "Travail et énergie potentielle de pesanteur - Énergie mécanique",
      "Travail et énergie interne",
      "Énergie thermique et transfert thermique",
      "Le champ électrostatique",
      "Énergie potentielle d'une charge électrique dans un champ électrique uniforme",
      "Transfert d'énergie dans un circuit électrique",
      "Comportement global d'un circuit électrique",
      "Le champ magnétique",
      "Le champ magnétique créé par un courant électrique",
      "Les forces électromagnétiques - La loi de Laplace",
      // "Visibilité d'un objet",
      // "Les images formées par un miroir plan",
      // "Les images formées par une lentille mince convergente",
    ],
    Chimie: [
      // "Importance de la mesure en chimie",
      "Grandeurs physiques liées à la quantité de matière",
      "Solutions électrolytiques et concentrations",
      "Suivi d'une transformation chimique",
      "Mesure des quantités de matière en solution par conductimétrie",
      "Les réactions acido-basiques",
      "Les réactions d'oxydo-réduction",
      "Les dosages directs",
      "Expansion de la chimie organique",
      "Les molécules organiques et les squelettes carbonés",
      "Modification du squelette carboné",
      "Les groupes caractéristiques en chimie organique",
      "La réactivité des alcools",
    ],
  },
  "2ème Bac SM": {
    Physique: [
      "Ondes mécaniques progressives",
      "Ondes mécaniques progressives périodiques",
      "Propagation des ondes lumineuses",
      "Décroissance radioactive",
      "Noyaux, masse et énergie",
      "Dipôle RC",
      "Dipôle RL",
      "Oscillations libres d'un circuit RLC en série",
      "Circuit RLC série en régime sinusoïdal forcé",
      // "Ondes électromagnétiques",
      "Ondes électromagnétiques - Modulation et démodulation d'amplitude",
      "Lois de Newton",
      "Chute verticale d'un corps solide",
      // "Chute verticale avec frottement",
      "Mouvements plans : projectile dans le champ de pesanteur",
      "Mouvements plans : particule chargée dans un champ magnétique",
      "Mouvements plans : particule chargée dans un champ électrique",
      "Mouvement des satellites et des planètes",
      "Mouvement de rotation d'un solide autour d'un axe fixe",
      "Oscillateurs mécaniques",
      "Aspects énergétiques des oscillations mécaniques",
      "Atome et mécanique de Newton",
    ],
    Chimie: [
      "Transformations lentes et transformations rapides",
      "Suivi temporel d'une transformation chimique - Vitesse de réaction",
      "Transformations chimiques s'effectuant dans les deux sens",
      "État d'équilibre d'un système chimique",
      "Transformations liées à des réactions acide-base",
      // "Dosage acido-basique",
      "Évolution spontanée d'un système chimique",
      "Transformations spontanées dans les piles et production d'énergie",
      "Transformations forcées (électrolyse)",
      "Réactions d'estérification et d'hydrolyse",
      "Contrôle de l'évolution d'un système chimique",
    ],
  },
  "2ème Bac PC": {
    Physique: [
      "Ondes mécaniques progressives",
      "Ondes mécaniques progressives périodiques",
      "Propagation des ondes lumineuses",
      "Décroissance radioactive",
      "Noyaux, masse et énergie",
      "Dipôle RC",
      "Dipôle RL",
      "Oscillations libres d'un circuit RLC en série",
      // "Circuit RLC série en régime sinusoïdal forcé",
      // "Ondes électromagnétiques",
      "Ondes électromagnétiques - Modulation et démodulation d'amplitude",
      "Lois de Newton",
      "Chute verticale d'un corps solide",
      // "Chute verticale avec frottement",
      "Mouvements plans : projectile dans le champ de pesanteur",
      "Mouvements plans : particule chargée dans un champ magnétique",
      "Mouvements plans : particule chargée dans un champ électrique",
      "Mouvement des satellites et des planètes",
      "Mouvement de rotation d'un solide autour d'un axe fixe",
      "Oscillateurs mécaniques",
      "Aspects énergétiques des oscillations mécaniques",
      "Atome et mécanique de Newton",
    ],
    Chimie: [
      "Transformations lentes et transformations rapides",
      "Suivi temporel d'une transformation chimique - Vitesse de réaction",
      "Transformations chimiques s'effectuant dans les deux sens",
      "État d'équilibre d'un système chimique",
      "Transformations liées à des réactions acide-base",
      // "Dosage acido-basique",
      "Évolution spontanée d'un système chimique",
      "Transformations spontanées dans les piles et production d'énergie",
      "Transformations forcées (électrolyse)",
      "Réactions d'estérification et d'hydrolyse",
      "Contrôle de l'évolution d'un système chimique",
    ],
  },
  "2ème Bac SVT": {
    // Wording aligned with 2ème Bac SM/PC for shared topics (same national physics
    // program) so a file classified under multiple tracks matches in every level's
    // menu. Verified 2026-08-06: "Oscillations libres d'un circuit RLC en série" and
    // "Oscillateurs mécaniques" and "Transformations chimiques s'effectuant dans les
    // deux sens" are the same chapter across all three tracks. "La chute libre
    // verticale d'un solide" is genuinely SVT-specific — SM/PC's equivalent is
    // "Chute verticale d'un corps solide" (no "libre"). "Le mouvement d'un
    // projectile dans un plan" (SM/PC: "Mouvements plans : projectile dans le champ
    // de pesanteur") is still unverified — left as-is.
    Physique: [
      "Ondes mécaniques progressives",
      "Ondes mécaniques progressives périodiques",
      "Propagation des ondes lumineuses",
      "Décroissance radioactive",
      "Noyaux, masse et énergie",
      "Dipôle RC",
      "Dipôle RL",
      "Oscillations libres d'un circuit RLC en série",
      "Lois de Newton",
      "La chute libre d'un corps solide",
      "Le mouvement d'un projectile dans le champ de pesanteur",
      "Mouvement de rotation d'un solide autour d'un axe fixe",
      "Oscillateurs mécaniques",
      "Aspects énergétiques des oscillations mécaniques",
    ],
    Chimie: [
      "Transformations lentes et transformations rapides",
      "Suivi temporel d'une transformation chimique - Vitesse de réaction",
      "Transformations chimiques s'effectuant dans les deux sens",
      "État d'équilibre d'un système chimique",
      "Transformations liées à des réactions acide-base",
      // "Dosage acido-basique",
      "Évolution spontanée d'un système chimique",
      "Transformations spontanées dans les piles et production d'énergie",
      "Réactions d'estérification et d'hydrolyse",
      "Contrôle de l'évolution d'un système chimique"
    ],
  },
};

/** Suggested chapters for a level, narrowed by matière when set.
 *  Unknown level → []. Unset / "Physique & Chimie" subject → both lists merged. */
export function chaptersFor(level?: string, subject?: string): string[] {
  const lc = level ? CHAPTERS_BY_LEVEL[level] : undefined;
  if (!lc) return [];
  if (subject === "Physique") return lc.Physique;
  if (subject === "Chimie") return lc.Chimie;
  return [...new Set([...lc.Physique, ...lc.Chimie])];
}
