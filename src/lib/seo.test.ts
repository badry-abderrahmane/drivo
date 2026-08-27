import { describe, it, expect } from "vitest";
import { enumeratePages, absoluteUrl, basePathOf, canonicalUrl, injectPage, jsonLd, sitemapXml, robotsTxt, escapeHtml, tidy, clamp, fitTitle, DEFAULT_OG_IMAGE } from "./seo";
import type { LibraryItem } from "./types";

const make = (fileId: string, over: Partial<LibraryItem["meta"]> = {}, title = "Dipôle RC — Cours"): LibraryItem => ({
  fileId,
  name: `${fileId}.pdf`,
  mimeType: "application/pdf",
  path: [],
  webViewLink: "u",
  // Present on every real file the backend returns; it is what proves Drive rendered a
  // preview at all, so docImage() keys the document's own og:image off it.
  thumbnailLink: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
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
    expect(canonicalUrl("/doc/a/titre")).toBe("https://pipc.ma/doc/a/titre/");
  });

  it("leaves the root alone", () => {
    expect(canonicalUrl("/")).toBe("https://pipc.ma/");
  });
});

describe("absoluteUrl", () => {
  it("joins the site base with a path without doubling the slash", () => {
    expect(absoluteUrl("/menu")).toBe("https://pipc.ma/menu");
  });

  it("maps the root path to the base itself", () => {
    expect(absoluteUrl("/")).toBe("https://pipc.ma/");
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
    expect(sitemapXml(enumeratePages(items))).not.toContain("pipc.ma/admin");
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
    expect(doc?.body).toContain('href="/doc/b/dipole-rc-exercices/"');
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
    expect(xml).toContain("<loc>https://pipc.ma/</loc>");
  });

  it("includes lastmod when known", () => {
    expect(xml).toContain("<lastmod>2026-03-04</lastmod>");
  });

  it("omits noindex pages", () => {
    const out = sitemapXml([...pages, { path: "/x", title: "x", description: "x", body: "", noindex: true }]);
    expect(out).not.toContain("pipc.ma/x/");
  });

  it("is well-formed", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});

describe("robotsTxt", () => {
  it("disallows admin and points at the sitemap", () => {
    const out = robotsTxt();
    expect(out).toContain("Disallow: /admin");
    expect(out).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
  });
});

describe("jsonLd", () => {
  const base = { path: "/doc/1/x", title: "T", description: "D", body: "" };

  it("names Hassan Badry as author of ordinary documents", () => {
    const out = jsonLd({ ...base, docType: "Cours" });
    expect(out).toContain('"author"');
    expect(out).toContain("Hassan Badry");
    expect(out).not.toContain('"editor"');
  });

  it("names him as editor of Examen National papers, not author", () => {
    const out = jsonLd({ ...base, docType: "Examen National" });
    expect(out).toContain('"editor"');
    expect(out).not.toContain('"author"');
  });

  it("returns nothing for non-document pages", () => {
    expect(jsonLd(base)).toBe("");
  });
});

describe("injectPage author meta", () => {
  it("declares the author on every page", () => {
    const out = injectPage('<html><head></head><body><div id="app"></div></body></html>', {
      path: "/",
      title: "T",
      description: "D",
      body: "",
    });
    expect(out).toContain('<meta name="author" content="Hassan Badry">');
  });
});

describe("tidy", () => {
  it("collapses the whitespace a hand-typed Drive filename leaves behind", () => {
    expect(tidy("La concentration molaire  — Cours ")).toBe("La concentration molaire — Cours");
  });
});

describe("clamp", () => {
  it("leaves text that already fits alone", () => {
    expect(clamp("court", 20)).toBe("court");
  });

  it("cuts on a word boundary and marks the cut", () => {
    const out = clamp("un deux trois quatre cinq six sept huit", 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("quatr…");
  });

  it("does not leave a dangling separator before the ellipsis", () => {
    expect(clamp("Dipôle RC, Lois de Newton, Ondes", 14)).not.toMatch(/[,\s]…$/);
  });
});

describe("fitTitle", () => {
  it("takes the first candidate that fits once the suffix is added", () => {
    const out = fitTitle(["a".repeat(80), "court"]);
    expect(out).toBe("court | PIPC");
  });

  it("clamps the last candidate when nothing fits", () => {
    const out = fitTitle(["a".repeat(80)]);
    expect(out.endsWith(" | PIPC")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(60);
  });
});

describe("title and description budgets", () => {
  const long = make(
    "x",
    { chapter: ["Un", "Deux", "Trois", "Quatre", "Cinq"], type: "Examen National", level: ["2ème Bac SM"] },
    "Un titre de document vraiment très long qui déborde largement la limite"
  );
  const pages = enumeratePages([long, make("a")]);

  it("keeps every title inside the 60 characters Google renders", () => {
    for (const p of pages) expect(p.title.length).toBeLessThanOrEqual(60);
  });

  it("keeps every description inside 155 characters", () => {
    for (const p of pages) expect(p.description.length).toBeLessThanOrEqual(155);
  });

  it("summarises a long chapter list instead of dumping it", () => {
    const doc = pages.find((p) => p.path.startsWith("/doc/x/"))!;
    expect(doc.description).toContain("Un, Deux, Trois et 2 autres chapitres");
  });

  it("leaves no double space in a title built from an untidy name", () => {
    const p = enumeratePages([make("y", {}, "Titre  bavard ")]).find((q) => q.path.startsWith("/doc/y/"))!;
    expect(p.title).not.toContain("  ");
  });
});

describe("og:image", () => {
  const items = [make("a")];
  const pages = enumeratePages(items);
  const home = pages.find((p) => p.path === "/")!;
  const doc = pages.find((p) => p.path.startsWith("/doc/a/"))!;

  it("falls back to the brand card on a page with no image of its own", () => {
    const html = injectPage(SHELL, home);
    expect(html).toContain(`<meta property="og:image" content="${DEFAULT_OG_IMAGE.url}">`);
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain('<meta property="og:image:height" content="630">');
    expect(html).toContain('<meta property="og:image:alt"');
  });

  it("gives the wide brand card the large Twitter card", () => {
    expect(injectPage(SHELL, home)).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("asks Drive for a preview wide enough to be a link card", () => {
    expect(doc.ogImage!.url).toContain("sz=w1200");
  });

  it("does not claim large format for a portrait page scan", () => {
    expect(injectPage(SHELL, doc)).toContain('<meta name="twitter:card" content="summary">');
  });

  it("declares no dimensions for an image whose size it does not know", () => {
    const html = injectPage(SHELL, doc);
    expect(html).not.toContain("og:image:width");
  });

  it("uses the brand card when Drive rendered no thumbnail", () => {
    const noThumb = { ...make("n"), thumbnailLink: undefined };
    const p = enumeratePages([noThumb]).find((q) => q.path.startsWith("/doc/n/"))!;
    expect(p.ogImage!.url).toBe(DEFAULT_OG_IMAGE.url);
  });
});

describe("og:type", () => {
  const pages = enumeratePages([make("a")]);

  it("is website for a listing page", () => {
    const home = pages.find((p) => p.path === "/")!;
    expect(injectPage(SHELL, home)).toContain('<meta property="og:type" content="website">');
  });

  it("is article for a document", () => {
    const doc = pages.find((p) => p.path.startsWith("/doc/a/"))!;
    expect(injectPage(SHELL, doc)).toContain('<meta property="og:type" content="article">');
  });
});

describe("the slug-less document alias", () => {
  const pages = enumeratePages([make("a")]);
  const alias = pages.find((p) => p.path === "/doc/a")!;

  it("is emitted, so the URL loads instead of hitting 404.html", () => {
    expect(alias).toBeTruthy();
  });

  it("points its canonical at the real document URL", () => {
    const html = injectPage(SHELL, alias);
    expect(html).toContain(`<link rel="canonical" href="${canonicalUrl("/doc/a/dipole-rc-cours")}">`);
  });

  it("stays out of the sitemap, which must not offer a URL that disowns itself", () => {
    expect(sitemapXml(pages)).not.toContain("<loc>https://pipc.ma/doc/a/</loc>");
  });
});

describe("the prerendered link graph", () => {
  const items = [make("a"), make("b", { chapter: ["Lois de Newton"] }, "Newton")];
  const pages = enumeratePages(items);
  const at = (path: string) => pages.find((p) => p.path === path)!;

  it("lets a crawler reach the level hubs from the home page", () => {
    expect(at("/").body).toContain(`href="/niveau/2eme-bac-sm/"`);
  });

  it("links both browse hubs from the home page", () => {
    expect(at("/").body).toContain(`href="/menu/"`);
    expect(at("/").body).toContain(`href="/examen-national/"`);
  });

  it("gives the menu hub a way down into the per-level menus", () => {
    expect(at("/menu").body).toContain(`href="/menu/2eme-bac-sm/"`);
  });

  it("gives a menu level page real chapter links instead of being a dead end", () => {
    expect(at("/menu/2eme-bac-sm").body).toContain(`href="/niveau/2eme-bac-sm/chapitre/dipole-rc/"`);
  });

  it("links a level page to its chapters", () => {
    expect(at("/niveau/2eme-bac-sm").body).toContain(`href="/niveau/2eme-bac-sm/chapitre/lois-de-newton/"`);
  });

  it("leaves no indexable page without an inbound link from another page", () => {
    const linked = new Set<string>();
    for (const p of pages) {
      for (const m of p.body.matchAll(/href="([^"]+)"/g)) linked.add(m[1]);
    }
    const orphans = pages
      .filter((p) => !p.noindex && !p.canonicalPath && p.path !== "/")
      .filter((p) => !linked.has(`${p.path}/`.replace(/\/+$/, "/")));
    expect(orphans.map((p) => p.path)).toEqual([]);
  });
});
