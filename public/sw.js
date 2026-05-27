const CACHE_NAME = "seguridad-control-v1"

const urlsToCache = [
  "/",
  "/login",
  "/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        return response
      })
    }).catch(() => {
      return caches.match("/")
    }),
  )
})

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "Seguridad Control",
    body: "Tienes una nueva notificación",
  }

  const options = {
    title: data.title,
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(options.title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(clients.openWindow(url))
})

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-attendance") {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const pendingKey = "sync-pending"
    const response = await cache.match(pendingKey)
    if (response) {
      const data = await response.json()
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await cache.delete(pendingKey)
    }
  } catch (err) {
    console.error("Sync failed:", err)
  }
}
