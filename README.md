# Drivo — Bibliothèque Physique

Static GitHub Pages site previewing a Google Drive folder of Moroccan physics
course material (cours, exercices, examens), organized by custom metadata, with a
password-gated admin editor.

- **Frontend:** Vite + TypeScript (`src/`), deployed to GitHub Pages by
  `.github/workflows/deploy.yml`.
- **Backend:** Google Apps Script + Google Sheet (`apps-script/`). See
  [`apps-script/README.md`](apps-script/README.md) to deploy it.
- **Design & plan:** [`docs/superpowers/`](docs/superpowers/).

## Architecture

The frontend fetches a raw manifest — `{ files, meta }` — from the Apps Script
web app and joins/filters it in the browser (pure, unit-tested logic). The
backend walks the Drive folder (cached ~10 min), stores custom metadata in a
Sheet, checks the admin password server-side, and auto-shares files so students
can open them. No Google API key or secret ships to the browser; the only backend
coordinate in the frontend is the public web-app URL.

## Local dev

```bash
npm install
npm run dev      # browse http://localhost:5173/drivo/  ·  admin http://localhost:5173/drivo/#/admin
npm test
npm run build
```

## Deploy

1. Deploy the backend — follow [`apps-script/README.md`](apps-script/README.md),
   then copy the Web app URL into `BACKEND_URL` in `src/config.ts`.
2. In the GitHub repo: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. Push to `main`; the **Deploy to GitHub Pages** workflow builds and publishes.

## Pages URLs

- Browse: `https://badry-abderrahmane.github.io/drivo/`
- Admin:  `https://badry-abderrahmane.github.io/drivo/#/admin`

The frontend is a Vue 3 + Vuetify single-page app (hash-routed); admin is the
`#/admin` route, not a separate page.
