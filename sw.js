/* Service worker sederhana: jaringan dulu, cache sebagai cadangan offline.
   Data (data.js, index.html) selalu diambil terbaru kalau ada internet. */
var CACHE = 'biogains-v1';
var SHELL = ['./', 'index.html', 'data.js', 'manifest.webmanifest', 'img/icons/icon-192.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // POST ke Google Sheet tidak disentuh
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;             // font, YouTube, Apps Script dll biarkan langsung
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('index.html'); }); })
  );
});
