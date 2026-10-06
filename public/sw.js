const CACHE_NAME = 'corneromino-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const cachedResponse = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cachedResponse))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((response) => response ?? caches.match('./index.html'))),
  )
})
