const CACHE = 'crimi-life-organiser-v1';
const ROOT = new URL('./', self.location.href).href;
const SHELL = [ROOT, new URL('./manifest.webmanifest', ROOT).href, new URL('./icon-192.png', ROOT).href, new URL('./icon-512.png', ROOT).href];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(async () => (await caches.match(event.request)) || (await caches.match(ROOT))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) void caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Crimi Life Organiser', body: 'Hai un nuovo promemoria.', url: ROOT };
  try { data = { ...data, ...event.data.json() }; } catch { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: new URL('./icon-192.png', ROOT).href, badge: new URL('./icon-192.png', ROOT).href, data: { url: data.url }, tag: 'crimi-push' }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || ROOT;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url.startsWith(ROOT));
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
