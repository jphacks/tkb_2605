import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { NotificationContext, useNotifications } from "./context.ts";
import { createNotificationStore } from "./store.ts";
import { startNotificationPolling } from "./polling.ts";
import { paths } from "../../routes.ts";
import "./notifications.css";

function NotificationArrival() {
  const { banner, newIds, dismissBanner } = useNotifications();
  return <aside className="notification-arrival" aria-label="新着通知" hidden={!banner}>
    <p role="status">{banner ? `筋トレの新着通知が${newIds.length}件あります。` : ""}</p>
    <Link to={paths.notifications} onClick={dismissBanner}>通知を見る</Link>
    <button type="button" onClick={dismissBanner} aria-label="新着通知のお知らせを閉じる">閉じる</button>
  </aside>;
}

export default function NotificationProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [store] = useState(createNotificationStore);
  useEffect(() => {
    if (!enabled) return;
    const stop = startNotificationPolling(store.refresh, {
      available: () => document.visibilityState === "visible" && navigator.onLine,
      onWake(callback) {
        document.addEventListener("visibilitychange", callback);
        window.addEventListener("focus", callback);
        window.addEventListener("online", callback);
        window.addEventListener("offline", callback);
        return () => {
          document.removeEventListener("visibilitychange", callback);
          window.removeEventListener("focus", callback);
          window.removeEventListener("online", callback);
          window.removeEventListener("offline", callback);
        };
      },
      schedule(callback, delay) { const timer = window.setTimeout(callback, delay); return () => window.clearTimeout(timer); },
    });
    return () => { stop(); store.reset(); };
  }, [enabled, store]);
  return <NotificationContext.Provider value={store}>{children}{enabled && <NotificationArrival />}</NotificationContext.Provider>;
}
