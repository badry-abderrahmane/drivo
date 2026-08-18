import { describe, it, expect } from "vitest";
import { enumeratePages, absoluteUrl, basePathOf, canonicalUrl, injectPage, sitemapXml, robotsTxt, escapeHtml } from "./seo";
import type { LibraryItem } from "./types";

const make = (fileId: string, over: Partial<LibraryItem["meta"]> = {}, title = "Dipôle RC — Cours"): LibraryItem => ({
  fileId,
  name: `${fileId}.pdf`,
  mimeType: "application/pdf",
  path: [],
  webViewLink: "u",
  modifiedTime: "2026-03-04T10:00:00.000Z",
  isFolder: false,
  displayTitle: title,
  meta: {
    fileId,
    level: over.level ?? ["2ème Bac SM"],
    type: over.type ?? "Cours",
    subject: over.subject ?? "Physique",
    chapter: over.chapter ?? ["Dipôle RC"],
    title: "",
    description: over.description ?? "",
    tags: [],
    order: 0,
  },
});

const SHELL = `<!doctype html><html lang="fr"><head><title>PIPC</title></head><body><div id="app"></div></body></html>`;

describe("escapeHtml", () => {
  it("escapes the characters that would break an attribute or a tag", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("basePathOf", () => {
  it("is empty for a site served at the domain root", () => {
    expect(basePathOf("https://pipc.ma/")).toBe("");
  });

  it("is the sub-path for a project site, without a trailing slash", () => {
    expect(basePathOf("https://badry-abderrahmane.github.io/drivo/")).toBe("/drivo");
  });

  it("tolerates a missing trailing slash", () => {
    expect(basePathOf("https://example.com/sub")).toBe("/sub");
  });
});

describe("canonicalUrl", () => {
  it("uses the trailing-slash form, which a static host serves without a redirect", () => {
    expect(canonicalUrl("/doc/a/titre")).toBe("https://badry-abderrahmane.github.io/drivo/doc/a/titre/");
  });

  it("leaves the root alone", () => {
    expect(canonicalUrl("/")).toBe("https://badry-abderrahmane.github.io/drivo/");
  });
});

describe("absoluteUrl", () => {
  it("joins the site base with a path without doubling the slash", () => {
    expect(absoluteUrl("/menu")).toBe("https://badry-abderrahmane.github.io/drivo/menu");
  });

  it("maps the root path to the base itself", () => {
    expect(absoluteUrl("/")).toBe("https://badry-abderrahmane.github.io/drivo/");
  });
});

describe("enumeratePages", () => {
  const items = [make("a"), make("b", {}, "Dipôle RC — Exercices"), make("c", { chapter: ["Lois de Newton"] }, "Newton")];
  const paths = enumeratePages(items).map((p) => p.path);

  it("includes the static pages", () => {
    expect(paths).toContain("/");
    expect(paths).toContain("/menu");
    expect(paths).toContain("/examen-national");
  });

  it("includes a page per level in use", () => {
    expect(paths).toContain("/niveau/2eme-bac-sm");
  });

  it("includes a page per level and chapter in use", () => {
    expect(paths).toContain("/niveau/2eme-bac-sm/chapitre/dipole-rc");
    expect(paths).toContain("/niveau/2eme-bac-sm/chapitre/lois-de-newton");
  });

  it("includes a slugged page per document", () => {
    expect(paths).toContain("/doc/a/dipole-rc-cours");
  });

  it("excludes unclassified documents", () => {
    const withDraft = enumeratePages([...items, make("d", { type: "" })]).map((p) => p.path);
    expect(withDraft.some((p) => p.startsWith("/doc/d"))).toBe(false);
  });

  it("includes a page per level for the menu and the national exam", () => {
    expect(paths).toContain("/menu/2eme-bac-sm");
    expect(paths).toContain("/examen-national/2eme-bac-sm");
  });

  it("emits the admin page so its URL is not a 404, but marks it noindex", () => {
    const admin = enumeratePages(items).find((p) => p.path === "/admin");
    expect(admin).toBeDefined();
    expect(admin?.noindex).toBe(true);
  });

  it("keeps the admin page out of the sitemap", () => {
    expect(sitemapXml(enumeratePages(items))).not.toContain("/drivo/admin<");
  });

  it("emits a page for every route the router can match", () => {
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("gives a document page a title carrying its type and level", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.title).toBe("Dipôle RC — Cours — Cours, 2ème Bac SM | PIPC");
  });

  it("generates a description when the admin wrote none", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.description).toContain("Physique");
    expect(doc?.description).toContain("2ème Bac SM");
  });

  it("prefers the admin's description when there is one", () => {
    const pages = enumeratePages([make("a", { description: "Résumé du cours sur le condensateur." })]);
    const doc = pages.find((p) => p.path.startsWith("/doc/a"));
    expect(doc?.description).toBe("Résumé du cours sur le condensateur.");
  });

  it("carries the document's modifiedTime as lastmod", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.lastmod).toBe("2026-03-04");
  });

  it("links a document page to its siblings so crawlers can walk the library", () => {
    const doc = enumeratePages(items).find((p) => p.path === "/doc/a/dipole-rc-cours");
    expect(doc?.body).toContain('href="/drivo/doc/b/dipole-rc-exercices/"');
  });

  it("escapes document titles in the body", () => {
    const pages = enumeratePages([make("a", {}, "A <b> & C")]);
    expect(pages.find((p) => p.path.startsWith("/doc/a"))?.body).toContain("A &lt;b&gt; &amp; C");
  });
});

describe("injectPage", () => {
  const page = enumeratePages([make("a")]).find((p) => p.path.startsWith("/doc/a"))!;
  const html = injectPage(SHELL, page);

  it("replaces the shell title", () => {
    expect(html).toContain(`<title>${escapeHtml(page.title)}</title>`);
    expect(html).not.toContain("<title>PIPC</title>");
  });

  it("adds a description, a canonical link and OG tags", () => {
    expect(html).toContain('<meta name="description"');
    expect(html).toContain(`<link rel="canonical" href="${canonicalUrl(page.path)}">`);
    expect(html).toContain('<meta property="og:title"');
  });

  it("injects the content block into the app container", () => {
    expect(html).toContain('<div id="app">');
    expect(html).toContain("<h1>");
    expect(html).not.toContain('<div id="app"></div>');
  });

  it("marks a noindex page as noindex", () => {
    const out = injectPage(SHELL, { ...page, noindex: true });
    expect(out).toContain('<meta name="robots" content="noindex">');
  });
});

describe("sitemapXml", () => {
  const pages = enumeratePages([make("a")]);
  const xml = sitemapXml(pages);

  it("lists absolute URLs", () => {
    expect(xml).toContain("<loc>https://badry-abderrahmane.github.io/drivo/</loc>");
  });

  it("includes lastmod when known", () => {
    expect(xml).toContain("<lastmod>2026-03-04</lastmod>");
  });

  it("omits noindex pages", () => {
    const out = sitemapXml([...pages, { path: "/x", title: "x", description: "x", body: "", noindex: true }]);
    expect(out).not.toContain("/drivo/x/<");
  });

  it("is well-formed", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});

describe("robotsTxt", () => {
  it("disallows admin and points at the sitemap", () => {
    const out = robotsTxt();
    expect(out).toContain("Disallow: /drivo/admin");
    expect(out).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
  });
});
