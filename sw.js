const CACHE = 'hvor-er-den-v17';
const ASSETS = [
  './', './index.html', './styles.css?v=4', './v1.css?v=1', './cloud.css?v=1',
  './v21/v21-modular.css?v=1', './v22/v22.css?v=1', './v22/v22-compact-ui.css?v=1',
  './app-model.js?v=1', './app-core.js?v=1', './app-render.js?v=1',
  './app-items.js?v=1', './app-managers.js?v=1', './app-events.js?v=2',
  './supabase-config.js?v=1', './cloud-loader.js?v=3', './cloud.js.gz?v=1',
  './v21/v21-client.js?v=1', './v21/v21-account.js?v=1', './v21/v21-invite.js?v=1',
  './v21/v21-qr.js?v=1', './v21/v21-polish.js?v=2',
  './v22/v22-data.js?v=1', './v22/v22-mobile-hotfix.js?v=1', './v22/v22-lists.js?v=1', './v22/v22-compact-ui.js?v=1', './v22/v22-bridge.js?v=1', './v22/v22-polish.js?v=1',
  './ui-1.js?v=1', './ui-2.js?v=1', './ui-3.js?v=1', './ui-4.js?v=1', './ui-mount.js?v=1',
  './manifest.webmanifest', './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))),
  );
});
