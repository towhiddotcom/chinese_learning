// ============ HARBIN MANDARIN — SERVICE WORKER ============
const CACHE_NAME = 'harbin-mandarin-v2';
const RUNTIME_CACHE = 'harbin-mandarin-runtime-v2';

// Core app shell — cached immediately on install
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: network-first for HTML (so updates show up), cache-first for everything else
// (including the PDF materials, which get cached the first time a user opens them)
self.addEventListener('fetch', (event) => {
    const req = event.request;

    if (req.method !== 'GET') return;

    if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
                    return res;
                })
                .catch(() => caches.match(req).then(res => res || caches.match('./index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(cachedRes => {
            if (cachedRes) return cachedRes;

            return fetch(req).then(networkRes => {
                const resClone = networkRes.clone();
                caches.open(RUNTIME_CACHE).then(cache => cache.put(req, resClone));
                return networkRes;
            }).catch(() => {
                // Offline fallback for images could go here if needed
            });
        })
    );
});
