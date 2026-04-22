// sw.js — 자동 업데이트 Service Worker
// HTML 파일이 바뀌면 캐시 버전이 자동으로 갱신됨

const CACHE_NAME = 'bread-log-sw';

// install: 아무것도 precache 안 함 (HTML은 network-first로)
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // bread-log.html — network-first (항상 최신 버전)
  if (url.pathname.endsWith('bread-log.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 폰트/외부 리소스 — cache-first
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // sw.js 자체는 캐시 안 함
  if (url.pathname.endsWith('sw.js')) return;

  // 나머지 — network-first
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// 메인 스레드에서 SKIP_WAITING 받으면 즉시 활성화
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
