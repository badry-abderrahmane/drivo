import type { LibraryItem } from "./types";
import { isClassified } from "./classification";
import { slugify } from "./slug";
import { docSlug } from "./doc";
import { driveThumbnailUrl } from "./drivePreview";
import { menuLevels } from "./menu";
import {
  SITE_URL,
  EXAMEN_NATIONAL_LEVELS,
  EXAMEN_NATIONAL_TYPE,
  AUTHOR_NAME,
  BRAND_OG_CARD,
  OG_CARD_SIZE,
} from "../config";

/**
 * The image a link preview shows. `width`/`height` are declared only when they are actually
 * known: a crawler that is told the wrong size lays the card out wrong, which is worse than
 * making it measure the file itself.
 *
 * `large` drives `twitter:card`. The wide brand card earns `summary_large_image`; a Drive
 * page-scan is portrait and would be letterboxed into a sliver by that layout, so it gets
 * the compact `summary` instead. Declaring large-format for an image that cannot fill it is
 * the single most common way a share preview ends up looking broken.
 */
export interface OgImage {
  url: string;
  alt: string;
  large: boolean;
  width?: number;
  height?: number;
}

/**
 * Every page that has no image of its own falls back to this. Before it existed the home
 * page, all the level and chapter pages and both hubs shared with no picture at all — the
 * text-only preview WhatsApp shows when `og:image` is absent.
 */
export const DEFAULT_OG_IMAGE: OgImage = {
  url: absoluteUrl(BRAND_OG_CARD),
  alt: "PIPC — cours, exercices et examens de Physique-Chimie",
  large: true,
  width: OG_CARD_SIZE.width,
  height: OG_CARD_SIZE.height,
};

/**
 * One prerenderable page. `body` is a semantic HTML block written into `<div id="app">`:
 * Vue's mount() clears that container before mounting, so a visitor never sees it, while a
 * crawler that runs no JavaScript still gets the heading, the metadata and — crucially —
 * real <a href> links it can follow into the rest of the library.
 */
export interface PageMeta {
  path: string;
  title: string;
  description: string;
  body: string;
  lastmod?: string;
  noindex?: boolean;
  ogImage?: OgImage;
  /** The document's `meta.type`, set only for document pages. Drives author vs editor. */
  docType?: string;
  /**
   * Set on the slug-less `/doc/:fileId/` alias, which must not compete with the real URL.
   * When present it is the path this page declares as canonical instead of its own.
   */
  canonicalPath?: string;
}

const SUFFIX = " | PIPC";

/** Google renders roughly 60 characters of a title and ~155 of a description. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** SITE_URL ends with a slash and every path starts with one; join without doubling it. */
export function absoluteUrl(path: string): string {
  return SITE_URL.replace(/\/$/, "") + path;
}

/**
 * Every page is written as `<path>/index.html`, and a static host serves that only at the
 * trailing-slash URL — it 301-redirects the bare path to it. Canonicals, og:url, sitemap
 * entries and internal links therefore all use the trailing-slash form, so an indexed URL
 * is served directly instead of costing a redirect on every crawl. Vue Router matches
 * either form (its default `strict: false`), so in-app navigation is unaffected.
 */
function withSlash(path: string): string {
  return path.endsWith("/") ? path : path + "/";
}

/** The absolute URL a page declares as its own. */
export function canonicalUrl(path: string): string {
  return absoluteUrl(withSlash(path));
}

/**
 * The site's path prefix, derived from SITE_URL rather than restated: "" when the site is
 * served at a domain root, "/drivo" for a GitHub project site. Deriving it means moving the
 * site to another host or path is a one-line change to SITE_URL, and cannot leave
 * prerendered links pointing at a base the app no longer uses.
 */
export function basePathOf(siteUrl: string): string {
  return new URL(siteUrl).pathname.replace(/\/$/, "");
}

const BASE_PATH = basePathOf(SITE_URL);

/** The in-site href a crawler follows: the base path plus the route path. */
function href(path: string): string {
  return BASE_PATH + withSlash(path);
}

function isoDate(t: string): string | undefined {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/**
 * Collapse the runs of whitespace a hand-typed Drive filename leaves behind. Without this a
 * trailing space in `displayTitle` surfaces as "La concentration molaire  — Cours" in both
 * the search result and the WhatsApp preview.
 */
export function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Cut to `max` characters on a word boundary, with an ellipsis. Used for descriptions,
 * where the alternative — letting a 765-character chapter dump through — means the crawler
 * truncates instead, and it does not care where the words are.
 */
export function clamp(s: string, max: number): string {
  const text = tidy(s);
  if (text.length <= max) return text;
  // -1 leaves room for the ellipsis itself.
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:—-]+$/, "") + "…";
}

/**
 * The first candidate that fits within TITLE_MAX once the site suffix is added, else the
 * last one clamped. Candidates run most-informative first, so a long document title loses
 * its level, then its type, rather than being ellipsized while a shorter honest form was
 * available — an ellipsis in a SERP costs more than a dropped qualifier.
 */
export function fitTitle(candidates: string[], suffix = SUFFIX): string {
  const room = TITLE_MAX - suffix.length;
  for (const c of candidates) {
    const text = tidy(c);
    if (text.length <= room) return text + suffix;
  }
  return clamp(candidates[candidates.length - 1] ?? "", room) + suffix;
}

function link(path: string, label: string): string {
  return `<a href="${href(path)}">${escapeHtml(label)}</a>`;
}

export function levelPath(level: string): string {
  return `/niveau/${slugify(level)}`;
}

export function chapterPath(level: string, chapter: string): string {
  return `${levelPath(level)}/chapitre/${slugify(chapter)}`;
}

export function documentPath(item: LibraryItem): string {
  return `/doc/${item.fileId}/${docSlug(item)}`;
}

/**
 * At most three chapters spelled out, then a count. An Examen National paper covers the
 * whole year's programme, and listing all fourteen chapters produced a 765-character
 * description that no crawler would show past the second one.
 */
function chapterSummary(chapters: string[]): string {
  if (chapters.length <= 3) return chapters.join(", ");
  const rest = chapters.length - 3;
  return `${chapters.slice(0, 3).join(", ")} et ${rest} autre${rest > 1 ? "s" : ""} chapitre${rest > 1 ? "s" : ""}`;
}

function docDescription(item: LibraryItem): string {
  if (item.meta.description.trim()) return clamp(item.meta.description, DESCRIPTION_MAX);
  const chapters = chapterSummary(item.meta.chapter);
  const levels = item.meta.level.join(", ");
  const chapterPart = chapters ? ` Chapitre : ${chapters}.` : "";
  return clamp(
    `${item.meta.type} de ${item.meta.subject} — ${levels}.${chapterPart} À consulter en ligne et à télécharger sur PIPC.`,
    DESCRIPTION_MAX
  );
}

/**
 * The preview image for a document: its own first page when Drive has rendered one,
 * otherwise the brand card. `thumbnailLink` is the proof that a thumbnail exists — pointing
 * at the endpoint for a file Drive never rendered returns a 404, and a broken og:image is
 * worse than a generic one.
 */
function docImage(item: LibraryItem): OgImage {
  if (!item.thumbnailLink) return DEFAULT_OG_IMAGE;
  return {
    url: driveThumbnailUrl(item.fileId, 1200),
    alt: `Première page — ${tidy(item.displayTitle)}`,
    // A page scan is portrait; summary_large_image would letterbox it. See OgImage.
    large: false,
  };
}

interface NavSection {
  heading: string;
  links: { path: string; label: string }[];
}

/**
 * The hub links a page offers besides its own document list. These are what make the site
 * crawlable downward: before them the only prerendered links pointed from a document up to
 * its level, so the level, chapter and menu pages were reachable from the sitemap and from
 * nowhere else — orphans, in the sense Search Console means it.
 */
function navBody(sections: NavSection[]): string {
  return sections
    .filter((s) => s.links.length)
    .map(
      (s) =>
        `<h2>${escapeHtml(s.heading)}</h2><ul>${s.links
          .map((l) => `<li>${link(l.path, l.label)}</li>`)
          .join("")}</ul>`
    )
    .join("");
}

function listBody(
  heading: string,
  intro: string,
  items: LibraryItem[],
  sections: NavSection[] = []
): string {
  return [
    `<h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(intro)}</p>`,
    navBody(sections),
    items.length
      ? `<ul>${items.map((it) => `<li>${link(documentPath(it), tidy(it.displayTitle))}</li>`).join("")}</ul>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

function docPage(item: LibraryItem, all: LibraryItem[]): PageMeta {
  const levels = item.meta.level.join(", ");
  const siblings = all.filter(
    (it) =>
      it.fileId !== item.fileId &&
      isClassified(it.meta) &&
      it.meta.level.some((l) => item.meta.level.includes(l)) &&
      it.meta.chapter.some((c) => item.meta.chapter.includes(c))
  );
  const level = item.meta.level[0];
  const chapter = item.meta.chapter[0];

  const parts = [
    `<h1>${escapeHtml(tidy(item.displayTitle))}</h1>`,
    `<p>${escapeHtml(`${item.meta.type} · ${item.meta.subject} · ${levels}`)}</p>`,
    item.meta.chapter.length ? `<p>Chapitres : ${escapeHtml(item.meta.chapter.join(", "))}</p>` : "",
    `<p>${escapeHtml(docDescription(item))}</p>`,
    level ? `<p>${link(levelPath(level), level)}</p>` : "",
    level && chapter ? `<p>${link(chapterPath(level, chapter), chapter)}</p>` : "",
    siblings.length
      ? `<h2>Dans le même chapitre</h2><ul>${siblings
          .map((s) => `<li>${link(documentPath(s), s.displayTitle)}</li>`)
          .join("")}</ul>`
      : "",
  ];

  const name = tidy(item.displayTitle);
  return {
    path: documentPath(item),
    // Sheds the level, then the type, before it will ellipsize the document's own name.
    title: fitTitle([`${name} — ${item.meta.type}, ${levels}`, `${name} — ${item.meta.type}`, name]),
    description: docDescription(item),
    body: parts.filter(Boolean).join(""),
    lastmod: isoDate(item.modifiedTime),
    ogImage: docImage(item),
    docType: item.meta.type,
  };
}

/**
 * The slug-less `/doc/:fileId/` form. The router matches it (`:slug?` is optional) but
 * nothing used to be written there, so a static host answered with 404.html — a shared link
 * that lost its slug died instead of loading. It carries the real URL as its canonical so
 * the two never compete for the same document in the index.
 */
function docAliasPage(page: PageMeta, item: LibraryItem): PageMeta {
  return {
    ...page,
    path: `/doc/${item.fileId}`,
    canonicalPath: page.path,
    body: `${page.body}<p>${link(page.path, "Page du document")}</p>`,
  };
}

/**
 * Every URL worth writing to disk, derived from the library itself: the static pages, one
 * page per level in use, one per level+chapter in use, and one per published document.
 * Every route the router can match must appear here — GitHub Pages serves 404.html for
 * anything unmatched, so an un-emitted route would 404 instead of loading the SPA. That is
 * why /admin is present (noindex, and filtered out of the sitemap).
 */
export function enumeratePages(items: LibraryItem[]): PageMeta[] {
  const published = items.filter((it) => isClassified(it.meta));
  const pages: PageMeta[] = [];

  const levelsInUse = [...new Set(published.flatMap((it) => it.meta.level))];
  const chaptersOf = (level: string): string[] => [
    ...new Set(published.filter((it) => it.meta.level.includes(level)).flatMap((it) => it.meta.chapter)),
  ];

  /** The level hubs, as links. The home page's main path down into the library. */
  const levelLinks = levelsInUse.map((l) => ({ path: levelPath(l), label: l }));
  const menuLinks = menuLevels().map((l) => ({ path: `/menu/${slugify(l)}`, label: l }));
  const examLinks = EXAMEN_NATIONAL_LEVELS.map((l) => ({
    path: `/examen-national/${slugify(l)}`,
    label: l,
  }));

  pages.push({
    path: "/",
    title: "PIPC — Cours, exercices et examens de Physique-Chimie",
    description:
      "Bibliothèque de cours, exercices corrigés, devoirs et examens nationaux de Physique-Chimie du programme marocain, classés par niveau et par chapitre.",
    body: listBody(
      "Physique-Chimie — cours, exercices et examens",
      "Toutes les ressources du programme marocain, classées par niveau et par chapitre.",
      published.slice(0, 50),
      [
        { heading: "Par niveau", links: levelLinks },
        {
          heading: "Parcourir",
          links: [
            { path: "/menu", label: "Menu thématique" },
            { path: "/examen-national", label: "Examen National" },
          ],
        },
      ]
    ),
  });

  pages.push({
    path: "/menu",
    title: fitTitle(["Menu thématique — programme officiel de Physique-Chimie", "Menu thématique"]),
    description:
      "Le programme officiel de Physique-Chimie chapitre par chapitre, avec les ressources disponibles pour chaque niveau.",
    body: listBody("Menu thématique", "Le programme officiel, chapitre par chapitre.", [], [
      { heading: "Par niveau", links: menuLinks },
    ]),
  });

  pages.push({
    path: "/examen-national",
    title: fitTitle([
      "Examen National de Physique-Chimie — sujets par filière",
      "Examen National de Physique-Chimie",
    ]),
    description:
      "Sujets d'examen national de Physique-Chimie, classés par filière de 2ème Bac et par année.",
    body: listBody("Examen National", "Les sujets classés par filière et par année.", [], [
      { heading: "Par filière", links: examLinks },
    ]),
  });

  for (const level of menuLevels()) {
    pages.push({
      path: `/menu/${slugify(level)}`,
      title: fitTitle([
        `Menu thématique ${level} — programme de Physique-Chimie`,
        `Menu thématique ${level} — Physique-Chimie`,
        `Menu thématique — ${level}`,
      ]),
      description: clamp(
        `Le programme officiel de Physique-Chimie de ${level}, chapitre par chapitre, avec les ressources disponibles.`,
        DESCRIPTION_MAX
      ),
      // The chapter hubs for this level: without them a menu page was a dead end, with a
      // heading, one sentence and no way onward for a crawler.
      body: listBody(
        `Menu thématique — ${level}`,
        `Le programme officiel de ${level}, chapitre par chapitre.`,
        [],
        [
          {
            heading: "Chapitres",
            links: chaptersOf(level).map((c) => ({ path: chapterPath(level, c), label: c })),
          },
          { heading: "Voir aussi", links: [{ path: levelPath(level), label: `Toutes les ressources — ${level}` }] },
        ]
      ),
    });
  }

  for (const level of EXAMEN_NATIONAL_LEVELS) {
    pages.push({
      path: `/examen-national/${slugify(level)}`,
      title: fitTitle([
        `Examen National ${level} — sujets de Physique-Chimie`,
        `Examen National ${level} — Physique-Chimie`,
        `Examen National — ${level}`,
      ]),
      description: clamp(
        `Sujets d'examen national de Physique-Chimie pour ${level}, classés par année, à consulter et à télécharger.`,
        DESCRIPTION_MAX
      ),
      body: listBody(
        `Examen National — ${level}`,
        `Les sujets d'examen national de ${level}, classés par année.`,
        published.filter((it) => it.meta.type === EXAMEN_NATIONAL_TYPE && it.meta.level.includes(level)),
        [{ heading: "Voir aussi", links: [{ path: levelPath(level), label: `Toutes les ressources — ${level}` }] }]
      ),
    });
  }

  // Emitted only so the URL resolves to the SPA instead of 404.html.
  pages.push({
    path: "/admin",
    title: `Administration${SUFFIX}`,
    description: "Espace d'administration de la bibliothèque.",
    body: "",
    noindex: true,
  });

  for (const level of levelsInUse) {
    const inLevel = published.filter((it) => it.meta.level.includes(level));
    const chapters = chaptersOf(level);
    pages.push({
      path: levelPath(level),
      title: fitTitle([
        `Physique-Chimie ${level} : cours, exercices et examens`,
        `Physique-Chimie ${level} : cours et exercices`,
        `Physique-Chimie — ${level}`,
      ]),
      description: clamp(
        `Toutes les ressources de Physique-Chimie pour ${level} : cours, exercices corrigés, devoirs surveillés et examens nationaux, classés par chapitre.`,
        DESCRIPTION_MAX
      ),
      body: listBody(`Physique-Chimie — ${level}`, `Cours, exercices et examens pour ${level}.`, inLevel, [
        {
          heading: "Chapitres",
          links: chapters.map((c) => ({ path: chapterPath(level, c), label: c })),
        },
      ]),
    });

    for (const chapter of chapters) {
      const inChapter = inLevel.filter((it) => it.meta.chapter.includes(chapter));
      pages.push({
        path: chapterPath(level, chapter),
        title: fitTitle([
          `${chapter} — ${level} : cours, exercices et examens`,
          `${chapter} — ${level} : cours et exercices`,
          `${chapter} — ${level}`,
          chapter,
        ]),
        description: clamp(
          `${chapter} (${level}) : cours, exercices corrigés et examens à consulter en ligne et à télécharger.`,
          DESCRIPTION_MAX
        ),
        body: listBody(
          `${chapter} — ${level}`,
          `Les ressources du chapitre « ${chapter} » pour ${level}.`,
          inChapter,
          [{ heading: "Voir aussi", links: [{ path: levelPath(level), label: `Toutes les ressources — ${level}` }] }]
        ),
      });
    }
  }

  for (const item of published) {
    const page = docPage(item, published);
    pages.push(page);
    pages.push(docAliasPage(page, item));
  }

  return pages;
}

/**
 * schema.org for a document page. Hassan Badry wrote and edited the cours and exercices,
 * so he is their `author`; the Examen National papers are written by the ministry and he
 * gathered them, so there he is the `editor`. The distinction is free here and claiming
 * authorship of national exam papers would be false.
 */
export function jsonLd(page: PageMeta): string {
  if (!page.docType) return "";
  const role = page.docType === EXAMEN_NATIONAL_TYPE ? "editor" : "author";
  const data = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: page.title.replace(SUFFIX, ""),
    description: page.description,
    url: canonicalUrl(page.canonicalPath ?? page.path),
    inLanguage: "fr",
    [role]: { "@type": "Person", name: AUTHOR_NAME },
    publisher: { "@type": "Organization", name: "PIPC" },
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

/** The built shell with this page's head metadata and content block written into it. */
export function injectPage(shell: string, page: PageMeta): string {
  // An alias points at the URL it duplicates; every other page is its own canonical.
  // og:url takes the same value: Facebook and WhatsApp treat it as the identity of the
  // thing being shared, so pointing it at the alias would bank the shares of a document
  // under two different URLs.
  const url = canonicalUrl(page.canonicalPath ?? page.path);
  const image = page.ogImage ?? DEFAULT_OG_IMAGE;
  const head = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    page.noindex ? `<meta name="robots" content="noindex">` : "",
    // A listing is a place, a document is a piece of writing. Only the latter is an article.
    `<meta property="og:type" content="${page.docType ? "article" : "website"}">`,
    `<meta property="og:site_name" content="PIPC">`,
    `<meta property="og:locale" content="fr_MA">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${escapeHtml(image.url)}">`,
    // https, so secure_url is the same URL. Slack and older Facebook readers want it named.
    `<meta property="og:image:secure_url" content="${escapeHtml(image.url)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(image.alt)}">`,
    image.width ? `<meta property="og:image:width" content="${image.width}">` : "",
    image.height ? `<meta property="og:image:height" content="${image.height}">` : "",
    `<meta name="twitter:card" content="${image.large ? "summary_large_image" : "summary"}">`,
    `<meta name="author" content="${escapeHtml(AUTHOR_NAME)}">`,
    jsonLd(page),
  ]
    .filter(Boolean)
    .join("");

  return shell
    .replace(/<title>.*?<\/title>/s, "")
    .replace("</head>", `${head}</head>`)
    .replace('<div id="app"></div>', `<div id="app">${page.body}</div>`);
}

export function sitemapXml(pages: PageMeta[]): string {
  const urls = pages
    // An alias declares another page as canonical, so listing it would ask Google to index
    // a URL that disowns itself.
    .filter((p) => !p.noindex && !p.canonicalPath)
    .map((p) => {
      const lastmod = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : "";
      return `  <url><loc>${escapeHtml(canonicalUrl(p.path))}</loc>${lastmod}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: ${BASE_PATH}/admin\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`;
}
