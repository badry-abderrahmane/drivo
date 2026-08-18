import type { LibraryItem } from "./types";
import { isClassified } from "./classification";
import { slugify } from "./slug";
import { docSlug } from "./doc";
import { menuLevels } from "./menu";
import { SITE_URL, EXAMEN_NATIONAL_LEVELS, EXAMEN_NATIONAL_TYPE } from "../config";

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
  ogImage?: string;
}

const SUFFIX = " | PIPC";

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

/** The in-site href a crawler follows: the Vite base plus the route path. */
function href(path: string): string {
  return "/drivo" + withSlash(path);
}

function isoDate(t: string): string | undefined {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
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

function docDescription(item: LibraryItem): string {
  if (item.meta.description.trim()) return item.meta.description.trim();
  const chapters = item.meta.chapter.join(", ");
  const levels = item.meta.level.join(", ");
  return `${item.meta.type} de ${item.meta.subject} — ${levels}. Chapitre : ${chapters}. À consulter en ligne et à télécharger sur PIPC.`;
}

function listBody(heading: string, intro: string, items: LibraryItem[]): string {
  return [
    `<h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(intro)}</p>`,
    items.length
      ? `<ul>${items.map((it) => `<li>${link(documentPath(it), it.displayTitle)}</li>`).join("")}</ul>`
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
    `<h1>${escapeHtml(item.displayTitle)}</h1>`,
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

  return {
    path: documentPath(item),
    title: `${item.displayTitle} — ${item.meta.type}, ${levels}${SUFFIX}`,
    description: docDescription(item),
    body: parts.filter(Boolean).join(""),
    lastmod: isoDate(item.modifiedTime),
    ogImage: item.thumbnailLink,
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

  pages.push({
    path: "/",
    title: "PIPC — Cours, exercices et examens de Physique-Chimie",
    description:
      "Bibliothèque de cours, exercices corrigés, devoirs et examens nationaux de Physique-Chimie du programme marocain, classés par niveau et par chapitre.",
    body: listBody(
      "Physique-Chimie — cours, exercices et examens",
      "Toutes les ressources du programme marocain, classées par niveau et par chapitre.",
      published.slice(0, 50)
    ),
  });

  pages.push({
    path: "/menu",
    title: `Menu thématique — programme officiel de Physique-Chimie${SUFFIX}`,
    description:
      "Le programme officiel de Physique-Chimie chapitre par chapitre, avec les ressources disponibles pour chaque niveau.",
    body: listBody("Menu thématique", "Le programme officiel, chapitre par chapitre.", []),
  });

  pages.push({
    path: "/examen-national",
    title: `Examen National de Physique-Chimie — sujets par filière${SUFFIX}`,
    description:
      "Sujets d'examen national de Physique-Chimie, classés par filière de 2ème Bac et par année.",
    body: listBody("Examen National", "Les sujets classés par filière et par année.", []),
  });

  for (const level of menuLevels()) {
    pages.push({
      path: `/menu/${slugify(level)}`,
      title: `Menu thématique ${level} — programme de Physique-Chimie${SUFFIX}`,
      description: `Le programme officiel de Physique-Chimie de ${level}, chapitre par chapitre, avec les ressources disponibles.`,
      body: listBody(`Menu thématique — ${level}`, `Le programme officiel de ${level}, chapitre par chapitre.`, []),
    });
  }

  for (const level of EXAMEN_NATIONAL_LEVELS) {
    pages.push({
      path: `/examen-national/${slugify(level)}`,
      title: `Examen National ${level} — sujets de Physique-Chimie${SUFFIX}`,
      description: `Sujets d'examen national de Physique-Chimie pour ${level}, classés par année, à consulter et à télécharger.`,
      body: listBody(
        `Examen National — ${level}`,
        `Les sujets d'examen national de ${level}, classés par année.`,
        published.filter((it) => it.meta.type === EXAMEN_NATIONAL_TYPE && it.meta.level.includes(level))
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

  const levels = [...new Set(published.flatMap((it) => it.meta.level))];
  for (const level of levels) {
    const inLevel = published.filter((it) => it.meta.level.includes(level));
    pages.push({
      path: levelPath(level),
      title: `Physique-Chimie ${level} : cours, exercices et examens${SUFFIX}`,
      description: `Toutes les ressources de Physique-Chimie pour ${level} : cours, exercices corrigés, devoirs surveillés et examens nationaux, classés par chapitre.`,
      body: listBody(`Physique-Chimie — ${level}`, `Cours, exercices et examens pour ${level}.`, inLevel),
    });

    const chapters = [...new Set(inLevel.flatMap((it) => it.meta.chapter))];
    for (const chapter of chapters) {
      const inChapter = inLevel.filter((it) => it.meta.chapter.includes(chapter));
      pages.push({
        path: chapterPath(level, chapter),
        title: `${chapter} — ${level} : cours, exercices et examens${SUFFIX}`,
        description: `${chapter} (${level}) : cours, exercices corrigés et examens à consulter en ligne et à télécharger.`,
        body: listBody(
          `${chapter} — ${level}`,
          `Les ressources du chapitre « ${chapter} » pour ${level}.`,
          inChapter
        ),
      });
    }
  }

  for (const item of published) pages.push(docPage(item, published));

  return pages;
}

/** The built shell with this page's head metadata and content block written into it. */
export function injectPage(shell: string, page: PageMeta): string {
  const url = canonicalUrl(page.path);
  const head = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    page.noindex ? `<meta name="robots" content="noindex">` : "",
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="PIPC">`,
    `<meta property="og:locale" content="fr_MA">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    `<meta property="og:url" content="${url}">`,
    page.ogImage ? `<meta property="og:image" content="${escapeHtml(page.ogImage)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
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
    .filter((p) => !p.noindex)
    .map((p) => {
      const lastmod = p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : "";
      return `  <url><loc>${escapeHtml(canonicalUrl(p.path))}</loc>${lastmod}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /drivo/admin\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`;
}
