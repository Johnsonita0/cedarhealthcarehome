const cacheName = 'cedar-offline-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => cache.addAll(['/offline.html', '/cedar-logo.jpeg']))
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
  const isOfflineLogo = new URL(request.url).pathname === '/cedar-logo.jpeg'
  if (request.method !== 'GET' || (request.mode !== 'navigate' && !isOfflineLogo)) return

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(cacheName)
      const cachedResponse = await cache.match(request)
      if (cachedResponse) return cachedResponse
      if (request.mode !== 'navigate') return Response.error()
      return (await cache.match('/offline.html')) || new Response('You are offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }),
  )
})