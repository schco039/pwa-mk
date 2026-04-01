const CACHE_NAME = 'knights-v1'
const STATIC_ASSETS = ['/dashboard', '/schedule', '/stats']

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only cache same-origin GET requests, skip tRPC/API
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'Mamer Knights'
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url ?? '/dashboard' },
    vibrate: [100, 50, 100],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click → open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
