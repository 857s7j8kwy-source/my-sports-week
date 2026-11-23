const prefix = 'sports-week:' + self.registration.scope + ':';
const version = prefix + '2';
const files = ['./','./index.html','./app.js','./plans.js','./style.css','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(version).then(cache => cache.addAll(files)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(prefix) && k !== version).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(version).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return await cache.match('./index.html') || fetch(request);
    return fetch(request);
  }));
});
