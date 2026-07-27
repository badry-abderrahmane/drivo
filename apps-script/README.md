# Backend — Google Apps Script

## One-time setup
1. Create a new Google Sheet (this becomes the metadata store).
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the default `Code.gs`. Create files matching this folder: `Code.gs`,
   `DriveIndex.gs`, `MetadataStore.gs`, and paste each file's contents.
4. **Project Settings → Show `appsscript.json`**, then paste `appsscript.json` here.
5. **Project Settings → Script Properties**, add:
   - `FOLDER_ID` — the Drive folder id (from its URL).
   - `ADMIN_PASSWORD` — the admin password.
   - `AUTO_SHARE` — `true` (default) to auto-share files as anyone-with-link
     viewer, or `false` to manage sharing manually.
6. **Deploy → New deployment → Web app**:
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Deploy, authorize the scopes, and copy the **Web app URL**.

## Wire the frontend
Put the Web app URL into `src/config.ts` (`BACKEND_URL`). See the repo's
top-level plan, Task 8.

## Refresh
- The file list is cached ~10 minutes. Use the admin **"Réindexer Drive"** button
  to force an immediate refresh after adding files.

## Scale note
For libraries of many thousands of files, a full reindex may approach the 6-minute
execution limit. If that happens, reindex in batches (process N files per call and
continue on a follow-up trigger). Not needed at course-library scale.
