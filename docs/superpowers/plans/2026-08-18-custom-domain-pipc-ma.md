# Custom Domain (pipc.ma) Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement the code tasks (Part B) task-by-task. Parts A, C and D are manual operator steps performed in a browser and a terminal — an agent cannot do them. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the app at `https://pipc.ma/` instead of `https://badry-abderrahmane.github.io/drivo/`, with `www.pipc.ma` redirecting to the apex and every prerendered URL, canonical, sitemap entry and asset path pointing at the new root.

**Architecture:** Two coordinated halves. DNS + GitHub Pages configuration point the domain at the existing Pages deployment (Parts A and C, manual). The build stops emitting the `/drivo/` sub-path (Part B, code). Doing only the first serves the app with every asset URL broken; doing only the second breaks the current github.io URL. The order below makes the unavoidable broken window fall on the URL being abandoned rather than on the new domain.

**Tech Stack:** Cloudflare DNS (free plan, records DNS-only), GitHub Pages with Actions-based deploy (`.github/workflows/deploy.yml`), Vite 5, vue-router 4, Vitest 2.

**Spec:** No separate spec. This plan supersedes an earlier draft that was written against a pre-prerender snapshot of the repo; the corrections it embeds are described in Part B, Task 1.

## Global Constraints

- **Domain:** `pipc.ma`, apex canonical (`https://pipc.ma/`), `www` redirecting to it.
- **Registrar:** a `.ma` registrar. Cloudflare Registrar does not sell `.ma`, so the domain stays where it is; only nameservers move.
- **Every Cloudflare record in this plan is `DNS only` (grey cloud).** GitHub terminates TLS itself.
- **`SITE_URL` is the single source of truth for both origin and base path.** After this migration `src/lib/seo.ts` must derive its base path from it, never restate `/drivo` or `pipc.ma`.
- **`SITE_URL` keeps its trailing slash** — `absoluteUrl()` joins against it.
- **Do not toggle the custom domain off and on** while a certificate is pending; that restarts issuance.
- Run the full suite with `npm test`, a single file with `npx vitest run <path>`, type-check with `npx vue-tsc --noEmit`.
- Current state at the time of writing: `main` at `f1860fb`, 300 tests passing, 653 prerendered pages.

---

## Order of operations, and why

1. **Part A — DNS (manual).** Nameservers and records must be live *before* anything else, because GitHub's domain check and its certificate issuance both read public DNS.
2. **Part B — code (agent or you).** Push the base-path change and let it deploy. During this window `badry-abderrahmane.github.io/drivo/` is broken: its HTML now points at `/assets/…` while Pages still serves it under `/drivo/`. That is expected and temporary.
3. **Part C — Pages custom domain (manual).** Saving the domain makes `pipc.ma` serve the already-correct build, so the new domain is right from its very first request — including the first request a crawler makes.
4. **Part D — verification.**

The earlier draft of this plan did Part C before Part B, which puts the broken window on `pipc.ma` instead. Both orders have a window; this one spends it on the URL you are abandoning.

**One caveat that decides nothing but is worth knowing:** with Actions-based deploys, a `CNAME` file in the published artifact may itself set the custom domain. If it does, Part B's deploy performs Part C for you and there is no broken window at all. Either way Part A must be finished first, and Part C's HTTPS step still applies.

---

## Part A — Cloudflare DNS (manual)

### A1. Add the zone

- [ ] **Step 1: Create the site in Cloudflare**

Cloudflare dashboard → **Add a site** → `pipc.ma` → **Free** plan.

Cloudflare scans the domain's current DNS and imports what it finds. **Review that import before continuing.** If the domain already carries email, its `MX` records and any SPF/DKIM/DMARC `TXT` records must survive the move — losing them silently breaks mail, and it is the single most common casualty of a nameserver change. If the domain currently shows a registrar parking page, delete the `A`/`AAAA` records pointing at it; they would compete with GitHub's.

- [ ] **Step 2: Check for CAA records**

In the imported records, look for any record of type `CAA`. If none exist, nothing to do — any certificate authority is permitted by default.

If CAA records **do** exist, at least one must authorise Let's Encrypt, or GitHub's certificate request will fail with no obvious error:

```
Type: CAA   Name: @   Flags: 0   Tag: issue   Value: letsencrypt.org
```

This is worth checking now rather than debugging later: a missing CAA authorisation looks identical to "the certificate is just taking a while".

### A2. Repoint the nameservers

- [ ] **Step 3: Copy Cloudflare's two nameservers**

Cloudflare shows two, of the form `xxx.ns.cloudflare.com`.

- [ ] **Step 4: Set them at the `.ma` registrar**

In the registrar's control panel, replace **all** existing nameservers with Cloudflare's two. This is done at the registrar, not in Cloudflare — Cloudflare cannot change delegation for a domain it does not sell.

- [ ] **Step 5: Wait for the zone to go Active**

Propagation is usually minutes, occasionally a few hours. Cloudflare emails you when the zone is active, and the dashboard shows **Active** rather than *Pending nameserver update*.

**Do not continue to A3 until the zone is Active.** Records created in a pending zone are real but nothing resolves them yet, which makes every later check ambiguous.

### A3. Create the records

- [ ] **Step 6: Add the apex and www records**

DNS tab → Add record, for each row below. **Proxy status must be `DNS only` (grey cloud) on every one.**

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| AAAA | `@` | `2606:50c0:8000::153` | DNS only |
| AAAA | `@` | `2606:50c0:8001::153` | DNS only |
| AAAA | `@` | `2606:50c0:8002::153` | DNS only |
| AAAA | `@` | `2606:50c0:8003::153` | DNS only |
| CNAME | `www` | `badry-abderrahmane.github.io` | DNS only |

The four `A` addresses are GitHub Pages' documented apex servers; all four are listed so the apex survives one of them being unavailable. The `AAAA` records are optional but free, and let IPv6-only mobile networks reach the site directly. The `www` `CNAME` points at the *account* host with no `/drivo` path — a CNAME cannot carry a path, which is precisely why the base-path change in Part B is required rather than optional.

**Why grey cloud matters:** with the proxy off, Cloudflare answers DNS and nothing else. Its SSL/TLS mode, "Always Use HTTPS", and page rules are not in the request path at all, so none of them can conflict with GitHub's own certificate and redirects — the classic cause of infinite redirect loops on Pages custom domains. If you later want Cloudflare's CDN or WAF, finish this entire plan first, confirm GitHub's certificate is issued and `https://pipc.ma/` loads, and only then flip to orange cloud **and** set SSL/TLS mode to **Full (strict)** in the same sitting.

- [ ] **Step 7: Confirm the records resolve**

```bash
dig +short pipc.ma A
dig +short pipc.ma AAAA
dig +short www.pipc.ma CNAME
```

Expected: the four GitHub IPv4 addresses, the four IPv6 addresses, and `badry-abderrahmane.github.io.`

If `dig` returns nothing, the zone is not active yet or the records were saved on a different zone. Do not proceed.

---

## Part B — Drop the `/drivo/` base path (code)

### Task 1: Derive the base path from `SITE_URL`

This is the task the earlier draft of this plan missed, and it is the one that matters. `src/lib/seo.ts` hardcodes `/drivo` in two places that the obvious three edits (`vite.config.ts`, `src/router.ts`, `src/config.ts`) do not touch:

- `src/lib/seo.ts:58` builds every internal link in the 653 prerendered pages. Left alone, those pages would ship links to `https://pipc.ma/drivo/doc/…`, which 404 — a crawler would reach real pages via the sitemap and then hit a dead end on every link, losing exactly the crawl graph the prerender exists to provide.
- `src/lib/seo.ts:276` writes `Disallow: /drivo/admin` into `robots.txt`, which would stop protecting `/admin` and disallow a path that no longer exists.

Deriving both from `SITE_URL` makes this migration a one-line change and prevents the same drift next time.

**Files:**
- Modify: `src/lib/seo.ts:56-59` (the `href` helper), `src/lib/seo.ts:276` (`robotsTxt`)
- Modify: `src/lib/seo.test.ts`

**Interfaces:**
- Consumes: `SITE_URL` from `src/config.ts`.
- Produces: `basePathOf(siteUrl: string): string` — `""` for a root-hosted site, `"/drivo"` for a project site.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/seo.test.ts`, and extend the import on line 2 to include `basePathOf`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — `basePathOf is not a function`.

- [ ] **Step 3: Implement the derivation**

In `src/lib/seo.ts`, replace the `href` helper (currently lines 56-59):

```ts
/**
 * The site's path prefix, derived from SITE_URL rather than restated: "" when the site is
 * served at a domain root, "/drivo" for a GitHub project site. Deriving it means moving
 * the site to another host or path is a one-line change to SITE_URL, and cannot leave
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
```

- [ ] **Step 4: Derive the robots.txt disallow too**

Replace the body of `robotsTxt` (currently line 276):

```ts
  return `User-agent: *\nAllow: /\nDisallow: ${BASE_PATH}/admin\n\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`;
```

- [ ] **Step 5: Run the seo tests**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS. `SITE_URL` is still the github.io URL at this point, so `BASE_PATH` is still `"/drivo"` and every pre-existing assertion holds unchanged. That is the point of doing this task first: it is a pure refactor with the domain switch still ahead of it.

- [ ] **Step 6: Run the full suite and type-check**

Run: `npm test && npx vue-tsc --noEmit`
Expected: PASS, 303 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "refactor: derive the SEO base path from SITE_URL"
```

### Task 2: Point the build, the router and the metadata at the new root

**Files:**
- Create: `public/CNAME`
- Modify: `vite.config.ts:6`, `src/router.ts:12`, `src/config.ts:6`
- Modify: `src/lib/seo.test.ts` (the assertions that name the old origin)
- Modify: `README.md`

**Interfaces:**
- Consumes: `basePathOf` from Task 1.
- Produces: no new exports. `SITE_URL` becomes `"https://pipc.ma/"`, so `BASE_PATH` becomes `""`.

- [ ] **Step 1: Update the test expectations first**

These are the nine assertions in `src/lib/seo.test.ts` that name the old origin or base. Updating them before the source is what makes the next step's failure meaningful.

Line 37: `expect(canonicalUrl("/doc/a/titre")).toBe("https://pipc.ma/doc/a/titre/");`
Line 41: `expect(canonicalUrl("/")).toBe("https://pipc.ma/");`
Line 47: `expect(absoluteUrl("/menu")).toBe("https://pipc.ma/menu");`
Line 51: `expect(absoluteUrl("/")).toBe("https://pipc.ma/");`
Line 95: `expect(sitemapXml(enumeratePages(items))).not.toContain("pipc.ma/admin");`
Line 127: `expect(doc?.body).toContain('href="/doc/b/dipole-rc-exercices/"');`
Line 168: `expect(xml).toContain("<loc>https://pipc.ma/</loc>");`
Line 177: `expect(out).not.toContain("pipc.ma/x/");`
Line 189: `expect(out).toContain("Disallow: /admin");`

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — the assertions above, because `SITE_URL` still names github.io.

- [ ] **Step 3: Change `SITE_URL`**

`src/config.ts:6`:

```ts
export const SITE_URL = "https://pipc.ma/";
```

- [ ] **Step 4: Run the seo tests**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS. Nothing else in `seo.ts` changes — `BASE_PATH` is now `""` because Task 1 derives it.

- [ ] **Step 5: Change the Vite base**

`vite.config.ts:6`:

```ts
  base: "/",
```

- [ ] **Step 6: Change the router base**

`src/router.ts:12`:

```ts
  history: createWebHistory("/"),
```

- [ ] **Step 7: Add the CNAME file**

```bash
mkdir -p public
printf 'pipc.ma\n' > public/CNAME
```

Vite copies everything in `public/` verbatim into `dist/`, so the Actions artifact carries it. With Actions-based deploys the domain primarily lives in the Pages settings, but this file keeps the domain attached if that setting is ever reset — and may set it in the first place.

- [ ] **Step 8: Update the README**

`README.md:26` — the dev URLs, which also still show the removed hash router:

```
npm run dev      # browse http://localhost:5173/  ·  admin http://localhost:5173/admin
```

`README.md:41-42`:

```
- Browse: `https://pipc.ma/`
- Admin:  `https://pipc.ma/admin`
```

And the sentence below them currently reads "a Vue 3 + Vuetify single-page app (hash-routed); admin is the `#/admin` route". That has been wrong since the routing change; replace with:

```
The frontend is a Vue 3 + Vuetify single-page app served from prerendered
static HTML; admin is the `/admin` route, not a separate page.
```

- [ ] **Step 9: Confirm no `/drivo/` base reference survives**

```bash
grep -rn "drivo" src/ vite.config.ts index.html README.md | grep -v "drivo:manifest" | grep -v "drivo:admin_pw"
```

Expected: **no output.** The two excluded patterns are `localStorage`/`sessionStorage` keys (`src/lib/cache.ts:14`, `src/lib/adminAuth.ts:3`) which are internal names, not URLs, and must NOT be renamed — changing them would silently invalidate every returning visitor's cache and log the admin out.

- [ ] **Step 10: Run the full suite and type-check**

Run: `npm test && npx vue-tsc --noEmit`
Expected: PASS, 303 tests.

- [ ] **Step 11: Build and inspect the output**

```bash
rm -rf dist && npm run build
cat dist/CNAME
grep -o '/assets/[^"]*' dist/index.html | head -3
grep -o '<link rel="canonical"[^>]*>' "$(find dist/doc -name index.html | head -1)"
grep -o 'href="/doc/[^"]*"' "$(find dist/doc -name index.html | head -1)" | head -2
head -4 dist/sitemap.xml | tail -2
cat dist/robots.txt
```

Expected: `CNAME` contains `pipc.ma`; asset paths start `/assets/` with no `/drivo`; the canonical is `https://pipc.ma/doc/…/`; internal links start `/doc/` with no `/drivo`; sitemap `<loc>`s are `https://pipc.ma/…`; robots disallows `/admin` and points at `https://pipc.ma/sitemap.xml`.

The build's prerender step calls the Apps Script backend. If it prints `[prerender] manifest fetch failed`, the build still exits 0 but emits **no** prerendered pages — re-run it when the backend is reachable rather than shipping an empty shell.

- [ ] **Step 12: Preview locally**

```bash
npm run preview
```

Open `http://localhost:4173/` — the app should load with no `/drivo` anywhere. Check a deep link **with a trailing slash**, e.g. `http://localhost:4173/niveau/2eme-bac-sm/`; `vite preview` does not perform the trailing-slash redirect a static host does, so the bare path falls through to the SPA shell and looks wrong even when it is correct. Stop the server.

- [ ] **Step 13: Commit and push**

```bash
git add -A
git commit -m "feat: serve the app from the pipc.ma root instead of the /drivo/ sub-path"
git push origin main
```

Pushing to `main` triggers the deploy. **From here until Part C completes, `badry-abderrahmane.github.io/drivo/` is broken** — its HTML asks for `/assets/…` while Pages still serves it under `/drivo/`. That is expected. Watch the Actions run finish, and confirm its log contains `[prerender] wrote NNN pages`.

---

## Part C — GitHub Pages custom domain (manual)

- [ ] **Step 1: Set the custom domain**

Repo → **Settings** → **Pages** → **Custom domain** → enter `pipc.ma` → **Save**.

GitHub immediately runs a DNS check against the records from Part A. It passes once the apex `A` records resolve. If it fails, re-run `dig +short pipc.ma A` — a failure here is always DNS, never the repo.

If the field already shows `pipc.ma`, the `CNAME` file from Part B set it during the deploy. Nothing to do; continue.

- [ ] **Step 2: Wait for the certificate**

Once the check passes, GitHub requests a Let's Encrypt certificate for the domain. **Enforce HTTPS stays greyed out until it is issued** — typically about 15 minutes, occasionally up to 24 hours.

There is nothing to do but wait. Specifically: **do not** toggle the domain off and on to "retry", which discards progress and restarts issuance from zero. If it is still pending after 24 hours, that is when to suspect a `CAA` record (Part A, Step 2) or a record still on orange cloud.

- [ ] **Step 3: Enable Enforce HTTPS**

When the checkbox becomes available, tick it. This makes GitHub redirect `http://pipc.ma/…` to `https://pipc.ma/…`.

- [ ] **Step 4: Confirm the old URL redirects**

With the custom domain set, GitHub redirects `badry-abderrahmane.github.io/drivo/*` to `pipc.ma/*`, so links already shared keep working and search engines transfer the old URLs to the new ones. Verify in Part D.

---

## Part D — Verification (manual)

- [ ] **Step 1: DNS and certificate**

```bash
dig +short pipc.ma A
dig +short www.pipc.ma CNAME
curl -sSI https://pipc.ma/ | head -n 5
```

Expected: GitHub's four IPs; `badry-abderrahmane.github.io.`; `HTTP/2 200` with no certificate warning.

- [ ] **Step 2: Redirects**

```bash
curl -sSI https://www.pipc.ma/ | head -n 5
curl -sSI https://badry-abderrahmane.github.io/drivo/ | head -n 5
curl -sSI http://pipc.ma/ | head -n 5
```

Expected: each a `301` — `www` to the apex, the github.io URL to `pipc.ma`, and plain HTTP to HTTPS (the last only after Enforce HTTPS is on).

- [ ] **Step 3: Assets and prerendered pages**

```bash
curl -s https://pipc.ma/ | grep -o '/assets/[^"]*' | head -3
curl -s https://pipc.ma/niveau/2eme-bac-sm/ | grep -o "<title>[^<]*</title>"
curl -s https://pipc.ma/sitemap.xml | head -4 | tail -2
curl -s https://pipc.ma/robots.txt
curl -s -o /dev/null -w "%{http_code}\n" https://pipc.ma/niveau/inexistant-xyz/
```

Expected: asset paths with no `/drivo`; the level page's own title, not the site default (proving the prerendered file is being served rather than the SPA fallback); sitemap `<loc>`s on `pipc.ma`; robots disallowing `/admin`; and `404` for the nonsense path.

- [ ] **Step 4: In a browser**

Load `https://pipc.ma/`. Confirm the lock icon, that no request in the network tab 404s, that the library renders (the Apps Script `BACKEND_URL` is unchanged and unaffected by the domain), and that `/admin` still gates on the password.

- [ ] **Step 5: Search Console**

Add `pipc.ma` as a new property and submit `https://pipc.ma/sitemap.xml`. Keep the github.io property: GitHub's 301s transfer the old URLs, and leaving both verified lets you watch the handover. Since the github.io URLs are only days old, very little index history is at stake.

---

## Rollback

If something is wrong and you need the old URL back immediately: clear the custom domain in **Settings → Pages**, then revert the Part B commit and push.

```bash
git revert --no-edit <part-B-commit-sha>
git push origin main
```

That restores `base: "/drivo/"`, the router base, `SITE_URL` and the README, and removes `public/CNAME`. The site returns to `badry-abderrahmane.github.io/drivo/` once the deploy finishes. Cloudflare records can stay — they are inert while no GitHub Pages site claims the domain.

## Done means

- `https://pipc.ma/` serves the app over HTTPS with a valid certificate and no broken assets.
- `https://www.pipc.ma/` and `https://badry-abderrahmane.github.io/drivo/` both 301 to it.
- A deep link such as `https://pipc.ma/niveau/2eme-bac-sm/` returns its own prerendered title.
- `sitemap.xml` and every canonical name `pipc.ma`; `robots.txt` disallows `/admin`.
- `npm test` passes (303 tests) and `npx vue-tsc --noEmit` is clean.
- `grep -rn "drivo" src/ vite.config.ts index.html README.md` returns only the two storage keys.
