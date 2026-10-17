/// <reference lib="webworker" />
// CRCC service worker: offline app shell, saved sermons, and push alerts.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { RangeRequestsPlugin } from 'workbox-range-requests';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Single-page app: every page loads index.html (not for Firebase's reserved /__ paths).
try {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/__/] }));
} catch {
  /* index.html not precached in some preview builds */
}

// Lazy-loaded code (Firebase SDK etc.)
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/assets/'),
  new StaleWhileRevalidate({ cacheName: 'crcc-assets', plugins: [new ExpirationPlugin({ maxEntries: 40 })] }),
);

// Sermon audio: downloaded sermons play from the device, with seeking.
registerRoute(
  ({ request }) => request.destination === 'audio',
  new CacheFirst({ cacheName: 'crcc-sermons', plugins: [new CacheableResponsePlugin({ statuses: [200] }), new RangeRequestsPlugin()] }),
);

// Uploaded photos
registerRoute(
  ({ url }) => url.hostname === 'firebasestorage.googleapis.com' && /\.(png|jpe?g|webp)/i.test(decodeURIComponent(url.pathname)),
  new CacheFirst({ cacheName: 'crcc-images', plugins: [new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 })] }),
);

// Bible chapters read before stay readable offline
registerRoute(
  ({ url }) => url.hostname === 'bible-api.com',
  new NetworkFirst({ cacheName: 'crcc-bible', networkTimeoutSeconds: 6, plugins: [new ExpirationPlugin({ maxEntries: 300 })] }),
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts', plugins: [new ExpirationPlugin({ maxEntries: 20 })] }),
);

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Push alerts (Firebase Cloud Messaging payloads) ─────────
self.addEventListener('push', (event) => {
  let payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { notification: { title: 'CRCC', body: event.data?.text() ?? '' } };
  }
  const title = payload.notification?.title ?? payload.data?.title ?? 'CRCC';
  const body = payload.notification?.body ?? payload.data?.body ?? '';
  const url = payload.data?.link || payload.data?.url || '/';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon.png',
      data: { url },
      tag: payload.data?.id,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data?.url as string) || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if ('focus' in w) {
          await (w as WindowClient).navigate(url).catch(() => {});
          return (w as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
