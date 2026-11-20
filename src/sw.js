/* 静态站 Service Worker：网络优先保证更新，离线回退缓存。 */
const CACHE = 'turbo-spark-v3';
const ROOT = new URL('./', self.location).href;

const CORE = [
  ROOT,
  ROOT + 'index.html',
  ROOT + 'assets/app.css',
  ROOT + 'assets/app.js',
  ROOT + 'assets/islands.js',
  ROOT + 'assets/search-index.json',
  ROOT + 'assets/p3r/favicon.ico',
  ROOT + 'assets/fonts/Urbanist-Variable.woff2',
  ROOT + 'assets/fonts/NotoSansSC-subset.woff2',
  ROOT + 'assets/fonts/JetBrainsMono-latin.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => {
      if (hit) return hit;
      return req.mode === 'navigate' ? caches.match(ROOT + 'index.html') : undefined;
    }))
  );
});
