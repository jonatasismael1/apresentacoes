self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// Force unregister
self.registration.unregister().then(function() {
  return self.clients.matchAll();
}).then(function(clients) {
  clients.forEach(client => client.navigate(client.url))
});
