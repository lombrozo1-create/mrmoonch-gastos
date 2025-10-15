
const CACHE_NAME = 'mr_moonch_cache_v1';
const FILES = ['.','/index.html','/styles.css','/app.js','/logo.jpeg'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event)=>{
  event.respondWith(caches.match(event.request).then(resp=> resp || fetch(event.request)));
});
