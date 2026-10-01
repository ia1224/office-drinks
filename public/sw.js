self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const appWindows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const appWindow =
        appWindows.find((client) => client.url === targetUrl) || appWindows[0];

      if (appWindow) {
        try {
          const targetWindow =
            appWindow.url === targetUrl
              ? appWindow
              : await appWindow.navigate(targetUrl);
          if (targetWindow) {
            await targetWindow.focus();
            return;
          }
        } catch (error) {
          console.warn("Could not focus the app window from notification:", error);
        }
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});