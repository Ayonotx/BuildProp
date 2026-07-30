const CACHE_NAME = 'buildprop-v1'
const STATIC_ASSETS = [
  '/login',
  '/manifest.json',
  '/icon.svg',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls: network first, fallback to nothing (APIs need fresh data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a basic offline response for API calls
        return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )
    return
  }

  // Static assets: cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      }).catch(() => {
        // Offline fallback for pages
        if (request.destination === 'document') {
          return caches.match('/login')
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})
