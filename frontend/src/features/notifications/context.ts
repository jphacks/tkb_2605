import { createContext, useContext, useSyncExternalStore } from "react";
import type { NotificationStore } from "./store.ts";

export const NotificationContext = createContext<NotificationStore | null>(null);
export function useNotifications() {
  const store = useContext(NotificationContext);
  if (!store) throw new Error("NotificationProvider is required.");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { ...state, refresh: store.refresh, send: store.send, clearNew: store.clearNew, dismissBanner: store.dismissBanner };
}
