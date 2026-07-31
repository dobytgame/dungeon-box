self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: event.data?.text() ?? 'DungeonBox Admin' };
  }

  const title = payload.title ?? 'DungeonBox Admin';
  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/favicon.ico',
    badge: payload.badge ?? '/favicon.ico',
    tag: payload.tag ?? 'dungeonbox-admin',
    renotify: true,
    data: {
      url: payload.url ?? '/admin/loja/pedidos',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const relativeUrl = event.notification.data?.url ?? '/admin';
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            void client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
