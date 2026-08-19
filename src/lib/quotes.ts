/**
 * Footer quotations — one is picked per page load, replacing the row of formulas.
 *
 * Attribution is deliberately conservative. Popular science quotations circulate widely
 * in misattributed forms, and a teacher's site is the last place to print one: entries
 * here are either traditional proverbs, which belong to nobody, or quotations whose
 * source is documented. Poincaré and Pasteur are French originals, so nothing is lost in
 * translation either. Anything I could not vouch for was left out rather than softened
 * with a vague "attribué à".
 */
export interface Quote {
  text: string;
  /** Omitted for traditional proverbs, which have no author to credit. */
  author?: string;
}

export const QUOTES: readonly Quote[] = [
  { text: "C'est en forgeant qu'on devient forgeron." },
  { text: "Petit à petit, l'oiseau fait son nid." },
  { text: "Goutte à goutte, l'eau creuse la pierre." },
  { text: "Qui veut voyager loin ménage sa monture." },
  {
    text: "On fait la science avec des faits, comme on fait une maison avec des pierres ; mais une accumulation de faits n'est pas plus une science qu'un tas de pierres n'est une maison.",
    author: "Henri Poincaré",
  },
  {
    text: "Dans les champs de l'observation, le hasard ne favorise que les esprits préparés.",
    author: "Louis Pasteur",
  },
  {
    text: "On ne fait jamais attention à ce qui a été fait ; on ne voit que ce qui reste à faire.",
    author: "Marie Curie",
  },
  {
    text: "L'imagination est plus importante que le savoir.",
    author: "Albert Einstein",
  },
];

/**
 * One quotation at random. The generator is injectable so the choice can be tested; the
 * index is clamped because Math.random is specified as < 1 but a stub need not be.
 */
export function randomQuote(rng: () => number = Math.random): Quote {
  const i = Math.min(QUOTES.length - 1, Math.floor(rng() * QUOTES.length));
  return QUOTES[i];
}
