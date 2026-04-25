// Remu Gestión — Service Worker v3
// index.html: network-first (siempre toma la versión más nueva)
// CDN / assets: cache-first (sin cambios frecuentes)

const CACHE_NAME = 'remu-v42';
const SHELL_ASSETS = [
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

// ── INSTALL: pre-cachear assets estáticos ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Assets estáticos (sin index.html — ese se maneja network-first)
      await Promise.allSettled(SHELL_ASSETS.map(u => cache.add(u).catch(() => {})));
      // CDN: best-effort
      await Promise.allSettled(CDN_CACHE.map(u => cache.add(u).catch(() => {})));
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: limpiar caches viejas ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase: siempre red
  if (url.hostname.includes('supabase.co')) return;

  // Google Fonts CSS: red con fallback a caché
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // CDN libs y fuentes: caché primero (no cambian)
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

  // /b/slug paths: NO interceptar — dejar que GitHub Pages 404.html los redirija a /b/?s=slug
  // Si el SW los interceptara, el 404 de GitHub Pages no llegaría al navegador y la redirección fallaría.
  if (url.pathname.startsWith('/b/') && !url.pathname.match(/\/b\/(index\.html)?$/)) {
    return;
  }

  // index.html y navegación: NETWORK-FIRST
  // Garantiza que siempre se sirve el código más nuevo.
  // Fallback a caché solo si hay error de red (offline).
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Otros assets locales: caché primero
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

// ── Mensajes del cliente ───────────────────────────────────────────────
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  // SHOW_NOTIF: el cliente pide mostrar una notificación via SW
  // (funciona aunque la pestaña esté en segundo plano o minimizada)
  if (event.data.type === 'SHOW_NOTIF') {
    const { title, body, section, tag, icon } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'Remu Gestión', {
        body: body || '',
        icon: icon || '/icon.svg',
        badge: '/icon.svg',
        tag: tag || ('remu_' + Date.now()),
        data: { section: section || '' },
        requireInteraction: false
      })
    );
  }
});

// ── Notification click — navegar a la sección correcta ─────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const section = event.notification.data?.section || '';
  const targetUrl = self.registration.scope + (section ? '?go=' + section : '');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Primero intentar enfocar una ventana abierta de la app
      for (const client of list) {
        try {
          const clientOrigin = new URL(client.url).origin;
          const swOrigin = new URL(self.registration.scope).origin;
          if (clientOrigin === swOrigin && 'focus' in client) {
            client.focus();
            if (section) client.postMessage({ type: 'GO_SECTION', section });
            return;
          }
        } catch(e) {}
      }
      // Sin ventana abierta — abrir una nueva
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Push (preparado para VAPID en el futuro) ───────────────────────────
// Para activar notificaciones cuando la app esté completamente cerrada
// se necesita suscribir con PushManager.subscribe() y un servidor VAPID.
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const d = event.data.json();
    event.waitUntil(
      self.registration.showNotification(d.title || 'Remu Gestión', {
        body: d.body || '',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: d.tag || 'remu-push',
        data: { section: d.section || '' },
        requireInteraction: false
      })
    );
  } catch(e) {}
});
