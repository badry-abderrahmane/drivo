var META_HEADERS = ['fileId', 'level', 'type', 'subject', 'chapter', 'title', 'description', 'tags', 'order'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('metadata');
  if (!sh) {
    sh = ss.insertSheet('metadata');
    sh.appendRow(META_HEADERS);
  }
  return sh;
}

function readMeta() {
  var values = getSheet_().getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][0]) continue; // skip rows without a fileId
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[i][c];
    obj.order = Number(obj.order) || 0;
    rows.push(obj);
  }
  return rows;
}

function writeMeta(rows) {
  if (!rows || !rows.length) return;
  var sh = getSheet_();
  var values = sh.getDataRange().getValues();
  var indexByFileId = {}; // fileId -> 1-based row number
  for (var i = 1; i < values.length; i++) indexByFileId[values[i][0]] = i + 1;
  rows.forEach(function (r) {
    var arr = META_HEADERS.map(function (h) { return r[h] != null ? r[h] : ''; });
    if (indexByFileId[r.fileId]) {
      sh.getRange(indexByFileId[r.fileId], 1, 1, META_HEADERS.length).setValues([arr]);
    } else {
      sh.appendRow(arr);
      indexByFileId[r.fileId] = sh.getLastRow();
    }
  });
}
