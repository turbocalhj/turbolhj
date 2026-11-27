/* 静态站 Service Worker：页面网络优先保证更新，静态资产用 stale-while-revalidate。
   构建 id 由 build.js 注入，样式或脚本变化即换缓存桶。 */
const BUILD = '__BUILD_ID__';
const CACHE = `turbo-spark-${BUILD}`;
const ROOT = new URL('./', self.location).href;

// 只预缓存页面壳与首屏必需的小文件；字体、索引、岛屿等大件按访问时机缓存
const CORE = [
  ROOT,
  ROOT + 'index.html',
  ROOT + 'assets/app.css',
  ROOT + 'assets/app.js',
  ROOT + 'assets/p3r/favicon.ico',
];

const ASSET_EXT = /\.(?:css|js|json|woff2|webp|png|jpg|jpeg|svg|ico|mp4)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 静态资产：先给缓存，再后台更新，第二次访问起直接命中
  if (ASSET_EXT.test(url.pathname) && req.destination !== 'document') {
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
          return res;
        }).catch(() => hit);
        return hit || network;
      }),
    );
    return;
  }

  // 页面与其余请求：网络优先，离线回退缓存，导航再兜底首页
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
    })),
  );
});