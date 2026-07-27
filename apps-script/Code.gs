var CACHE_PREFIX = 'manifest_';
var CACHE_META_KEY = 'manifest_meta';
var CACHE_TTL_SECONDS = 600; // 10 minutes
var CHUNK_CHARS = 45000;     // keep each cache value well under the 100 KB per-value limit

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
    writeMeta(body.rows || []);
    clearCache_();
    return json_({ ok: true });
  }
  if (body.action === 'reindex') {
    var fresh = buildManifest_(true); // reindex is the only path that (re)shares files
    putCache_(fresh);
    return json_({ ok: true, count: fresh.files.length });
  }
  return json_({ ok: false, error: 'unknown_action' });
}

function getManifestCached_() {
  var cached = getCachedManifest_();
  if (cached) return cached;
  var fresh = buildManifest_(false); // public GET reads only — never re-shares files
  putCache_(fresh);
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

function clearCache_() {
  var cache = CacheService.getScriptCache();
  var metaVal = cache.get(CACHE_META_KEY);
  var keys = [CACHE_META_KEY];
  if (metaVal) {
    var n = Number(metaVal);
    for (var i = 0; i < n; i++) keys.push(CACHE_PREFIX + i);
  }
  cache.removeAll(keys);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
