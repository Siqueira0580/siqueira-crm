// Siqueira CRM — Service Worker
// Estratégia: Network First com fallback para cache

const CACHE_NAME = 'siqueira-crm-v2'

// Recursos estáticos para pré-cachear
const PRECACHE = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Nunca intercepta requisições de outra origem (Unsplash, fontes, CDNs, etc.)
  // Deixa o navegador buscá-las normalmente, sem passar pelo SW.
  if (url.origin !== self.location.origin) {
    return
  }

  // Ignora requisições de API e Supabase (sempre busca na rede)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    request.method !== 'GET'
  ) {
    return
  }

  // Network First: tenta rede, fallback para cache (apenas mesma origem)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
