/* Service worker de Escudo Digital.
 *
 * Minimalista a propósito: la app "requiere internet" (no offline-first), así
 * que NO cacheamos respuestas para evitar datos viejos. El SW existe para:
 *   1) Hacer la app instalable (PWA).
 *   2) Soportar el flujo de actualización con aviso (SKIP_WAITING).
 *   3) Ser el punto de entrada de push notifications (cuando el bot "sube" algo).
 */
const VERSION = 'v1';

self.addEventListener('install', () => {
  // No auto-skip: esperamos a que el usuario acepte "Actualizar".
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Passthrough (sin caché). Deja pasar todo a la red.
self.addEventListener('fetch', () => {});

// Push: notificar cuando una acción se eleva al humano.
self.addEventListener('push', (event) => {
  let data = { title: 'Escudo Digital', body: 'Tienes una acción por revisar.' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: data.url || '/',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data || '/'));
});
