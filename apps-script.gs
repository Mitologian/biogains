// Google Apps Script: terima data dari index.html dan tulis ke Google Sheet.
// Pasang di Sheet: Extensions > Apps Script. Lalu Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Salin URL /exec ke SHEET_URL di index.html.
// Setelah mengubah file ini: Deploy > Manage deployments > Edit > Version: New version.
var SHEET_NAME = 'Contacts';                         // tab tujuan isian form
var OLD_SHEET_NAMES = ['Contacts Dedy', 'Leads'];    // nama lama. Jika salah satunya ada dan 'Contacts' belum ada, otomatis diganti nama.

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) {}
  if (!(d.name || d.chapter || d.classification)) return ContentService.createTextOutput('empty');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    for (var i = 0; i < OLD_SHEET_NAMES.length && !sh; i++) {
      var old = ss.getSheetByName(OLD_SHEET_NAMES[i]);
      if (old) { old.setName(SHEET_NAME); sh = old; }
    }
    if (!sh) sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Name', 'BNI Chapter', 'Business Classification', 'Lang', 'Source', 'Page']);
  }
  sh.appendRow([new Date(), cell_(d.name), cell_(d.chapter), cell_(d.classification), cell_(d.lang), cell_(d.source), cell_(d.page)]);
  return ContentService.createTextOutput('ok');
}

// Isi yang diawali = + - @ dibaca Sheets sebagai rumus. Tambahkan apostrof supaya jadi teks.
function cell_(v) {
  var s = String(v == null ? '' : v).slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
