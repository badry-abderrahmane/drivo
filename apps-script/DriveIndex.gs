function walkFolder(rootId, autoShare) {
  var nodes = [];
  walk_(DriveApp.getFolderById(rootId), [], nodes, autoShare);
  return nodes;
}

function walk_(folder, path, nodes, autoShare) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (autoShare) ensureShared_(f);
    nodes.push({
      fileId: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      path: path,
      thumbnailLink: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w400',
      webViewLink: f.getUrl(),
      modifiedTime: f.getLastUpdated().toISOString(),
      isFolder: false
    });
  }
  var subs = folder.getFolders();
  while (subs.hasNext()) {
    var sf = subs.next();
    walk_(sf, path.concat([sf.getName()]), nodes, autoShare);
  }
}

function ensureShared_(f) {
  try {
    if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  } catch (e) {
    // Some files (e.g. in a shared drive without permission) can't be reshared; keep indexing.
  }
}
