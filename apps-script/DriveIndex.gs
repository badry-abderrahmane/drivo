// Fast folder walk using the Drive Advanced Service (v3): one bulk `files.list`
// per folder instead of many per-file DriveApp calls.
//
// Sharing: share the ROOT FOLDER once as anyone-with-link viewer. Every file and
// subfolder inside inherits that access — including files added later — so this is a
// single API call regardless of library size (measured ~0.3s vs ~130s per-file).
//
// The walk makes one `files.list` per folder, sequentially. At ~100 folders this is
// ~20s, but it runs only in the background (the 4-hourly refresh trigger) or on a
// manual reindex — never on a student page load, which is served from the warm cache.

function walkFolder(rootId, autoShare) {
  if (autoShare) ensureShared_(rootId); // share root once; descendants inherit

  var t0 = new Date().getTime();
  var nodes = [];
  var folderCount = 0;
  var pathOf = {};
  pathOf[rootId] = [];
  var queue = [rootId];

  while (queue.length) {
    var folderId = queue.shift();
    folderCount++;
    var pageToken = null;
    do {
      var resp = Drive.Files.list({
        q: "'" + folderId + "' in parents and trashed = false",
        fields: "nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)",
        pageSize: 1000,
        pageToken: pageToken,
      });
      var files = resp.files || [];
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          pathOf[f.id] = pathOf[folderId].concat([f.name]);
          queue.push(f.id);
        } else {
          nodes.push({
            fileId: f.id,
            name: f.name,
            mimeType: f.mimeType,
            path: pathOf[folderId],
            thumbnailLink: 'https://drive.google.com/thumbnail?id=' + f.id + '&sz=w400',
            webViewLink: f.webViewLink || ('https://drive.google.com/file/d/' + f.id + '/view'),
            modifiedTime: f.modifiedTime,
            isFolder: false,
          });
        }
      }
      pageToken = resp.nextPageToken;
    } while (pageToken);
  }
  console.log('walk: ' + nodes.length + ' files, ' + folderCount + ' folders, ' +
    (new Date().getTime() - t0) + ' ms');
  return nodes;
}

// Best-effort: grant anyone-with-link viewer access. Idempotent — if the permission
// already exists Drive may throw; we ignore it and keep going.
function ensureShared_(id) {
  try {
    Drive.Permissions.create({ role: 'reader', type: 'anyone' }, id);
  } catch (e) {
    // already shared, or not permitted (e.g. a shared drive) — continue
  }
}
