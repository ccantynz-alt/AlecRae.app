/// <reference lib="webworker" />

const CACHE_NAME = 'alecrae-voice-v1';
const STATIC_CACHE = 'alecrae-static-v1';
const SYNC_QUEUE = 'alecrae-sync-queue';

// App shell resources to cache on install
const APP_SHELL = [
  '/',
  '/app',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Static asset patterns that should be cached aggressively
const STATIC_ASSET_PATTERNS = [
  /\/_next\/static\//,
  /\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|eot)$/,
];

// API routes that support background sync
const SYNCABLE_API_ROUTES = [
  '/api/transcribe',
  '/api/enhance',
];

// ─── Install ─────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        // Non-fatal — some shell resources may not exist yet
        console.warn('[SW] Some app shell resources failed to cache:', err);
      });
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching (POST/PUT/DELETE go straight to network)
  if (request.method !== 'GET') {
    // For syncable API routes, attempt network and queue on failure
    if (SYNCABLE_API_ROUTES.some((route) => url.pathname.startsWith(route))) {
      event.respondWith(networkWithSync(request));
    }
    return;
  }

  // Static assets — cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API calls — network-first with cache fallback for GET
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigation and app shell — network-first
  event.respondWith(networkFirst(request));
});

// ─── Cache Strategies ────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a basic offline response for static assets
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, serve the app shell
    if (request.mode === 'navigate') {
      const appShell = await caches.match('/app');
      if (appShell) return appShell;
      const root = await caches.match('/');
      if (root) return root;
    }

    return new Response(
      JSON.stringify({ error: 'You are offline. Please check your connection.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function networkWithSync(request) {
  try {
    return await fetch(request.clone());
  } catch {
    // Network failed — queue for background sync if supported
    await queueForSync(request);
    return new Response(
      JSON.stringify({
        error: 'You are offline. This request has been queued and will be sent when connectivity is restored.',
        queued: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ─── Background Sync ─────────────────────────────────────────────────

async function queueForSync(request) {
  try {
    // Store request details in IndexedDB for replay
    const db = await openSyncDB();
    const body = await request.clone().arrayBuffer();
    const entry = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now(),
    };

    const tx = db.transaction('requests', 'readwrite');
    tx.objectStore('requests').add(entry);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // Register for background sync
    if (self.registration && self.registration.sync) {
      await self.registration.sync.register(SYNC_QUEUE);
    }
  } catch (err) {
    console.warn('[SW] Failed to queue request for sync:', err);
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('alecrae-sync', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_QUEUE) {
    event.waitUntil(replaySyncQueue());
  }
});

async function replaySyncQueue() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');
    const entries = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    for (const entry of entries) {
      try {
        await fetch(entry.url, {
          method: entry.method,
          headers: entry.headers,
          body: entry.body,
        });

        // Remove from queue on success
        const deleteTx = db.transaction('requests', 'readwrite');
        deleteTx.objectStore('requests').delete(entry.id);
        await new Promise((resolve, reject) => {
          deleteTx.oncomplete = resolve;
          deleteTx.onerror = () => reject(deleteTx.error);
        });
      } catch {
        // Leave in queue — sync will be retried
        console.warn('[SW] Failed to replay queued request:', entry.url);
      }
    }
  } catch (err) {
    console.warn('[SW] Failed to replay sync queue:', err);
  }
}

// ─── Push Notifications ──────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'AlecRae Voice',
      body: event.data.text(),
    };
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/app',
    },
    actions: data.actions || [],
    tag: data.tag || 'alecrae-notification',
    renotify: !!data.renotify,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'AlecRae Voice', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────

function isStaticAsset(url) {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname));
}
