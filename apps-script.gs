// Google Apps Script: terima data dari index.html dan tulis ke Google Sheet.
// Pasang di Sheet: Extensions > Apps Script. Lalu Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Salin URL /exec ke SHEET_URL di index.html.
var SHEET_NAME = 'Leads';

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) {}
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Name', 'BNI Chapter', 'Business Classification', 'Lang', 'Source', 'Page']);
  }
  sh.appendRow([new Date(), d.name || '', d.chapter || '', d.classification || '', d.lang || '', d.source || '', d.page || '']);
  return ContentService.createTextOutput('ok');
}
