var CACHE_PREFIX = 'manifest_';
var CACHE_META_KEY = 'manifest_meta';
var CACHE_TTL_SECONDS = 21600; // 6 hours (CacheService maximum)
var CHUNK_CHARS = 45000;       // keep each cache value well under the 100 KB per-value limit

function doGet() {
  return json_(getManifestCached_());
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_json' });
  }
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!expected || body.password !== expected) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  if (body.action === 'save') {
    var rows = body.rows || [];
    writeMeta(rows);
    // Patch the cached manifest's metadata in place instead of clearing it, so the
    // next student is never forced into a cold (slow) rebuild after a metadata edit.
    patchMetaInCache_(rows);
    return json_({ ok: true });
  }
  if (body.action === 'reindex') {
    var fresh = buildManifest_(true); // reindex is the only interactive path that (re)shares files
    putCache_(fresh);
    writeManifestStore_(fresh);
    return json_({ ok: true, count: fresh.files.length });
  }
  return json_({ ok: false, error: 'unknown_action' });
}

// Background refresh — installed as a time-driven trigger (see setupTrigger) so the
// cache is re-walked periodically and students almost never hit a cold rebuild.
function refreshCache() {
  var fresh = buildManifest_(true);
  putCache_(fresh);
  writeManifestStore_(fresh); // keep the durable copy in step with the fast one
}

// Run this ONCE from the Apps Script editor to install the periodic refresh.
function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'refreshCache') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('refreshCache').timeBased().everyHours(4).create();
  refreshCache(); // warm it immediately
}

// Three tiers, cheapest first. A CacheService miss must NOT cost a Drive walk: chunked
// cache entries are lost often (see ManifestStore.gs), and the walk takes ~50s.
function getManifestCached_() {
  var cached = getCachedManifest_();
  if (cached) return cached;

  var stored = readManifestStore_();
  if (stored) {
    putCache_(stored); // refill the fast tier so the next request is ~0.4s again
    return stored;
  }

  var fresh = buildManifest_(false); // public GET reads only — never re-shares files
  putCache_(fresh);
  writeManifestStore_(fresh);
  return fresh;
}

function buildManifest_(allowShare) {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  var autoShare = allowShare && props.getProperty('AUTO_SHARE') !== 'false';
  return { files: walkFolder(folderId, autoShare), meta: readMeta() };
}

// ---- chunked cache: the full manifest exceeds the 100 KB single-value cache limit ----

function getCachedManifest_() {
  var cache = CacheService.getScriptCache();
  var metaVal = cache.get(CACHE_META_KEY);
  if (!metaVal) return null;
  var n = Number(metaVal);
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(CACHE_PREFIX + i);
  var parts = cache.getAll(keys);
  var str = '';
  for (var j = 0; j < n; j++) {
    var piece = parts[CACHE_PREFIX + j];
    if (piece == null) return null; // a chunk expired — treat the whole thing as a miss
    str += piece;
  }
  try { return JSON.parse(str); } catch (e) { return null; }
}

function putCache_(payload) {
  try {
    var str = JSON.stringify(payload);
    var n = Math.ceil(str.length / CHUNK_CHARS);
    var obj = {};
    for (var i = 0; i < n; i++) {
      obj[CACHE_PREFIX + i] = str.substring(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
    }
    obj[CACHE_META_KEY] = String(n);
    CacheService.getScriptCache().putAll(obj, CACHE_TTL_SECONDS);
  } catch (e) {
    // Even chunked this can fail on very large trees; skip caching then (slower, still correct).
  }
}

// Merge saved rows into the manifest's meta array and re-write both tiers, so a metadata
// edit is never lost by falling back to the durable copy after the cache is evicted.
function patchMetaInCache_(rows) {
  if (!rows || !rows.length) return;
  var manifest = getCachedManifest_() || readManifestStore_();
  if (!manifest) return; // both tiers cold — the next GET rebuilds from the sheet anyway
  var byId = {};
  for (var i = 0; i < manifest.meta.length; i++) byId[manifest.meta[i].fileId] = manifest.meta[i];
  for (var j = 0; j < rows.length; j++) {
    var r = rows[j];
    if (byId[r.fileId]) {
      for (var k in r) byId[r.fileId][k] = r[k];
    } else {
      manifest.meta.push(r);
    }
  }
  putCache_(manifest);
  writeManifestStore_(manifest);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
