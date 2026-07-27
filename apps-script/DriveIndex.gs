// Fast folder walk using the Drive Advanced Service (v3): one bulk `files.list`
// per folder instead of many per-file DriveApp calls. Cuts a ~460-file walk from
// ~60s to a few seconds.

function walkFolder(rootId, autoShare) {
  var nodes = [];
  var pathOf = {};
  pathOf[rootId] = [];
  var queue = [rootId];

  while (queue.length) {
    var folderId = queue.shift();
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
          if (autoShare) ensureShared_(f.id);
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
  return nodes;
}

// Best-effort: make a file readable by anyone with the link. Idempotent — if the
// permission already exists Drive throws and we ignore it. Only called from reindex.
function ensureShared_(fileId) {
  try {
    Drive.Permissions.create({ role: 'reader', type: 'anyone' }, fileId);
  } catch (e) {
    // already shared, or not permitted (e.g. shared-drive file) — keep indexing
  }
}
