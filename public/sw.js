function readPushPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return { body: event.data.text() };
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "Office Barista";
  const body = payload.body || "A new drink order has arrived.";
  const orderId = payload.orderId;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/pwa-icon.svg",
      badge: "/pwa-icon.svg",
      tag: orderId ? `drink-order-${orderId}` : `drink-order-${Date.now()}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: payload.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      try {
        const appWindows = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const appWindow =
          appWindows.find((client) => client.url === targetUrl) || appWindows[0];

        if (appWindow) {
          const targetWindow =
            appWindow.url === targetUrl
              ? appWindow
              : await appWindow.navigate(targetUrl);
          if (targetWindow) {
            await targetWindow.focus();
            return;
          }
        }
      } catch (error) {
        console.warn("Could not focus the app window from notification:", error);
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});