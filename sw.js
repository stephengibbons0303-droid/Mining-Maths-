/* Jad's Maths Quest — offline service worker */
const CACHE = 'jadquest-v1';
const ASSETS = [
  './',
  './index.html',
  './fonts.css',
  './fonts/fredoka-500.woff2',
  './fonts/nunito-600.woff2',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './pics/minecraftsea.gif',
  './pics/trexroar.gif',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        // cache same-origin responses for future offline use
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        // offline navigation fallback
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
