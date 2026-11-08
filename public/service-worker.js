const cacheName = 'cedar-offline-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => cache.add('/offline.html'))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('cedar-offline-') && key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || request.mode !== 'navigate') return

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(cacheName)
      return (await cache.match('/offline.html')) || new Response('You are offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }),
  )
})