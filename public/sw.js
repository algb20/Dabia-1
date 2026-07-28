// Dabia Service Worker — Offline + Push Notifications
const CACHE_NAME = "dabia-v2"
const PRECACHE = ["/", "/manifest.json"]

// ── Install: precache app shell ────────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: clear old caches ─────────────────────────────────────────────
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: stale-while-revalidate for pages, skip API/external ────────────
self.addEventListener("fetch", e => {
  const req = e.request
  if (req.method !== "GET") return

  const url = new URL(req.url)
  // Skip: cross-origin, API routes, Supabase, Pi SDK
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return
  if (url.pathname.startsWith("/_next/")) {
    // Static Next.js assets: cache-first
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()))
        return res
      }))
    )
    return
  }
  // Pages: network-first, fallback to cache
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()))
        return res
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match("/")))
  )
})

// ── Push: show notification when app is closed/backgrounded ──────────────
self.addEventListener("push", e => {
  let data = { title: "Dabia", body: "لديك إشعار جديد", url: "/" }
  try { Object.assign(data, e.data?.json()) } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  "/apple-icon.png",
      badge: "/icon-dark-32x32.png",
      tag:   "dabia-notif",
      renotify: true,
      data:  { url: data.url },
      actions: [{ action: "open", title: "فتح التطبيق" }],
    })
  )
})

// ── Notification click: focus/open the app ────────────────────────────────
self.addEventListener("notificationclick", e => {
  e.notification.close()
  const target = e.notification.data?.url || "/"
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(ws => {
        const existing = ws.find(w => "focus" in w)
        return existing
          ? existing.focus().then(w => w.navigate(target))
          : self.clients.openWindow(target)
      })
  )
})
