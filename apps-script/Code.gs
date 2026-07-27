var CACHE_KEY = 'manifest_v1';
var CACHE_TTL_SECONDS = 600; // 10 minutes

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
    CacheService.getScriptCache().remove(CACHE_KEY);
    return json_({ ok: true });
  }
  if (body.action === 'reindex') {
    var fresh = buildManifest_();
    putCache_(fresh);
    return json_({ ok: true, count: fresh.files.length });
  }
  return json_({ ok: false, error: 'unknown_action' });
}

function getManifestCached_() {
  var cached = CacheService.getScriptCache().get(CACHE_KEY);
  if (cached) return JSON.parse(cached);
  var fresh = buildManifest_();
  putCache_(fresh);
  return fresh;
}

function putCache_(payload) {
  try {
    CacheService.getScriptCache().put(CACHE_KEY, JSON.stringify(payload), CACHE_TTL_SECONDS);
  } catch (e) {
    // Payload can exceed the 100 KB cache limit for very large folders; skip caching then.
  }
}

function buildManifest_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  var autoShare = props.getProperty('AUTO_SHARE') !== 'false'; // default on
  return { files: walkFolder(folderId, autoShare), meta: readMeta() };
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
