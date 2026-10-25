/* Web Push only: no fetch handler and no caching of authenticated responses. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let id;
  try {
    const payload = event.data?.json();
    if (Number.isSafeInteger(payload?.notification_id) && payload.notification_id > 0) id = payload.notification_id;
  } catch { /* Empty or malformed payloads still produce a visible generic notification. */ }
  event.waitUntil((async () => {
    await self.registration.showNotification("MUSCLE MATE", {
      body: "新しい通知が届きました。タップして確認できます。",
      icon: "/icons/push-192.png", badge: "/icons/push-badge.png",
      tag: id ? `workout-${id}` : "workout", renotify: false,
      data: { url: "/notifications" },
    });
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) client.postMessage({ type: "workout-push-received" });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    // Fixed same-origin route; never open a URL supplied by a push payload.
    const destination = new URL("/notifications", self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && "navigate" in client) {
        try {
          const navigated = await client.navigate(destination);
          if (navigated) { await navigated.focus(); return; }
        } catch { /* A closing client must not prevent opening the notification page. */ }
      }
    }
    await self.clients.openWindow(destination);
  })());
});
