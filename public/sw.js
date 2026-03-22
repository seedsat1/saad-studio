/* ================================================================
   SAAD STUDIO — Service Worker v1.0
   Caches static assets for offline support + fast repeat loads
   ================================================================ */

const CACHE_VERSION = 'saad-studio-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

/* Core assets to pre-cache on install */
const PRE_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  /* Fonts (Google Fonts are CDN – cache what we can) */
  /* App assets */
  '/assets/logo.png',
  '/assets/logo-saad.png',
  '/assets/logo-google-studio.png',
  '/assets/logo-kling-studio.png',
  '/assets/logo-elevenlabs-studio.png',
  '/assets/logo-sora-2.png',
  '/assets/logo-gpt-52.png',
  '/assets/logo-grok.png',
  '/assets/logo-hailuo.png',
  '/assets/logo-ideogram-reframe.png',
  '/assets/logo-image-tools.png',
  '/assets/logo-infinitalk.png',
  '/assets/logo-qwen2.png',
  '/assets/logo-seedance-15-pro.png',
  '/assets/logo-seedream-45.png',
  '/assets/logo-wan-26.png',
  '/assets/logo-z-image.png',
  '/assets/logo-flux-2.png',
  '/assets/logo-flux-kontext.png',
  '/assets/awwwards-effects.js',
];

/* Cache-first resources (pure static) */
const CACHE_FIRST_PATTERNS = [
  /\/assets\//,
  /\/admin\/assets\//,
  /\/admin\/css\//,
  /\/admin\/js\//,
  /\/admin\/vendors\//,
];

/* Network-first resources (API, dynamic content) */
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/auth\//,
  /accounts\.google\.com/,
];

/* ── Install ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return Promise.allSettled(
        PRE_CACHE_URLS.map(url =>
          cache.add(url).catch(() => { /* ignore single failures */ })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate – clean old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch strategy ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET, chrome-extension, and cross-origin API calls */
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* Network-first: API calls & auth */
  if (NETWORK_FIRST_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(networkFirst(request));
    return;
  }

  /* Cache-first: static assets */
  if (CACHE_FIRST_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /* Stale-while-revalidate: HTML pages */
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  /* Default: stale-while-revalidate */
  event.respondWith(staleWhileRevalidate(request));
});

/* ── Strategy helpers ── */

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline – resource not available', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache   = await caches.open(DYNAMIC_CACHE);
  const cached  = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}
