/**
 * Post-build prerender. Vite emits a single client-rendered shell; this writes one static
 * HTML file per URL, each carrying real <head> metadata and a semantic content block, so a
 * crawler sees the library without executing JavaScript. Run by vite-node (already present
 * via vitest) so it can import the app's own TypeScript — the join and classification
 * logic here is the same tested code the browser runs, not a second implementation.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchManifest } from "../src/api";
import { buildLibrary } from "../src/lib/manifest";
import { enumeratePages, injectPage, sitemapXml, robotsTxt, type PageMeta } from "../src/lib/seo";

const DIST = join(process.cwd(), "dist");

async function write(relPath: string, contents: string): Promise<void> {
  const full = join(DIST, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents, "utf8");
}

/** "/" -> "index.html", "/menu" -> "menu/index.html". */
function fileFor(path: string): string {
  return path === "/" ? "index.html" : `${path.replace(/^\//, "")}/index.html`;
}

async function main(): Promise<void> {
  const shell = await readFile(join(DIST, "index.html"), "utf8");

  // A shell copy under 404.html is what GitHub Pages serves for an unmatched path. Every
  // real URL is written as a file, so this only ever catches genuine typos.
  await write("404.html", shell);

  let pages: PageMeta[];
  try {
    const raw = await fetchManifest();
    const items = buildLibrary(raw.files, raw.meta);
    pages = enumeratePages(items);

    // The same manifest, emitted as a static file so a first-time visitor with empty
    // localStorage paints from the CDN instead of waiting on the backend. No second
    // fetch: this is the payload we already have in hand.
    await write("library-seed.json", JSON.stringify({ files: raw.files, meta: raw.meta }));
  } catch (err) {
    // A backend hiccup must degrade SEO for one deploy, never break the deploy.
    console.warn("[prerender] manifest fetch failed — emitting the plain shell only:", err);
    return;
  }

  for (const page of pages) {
    await write(fileFor(page.path), injectPage(shell, page));
  }
  await write("sitemap.xml", sitemapXml(pages));
  await write("robots.txt", robotsTxt());

  console.log(`[prerender] wrote ${pages.length} pages, sitemap.xml, robots.txt and 404.html`);
}

await main();
