self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clients) => {
        const appWindow = clients.find((client) => "focus" in client);
        if (appWindow) {
          return appWindow
            .navigate(targetUrl)
            .then(() => appWindow.focus());
        }
        return self.clients.openWindow(targetUrl);
      },
    ),
  );
});