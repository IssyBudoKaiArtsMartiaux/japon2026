/* IBKAM Japon 2026 : garde le programme consultable sans réseau.
   Avec du réseau, la dernière version est toujours chargée, puis mise de côté.
   Sans réseau, ou si le réseau est trop lent, la dernière version mise de côté est affichée. */
var CACHE = 'ibkam-japon-2026';
var FILES = ['./', 'index.html', 'infos.txt', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(f, { cache: 'no-store' }).then(function (r) { if (r.ok) return c.put(f, r); }).catch(function () {});
    }));
  }));
});

self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var page = req.mode === 'navigate';

  var net = fetch(url.href, { cache: 'no-store' }).then(function (r) {
    if (r && r.ok) {
      var copy = r.clone();
      return caches.open(CACHE).then(function (c) { return c.put(url.href, copy); }).then(function () { return r; });
    }
    return r;
  });
  e.waitUntil(net.catch(function () {}));

  function saved() {
    return caches.match(url.href, { ignoreSearch: true }).then(function (r) {
      if (r || !page) return r;
      return caches.match('index.html').then(function (r2) { return r2 || caches.match('./'); });
    });
  }
  var slow = new Promise(function (res) { setTimeout(res, 6000, 'slow'); });

  e.respondWith(Promise.race([net.catch(function () { return 'down'; }), slow]).then(function (x) {
    if (x !== 'slow' && x !== 'down') return x;
    return saved().then(function (r) { return r || (x === 'slow' ? net : Response.error()); });
  }));
});
