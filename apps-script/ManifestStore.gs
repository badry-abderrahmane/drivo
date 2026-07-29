// Durable second-tier manifest store.
//
// Why this exists: CacheService is best-effort. The manifest is split across ~6 chunks and
// getCachedManifest_ treats a single missing chunk as a total miss, so there are six
// independent chances per period of losing the whole cache. When that happens the next
// student's doGet pays for a full Drive walk — measured at 49s and 56s in the execution log,
// twice within 25 minutes.
//
// So the manifest is also written to a JSON file in Drive, which does not expire. Read order
// on a page load becomes:
//
//   1. CacheService  (~0.4s)  — normal path
//   2. this Drive file (~1s)  — cache lost a chunk; repopulate cache and serve
//   3. full walk     (~50s)   — only when the file is missing or older than MAX_AGE
//
// That turns the 50s worst case into about a second for everyone, including first-time
// visitors, who the client-side localStorage cache cannot help.

var STORE_FILENAME = 'drivo-manifest.json';
var STORE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // beyond a day, prefer a fresh walk

/** The manifest file, or null. Kept beside the library root so it is easy to find/delete. */
function storeFile_() {
  var folderId = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  var parent = DriveApp.getFolderById(folderId);
  var it = parent.getFilesByName(STORE_FILENAME);
  return it.hasNext() ? it.next() : null;
}

function writeManifestStore_(payload) {
  try {
    var body = JSON.stringify({ savedAt: new Date().getTime(), manifest: payload });
    var existing = storeFile_();
    if (existing) {
      existing.setContent(body);
    } else {
      var folderId = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
      DriveApp.getFolderById(folderId).createFile(STORE_FILENAME, body, MimeType.PLAIN_TEXT);
    }
  } catch (e) {
    // Never let the durable copy break a response; the cache and the walk still work.
    console.warn('writeManifestStore_ failed: ' + e);
  }
}

/** The stored manifest if present and recent enough, else null. */
function readManifestStore_() {
  try {
    var f = storeFile_();
    if (!f) return null;
    var parsed = JSON.parse(f.getBlob().getDataAsString());
    if (!parsed || !parsed.manifest || !parsed.savedAt) return null;
    if (new Date().getTime() - parsed.savedAt > STORE_MAX_AGE_MS) return null;
    return parsed.manifest;
  } catch (e) {
    console.warn('readManifestStore_ failed: ' + e);
    return null;
  }
}
