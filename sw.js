// Remu Gestión — Service Worker v2
// Estrategia: Cache-first para el shell, network-only para Supabase

const CACHE_NAME = 'remu-v11';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg'
];
const CDN_CACHE = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/dompurify@3.2.3/dist/purify.min.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Outfit:wght@300;400;500;600&display=swap'
];

// ── INSTALL: pre-cachear el shell ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Shell: obligatorio
      await cache.addAll(SHELL);
      // CDN: best-effort (no fallar si alguno no carga)
      await Promise.allSettled(
        CDN_CACHE.map(url => cache.add(url).catch(() => {}))
      );
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: limpiar caches viejas ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia de caché ────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Solo manejar GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ── Supabase: siempre red (datos en tiempo real) ──────────────────
  if (url.hostname.includes('supabase.co')) return;

  // ── Google Fonts CSS: red con fallback a caché ────────────────────
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // ── CDN libs: caché primero ────────────────────────────────────────
  if (url.hostname.includes('cdnjs') || url.hostname.includes('jsdelivr') || url.hostname.includes('fonts.gstatic')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── App shell y assets locales: caché primero ─────────────────────
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(res => {
        if (res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => {
        // Offline: para navegación, devolver el shell
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Mensaje desde el cliente para forzar update ───────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
