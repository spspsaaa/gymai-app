const CACHE = 'gymai-v14';

/* Список прекешируемых файлов. Держи в синхроне с реальным составом сборки:
   addAll падает целиком, если хоть один файл отсутствует, и кэш остаётся пустым.
   Список проверяется тестом tests/run.js (набор pwa). */
const PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/01-core.js',
  './js/02-calendar.js',
  './js/03-exercises-progress.js',
  './js/04-workout-session.js',
  './js/05-plan-editor.js',
  './js/06-history.js',
  './js/07-tariff.js',
  './js/08-account-auth.js',
  './js/09-coach-chat.js',
  './js/10-telegram-sync.js',
  './js/11-theme.js',
  './js/90-storage-sync-hook.js',
  './js/91-pwa.js',
  './js/92-admin.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .catch(err => { console.error('[sw] precache failed', err); throw err; })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (e.request.method !== 'GET' || !u.startsWith(self.location.origin)) return;
  if (u.indexOf('/api/') !== -1) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
