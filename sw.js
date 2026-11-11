// Service worker : précache de toute l'app (utilisable hors ligne dès la première visite).
// Stratégie : réponse depuis le cache, mise à jour du cache en arrière-plan (la version suivante sert au prochain lancement).
const CACHE = 'kb-chrono-v7';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'js/app.js', 'js/engine.js', 'js/presets.js', 'js/history.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      });
      if (hit) { net.catch(() => {}); return hit; }
      return net;
    })
  );
});
