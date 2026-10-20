// Service worker kaynağı. Build sırasında vite.config.js içindeki eklenti
// yer tutucuları doldurup dist/sw.js olarak yazar. Dev ortamında kullanılmaz.

const CACHE_PREFIX = 'kur-shell-'
const CACHE_NAME = `${CACHE_PREFIX}__CACHE_VERSION__`
const PRECACHE_URLS = __PRECACHE_URLS__
const APP_SHELL_URL = '/'
// Module script istekleri Origin header'ı taşır; sunucu "Vary: Origin" dönerse
// precache kaydı eşleşmez ve offline açılış kırılır. Bu yüzden Vary yok sayılır.
const MATCH_OPTIONS = { ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Uygulama kabuğu cache-first sunulur: offline açılış anında çalışır.
// Kur API'si (farklı origin) burada yakalanmaz; kur cache'i localStorage'dadır.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(APP_SHELL_URL, MATCH_OPTIONS).then((cached) => cached || fetch(request)),
    )
    return
  }

  event.respondWith(caches.match(request, MATCH_OPTIONS).then((cached) => cached || fetch(request)))
})
