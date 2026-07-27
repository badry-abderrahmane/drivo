# Backend — Google Apps Script

## One-time setup
1. Create a new Google Sheet (this becomes the metadata store).
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the default `Code.gs`. Create files matching this folder: `Code.gs`,
   `DriveIndex.gs`, `MetadataStore.gs`, and paste each file's contents.
4. **Enable the Drive Advanced Service** (required by the fast folder walk):
   in the editor, click **Services (+)** in the left sidebar → add **Drive API**,
   and make sure its identifier is **`Drive`** with version **v3**. (Free — no GCP
   billing needed.)
5. **Project Settings → Show `appsscript.json`**, then paste `appsscript.json` here
   (it also declares the Drive service and scopes).
6. **Project Settings → Script Properties**, add:
   - `FOLDER_ID` — the Drive folder id (from its URL).
   - `ADMIN_PASSWORD` — the admin password.
   - `AUTO_SHARE` — `true` (default) to auto-share files as anyone-with-link
     viewer, or `false` to manage sharing manually.
7. **Deploy → New deployment → Web app**:
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Deploy, authorize the scopes, and copy the **Web app URL**.
8. **Warm the cache + install the background refresh:** in the editor, select the
   function **`setupTrigger`** from the dropdown and click **Run** once. This walks
   Drive now (filling the cache) and installs a trigger that re-walks every 4 hours,
   so students almost never hit a cold rebuild. Authorize when prompted.

## Wire the frontend
Put the Web app URL into `src/config.ts` (`BACKEND_URL`). See the repo's
top-level plan, Task 8.

## Refresh model
- **Metadata edits** (Admin → Enregistrer): instant. Saving writes the Sheet and
  patches the cache in place, so students see the change on their next load.
- **Direct Drive changes** (adding/removing/renaming files): picked up by the
  background trigger within ~4 hours, or immediately when you click **"Réindexer
  Drive"** in the Admin page.
- The manifest is cached for **6 hours** (CacheService max) and kept warm by the
  4-hourly `refreshCache` trigger, so cold rebuilds are rare.

To change the refresh cadence, edit `everyHours(4)` in `setupTrigger` (Code.gs)
and re-run `setupTrigger`.

## Sharing model
Sharing is applied to the **root folder once** (anyone-with-link viewer); every
file and subfolder inside inherits it, including files added later. So indexing
makes one sharing API call regardless of how many files there are — no per-file
sharing, and new files are viewable without a reindex.

## Scale note
The folder walk uses the Drive Advanced Service (bulk `files.list`, one call per
folder) plus a single folder-share call, so indexing stays fast (seconds) into the
thousands of files. Only if the number of *folders* grows very large would a walk
approach the 6-minute execution limit; if that ever happens, page the walk across
multiple trigger runs.
