// Bio GAINS backend (Google Apps Script web app, terikat ke Google Sheet).
// Panduan pasang: lihat SETUP.md. Setelah mengubah file ini: Deploy > Manage deployments > Edit > New version.

// ===== KONFIGURASI =====
var CLIENT_ID = '';            // Google OAuth Web Client ID (sama dengan clientId di config.js)
var REGISTRATION = 'invite';   // 'invite' = butuh kode undangan, 'open' = siapa saja boleh daftar (tanpa chapter)
var AUTO_APPROVE = true;       // true = profil otomatis masuk dashboard chapter saat pertama kali publish
var LEGACY_SHEET = 'Leads';    // tab tujuan untuk halaman utama lama (tanpa slug)

var PROFILE_COLS = ['slug', 'email', 'name', 'chapter_id', 'chapter', 'role', 'classification', 'tagline', 'photo', 'contacts_tab', 'public', 'status', 'created_at', 'updated_at', 'published_at', 'data', 'published'];
var INVITE_COLS = ['code', 'chapter_id', 'note', 'used_by', 'used_at'];
var CHAPTER_COLS = ['id', 'name'];
var CONTACT_COLS = ['Timestamp', 'Name', 'BNI Chapter', 'Business Classification', 'Lang', 'Source', 'Page'];
var RESERVED = ['admin', 'editor', 'studio', 'dashboard', 'directory', 'register', 'login', 'api', 'index', 'img', 'config', 'template', 'data', 'cheatsheet', 'www', 'null', 'undefined'];
var MAX_JSON = 45000;          // batas satu sel Google Sheet adalah 50.000 karakter
var MAX_UPLOAD_B64 = 1800000;  // sekitar 1,3 MB per foto (browser sudah memperkecil dulu)
var MAX_FILES_PER_USER = 40;
var IMG_FOLDER = 'BioGAINS Photos';

// ===== ENTRY POINT =====
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'profile') return json_(getProfile_(String(p.u || '').toLowerCase()));
    return json_({ ok: true, service: 'biogains' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) {}
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    if (!d.action) return legacyLead_(d); // format lama dari index.html versi sebelumnya
    var out;
    switch (d.action) {
      case 'me': out = me_(d); break;
      case 'register': out = register_(d); break;
      case 'save': out = save_(d); break;
      case 'publish': out = publish_(d); break;
      case 'upload': out = upload_(d); break;
      case 'chapter': out = chapter_(d); break;
      case 'contact': out = contact_(d); break;
      default: out = { ok: false, error: 'unknown_action' };
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ===== ADMIN (jalankan manual dari editor Apps Script) =====
function setup() {
  table_('Profiles', PROFILE_COLS);
  table_('Invites', INVITE_COLS);
  table_('Chapters', CHAPTER_COLS);
}

// Contoh: createChapter('grow', 'BNI GROW · Jakarta Barat')
function createChapter(id, name) {
  id = String(id || '').toLowerCase().trim();
  if (!/^[a-z0-9-]{2,30}$/.test(id) || !name) throw new Error('id (huruf kecil/angka/minus) dan name wajib diisi');
  var t = table_('Chapters', CHAPTER_COLS);
  for (var i = 0; i < t.rows.length; i++) if (String(t.rows[i].id) === id) throw new Error('Chapter sudah ada: ' + id);
  t.sh.appendRow(rowFrom_(t.head, { id: id, name: name }));
}

// Contoh: createInvites(5, 'Batch 1', 'grow'). Kode muncul di tab Invites dan di Logs.
function createInvites(n, note, chapterId) {
  chapterId = String(chapterId || '').toLowerCase().trim();
  if (!chapterName_(chapterId)) throw new Error('Chapter belum ada. Jalankan createChapter dulu: ' + chapterId);
  var t = table_('Invites', INVITE_COLS);
  var made = [];
  for (var i = 0; i < (n || 1); i++) {
    var code = 'BG-' + randomCode_(6);
    t.sh.appendRow(rowFrom_(t.head, { code: code, chapter_id: chapterId, note: note || '' }));
    made.push(code);
  }
  Logger.log(made.join('\n'));
  return made;
}

// ===== HANDLER =====
// Halaman publik hanya menampilkan versi yang sudah dipublish.
function getProfile_(slug) {
  if (!/^[a-z0-9-]{2,30}$/.test(slug)) return { ok: false, error: 'not_found' };
  var cache = CacheService.getScriptCache();
  var hit = cache.get('p:' + slug);
  if (hit) return JSON.parse(hit);
  var row = findProfile_('slug', slug);
  if (!row || String(row.status || 'active') === 'blocked') return { ok: false, error: 'not_found' };
  if (!row.published) return { ok: false, error: 'not_published' };
  var out = { ok: true, slug: row.slug, name: row.name, data: JSON.parse(row.published) };
  try { cache.put('p:' + slug, JSON.stringify(out), 300); } catch (err) {}
  return out;
}

function me_(d) {
  var email = verify_(d.idToken);
  var row = findProfile_('email', email);
  if (!row) return { ok: true, registered: false, email: email, registration: REGISTRATION };
  return {
    ok: true, registered: true, email: email, slug: row.slug, name: row.name,
    chapter: row.chapter_id ? chapterName_(row.chapter_id) : '',
    status: String(row.status || 'active'),
    published: !!row.published, published_at: row.published_at ? String(row.published_at) : '',
    pending: String(row.data || '') !== String(row.published || ''),
    data: JSON.parse(row.data || '{}')
  };
}

function register_(d) {
  var email = verify_(d.idToken);
  if (findProfile_('email', email)) return { ok: false, error: 'already_registered' };

  var slug = String(d.slug || '').toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug) || RESERVED.indexOf(slug) >= 0) return { ok: false, error: 'bad_slug' };
  if (findProfile_('slug', slug)) return { ok: false, error: 'slug_taken' };

  var invites = table_('Invites', INVITE_COLS);
  var inv = null, cid = '';
  if (REGISTRATION !== 'open') {
    var code = String(d.invite || '').trim().toUpperCase();
    invites.rows.forEach(function (r) {
      if (code && String(r.code).toUpperCase() === code && !r.used_by) inv = r;
    });
    if (!inv) return { ok: false, error: 'bad_invite' };
    cid = String(inv.chapter_id || '');
    if (!chapterName_(cid)) return { ok: false, error: 'invite_no_chapter' };
  }

  var name = cleanStr_(d.name || '').trim().slice(0, 60);
  if (!name) return { ok: false, error: 'name_required' };

  var data = sanitizeData_(d.data || {});
  data.hero = data.hero || {};
  data.hero.name = name;
  data.bni = data.bni || {};
  data.bni.chapter = cid ? chapterName_(cid) : '';

  var json = JSON.stringify(data);
  if (json.length > MAX_JSON) return { ok: false, error: 'too_large' };

  var tab = contactsTabName_(name, slug);
  sheet_(tab, CONTACT_COLS);

  var now = new Date();
  var profiles = table_('Profiles', PROFILE_COLS);
  profiles.sh.appendRow(rowFrom_(profiles.head, {
    slug: slug, email: email, name: cell_(name), chapter_id: cid, chapter: cell_(data.bni.chapter),
    contacts_tab: tab, public: '', status: 'active', created_at: now, updated_at: now, data: json, published: ''
  }));
  if (inv) {
    setCell_(invites, inv._row, 'used_by', email);
    setCell_(invites, inv._row, 'used_at', now);
  }
  return { ok: true, slug: slug };
}

// Simpan draf. Halaman publik tidak berubah sampai publish.
function save_(d) {
  var email = verify_(d.idToken);
  var row = findProfile_('email', email);
  if (!row) return { ok: false, error: 'not_registered' };
  if (String(row.status || 'active') === 'blocked') return { ok: false, error: 'blocked' };
  var json = JSON.stringify(prepare_(d.data, row));
  if (json.length > MAX_JSON) return { ok: false, error: 'too_large' };
  var t = table_('Profiles', PROFILE_COLS);
  setCell_(t, row._row, 'updated_at', new Date());
  setCell_(t, row._row, 'data', json);
  return { ok: true, pending: json !== String(row.published || '') };
}

// Simpan lalu terbitkan: versi lama di halaman publik diganti, dan data untuk dashboard chapter diperbarui.
function publish_(d) {
  var email = verify_(d.idToken);
  var row = findProfile_('email', email);
  if (!row) return { ok: false, error: 'not_registered' };
  if (String(row.status || 'active') === 'blocked') return { ok: false, error: 'blocked' };
  var data = prepare_(d.data, row);
  var json = JSON.stringify(data);
  if (json.length > MAX_JSON) return { ok: false, error: 'too_large' };

  var t = table_('Profiles', PROFILE_COLS);
  var hero = data.hero || {}, bni = data.bni || {}, now = new Date();
  setCell_(t, row._row, 'name', cell_(String(hero.name || row.name).slice(0, 60)));
  setCell_(t, row._row, 'chapter', cell_(String(bni.chapter || '').slice(0, 80)));
  setCell_(t, row._row, 'role', cell_(String(hero.role_id || hero.role_en || '').replace(/<[^>]*>/g, '').slice(0, 100)));
  setCell_(t, row._row, 'classification', cell_(String(bni.klasifikasi_id || bni.klasifikasi_en || '').slice(0, 120)));
  setCell_(t, row._row, 'tagline', cell_(String(hero.tagline_id || hero.tagline_en || '').replace(/<[^>]*>/g, '').slice(0, 160)));
  setCell_(t, row._row, 'photo', (data.images && (data.images.cover || data.images.hero)) || '');
  setCell_(t, row._row, 'updated_at', now);
  setCell_(t, row._row, 'published_at', now);
  setCell_(t, row._row, 'data', json);
  setCell_(t, row._row, 'published', json);
  if (AUTO_APPROVE && String(row.public) === '') setCell_(t, row._row, 'public', true);
  CacheService.getScriptCache().remove('p:' + row.slug);
  return { ok: true, slug: row.slug };
}

function upload_(d) {
  var email = verify_(d.idToken);
  var row = findProfile_('email', email);
  if (!row) return { ok: false, error: 'not_registered' };
  var mime = String(d.mime || '');
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) return { ok: false, error: 'bad_type' };
  var b64 = String(d.b64 || '');
  if (!b64 || b64.length > MAX_UPLOAD_B64) return { ok: false, error: 'too_large' };

  var root = folder_(DriveApp.getRootFolder(), IMG_FOLDER);
  var mine = folder_(root, row.slug);
  var n = 0, it = mine.getFiles();
  while (it.hasNext()) { it.next(); n++; }
  if (n >= MAX_FILES_PER_USER) return { ok: false, error: 'too_many_files' };

  var ext = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg');
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, row.slug + '_' + Date.now() + '.' + ext);
  var file = mine.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' };
}

// Dashboard chapter: hanya anggota terdaftar yang bisa melihat, dan hanya anggota chapter yang sama.
function chapter_(d) {
  var email = verify_(d.idToken);
  var me = findProfile_('email', email);
  if (!me) return { ok: true, registered: false, email: email };
  if (String(me.status || 'active') === 'blocked') return { ok: false, error: 'blocked' };
  var cid = String(me.chapter_id || '');
  if (!cid) return { ok: false, error: 'no_chapter' };
  var t = table_('Profiles', PROFILE_COLS), members = [];
  t.rows.forEach(function (r) {
    if (String(r.chapter_id) !== cid || !isTrue_(r.public) || !r.published) return;
    if (String(r.status || 'active') === 'blocked') return;
    members.push({ slug: r.slug, name: r.name, role: r.role, classification: r.classification, tagline: r.tagline, photo: r.photo });
  });
  members.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  return { ok: true, registered: true, self: me.slug, chapter: { id: cid, name: chapterName_(cid) }, members: members };
}

// Dari form WhatsApp di halaman profil seseorang: tulis ke tab Contacts miliknya.
function contact_(d) {
  var slug = String(d.owner || '').toLowerCase();
  var row = findProfile_('slug', slug);
  if (!row || !row.contacts_tab) return { ok: false, error: 'not_found' };
  appendContact_(sheet_(row.contacts_tab, CONTACT_COLS), d);
  return { ok: true };
}

function legacyLead_(d) {
  if (!(d.name || d.chapter || d.classification)) return json_({ ok: false, error: 'empty' });
  appendContact_(sheet_(LEGACY_SHEET, CONTACT_COLS), d);
  return json_({ ok: true });
}

function appendContact_(sh, d) {
  sh.appendRow([
    new Date(), cell_(d.name), cell_(d.chapter), cell_(d.classification),
    cell_(d.lang), cell_(d.source), cell_(d.page)
  ]);
}

// Bersihkan data dan paksa nama chapter sesuai keanggotaan resmi.
function prepare_(raw, row) {
  var data = sanitizeData_(raw);
  data.bni = data.bni || {};
  if (row.chapter_id) data.bni.chapter = chapterName_(row.chapter_id) || data.bni.chapter || '';
  return data;
}

// ===== AUTH =====
// Memverifikasi ID token Google (tanda tangan dan kedaluwarsa diperiksa oleh Google).
function verify_(token) {
  if (!token || !CLIENT_ID) throw new Error('auth');
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('auth');
  var t = JSON.parse(r.getContentText());
  if (t.aud !== CLIENT_ID || String(t.email_verified) !== 'true' || !t.email) throw new Error('auth');
  return String(t.email).toLowerCase();
}

// ===== SANITASI =====
// Teks profil dirender lewat innerHTML di index.html, jadi hanya <em>, <mark>, <b> yang boleh lolos.
var URL_RE = /^(?:img\/[\w.\-\/]{1,100}|https:\/\/drive\.google\.com\/thumbnail\?id=[\w-]{10,80}(?:&sz=w\d{3,4})?|https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]{10,80}(?:=w\d{3,4})?)$/;

function cleanStr_(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/<(?!\/?(?:em|mark|b)>)/gi, '&lt;')
    .slice(0, 2000);
}

function cleanUrl_(s) {
  s = String(s == null ? '' : s).trim();
  return URL_RE.test(s) ? s : '';
}

function walk_(v, depth) {
  if (depth > 6) return '';
  if (typeof v === 'string') return cleanStr_(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.slice(0, 80).map(function (x) { return walk_(x, depth + 1); });
  if (v && typeof v === 'object') {
    var o = {};
    Object.keys(v).slice(0, 100).forEach(function (k) {
      if (/^\w{1,40}$/.test(k) && k !== '__proto__' && k !== 'constructor' && k !== 'prototype') o[k] = walk_(v[k], depth + 1);
    });
    return o;
  }
  return '';
}

function sanitizeData_(d) {
  var o = walk_(d, 0);
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('bad_data');
  var urls = function (a) { return (Array.isArray(a) ? a : []).map(cleanUrl_).filter(Boolean); };
  o.images = o.images || {};
  o.images.cover = cleanUrl_(o.images.cover);
  o.images.hero = cleanUrl_(o.images.hero);
  o.bisnis = o.bisnis || {}; o.bisnis.gallery = urls(o.bisnis.gallery);
  o.biogains = o.biogains || {}; o.biogains.gallery = urls(o.biogains.gallery);
  o.clients = o.clients || {}; o.clients.logos = urls(o.clients.logos);
  o.contact = o.contact || {};
  o.contact.wa = String(o.contact.wa || '').replace(/\D/g, '').slice(0, 16);
  o.lang_default = o.lang_default === 'en' ? 'en' : 'id';
  return o;
}

// Sel yang diawali = + - @ dibaca Sheets sebagai rumus. Tambahkan apostrof supaya jadi teks.
function cell_(v) {
  var s = String(v == null ? '' : v).slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// ===== SHEET HELPERS =====
function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0 && headers) sh.appendRow(headers);
  return sh;
}

// Membaca tab sebagai daftar baris. Kolom yang belum ada di sheet lama ditambahkan otomatis di kanan.
function table_(name, headers) {
  var sh = sheet_(name, headers);
  var vals = sh.getDataRange().getValues();
  var head = (vals[0] || headers).map(String);
  var missing = headers.filter(function (h) { return head.indexOf(h) < 0; });
  if (missing.length) {
    head = head.concat(missing);
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    vals = sh.getDataRange().getValues();
  }
  var rows = [];
  for (var i = 1; i < vals.length; i++) {
    var o = { _row: i + 1 };
    for (var j = 0; j < head.length; j++) o[head[j]] = vals[i][j] == null ? '' : vals[i][j];
    rows.push(o);
  }
  return { sh: sh, head: head, rows: rows };
}

function setCell_(t, row, col, val) {
  t.sh.getRange(row, t.head.indexOf(col) + 1).setValue(val);
}

function rowFrom_(cols, obj) {
  return cols.map(function (c) { return obj[c] == null ? '' : obj[c]; });
}

function findProfile_(col, val) {
  var t = table_('Profiles', PROFILE_COLS);
  for (var i = 0; i < t.rows.length; i++) {
    if (String(t.rows[i][col]).toLowerCase() === String(val).toLowerCase()) return t.rows[i];
  }
  return null;
}

function chapterName_(id) {
  id = String(id || '').toLowerCase();
  if (!id) return '';
  var t = table_('Chapters', CHAPTER_COLS);
  for (var i = 0; i < t.rows.length; i++) if (String(t.rows[i].id).toLowerCase() === id) return String(t.rows[i].name);
  return '';
}

function contactsTabName_(name, slug) {
  var first = String(name).replace(/[\[\]*?\/\\:']/g, '').trim().split(/\s+/)[0] || slug;
  var base = ('Contacts ' + first).slice(0, 60);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tab = base, n = 2;
  while (ss.getSheetByName(tab)) tab = base + ' ' + (n++);
  return tab;
}

function folder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function isTrue_(v) {
  return v === true || /^(true|yes|ya|1)$/i.test(String(v));
}

function randomCode_(n) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
