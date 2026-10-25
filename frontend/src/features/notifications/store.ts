import { fetchNotifications, sendWorkoutNotification, type WorkoutNotification } from "../../api/notifications.ts";

export type NotificationState = {
  items: WorkoutNotification[];
  newIds: number[];
  initialized: boolean;
  refreshing: boolean;
  sending: boolean;
  error: string;
  sendFeedback: string;
  sendError: string;
  banner: boolean;
};
const initialState = (): NotificationState => ({ items: [], newIds: [], initialized: false, refreshing: false, sending: false, error: "", sendFeedback: "", sendError: "", banner: false });

export function createNotificationStore(api = { fetchNotifications, sendWorkoutNotification }) {
  let state = initialState();
  const listeners = new Set<() => void>();
  const seen = new Set<number>();
  let epoch = 0;
  let read: { controller: AbortController; promise: Promise<void> } | null = null;
  let write: { controller: AbortController; promise: Promise<void> } | null = null;
  function update(next: Partial<NotificationState>) { state = { ...state, ...next }; listeners.forEach((listener) => listener()); }
  function refresh(): Promise<void> {
    if (read) return read.promise;
    const version = epoch;
    const controller = new AbortController();
    update({ refreshing: true });
    const promise = Promise.resolve().then(() => api.fetchNotifications({ limit: 100, signal: controller.signal })).then((items) => {
      if (controller.signal.aborted || version !== epoch) return;
      const fresh = state.initialized ? items.filter((item) => !seen.has(item.notification_id)).map((item) => item.notification_id) : [];
      items.forEach((item) => seen.add(item.notification_id));
      const present = new Set(items.map((item) => item.notification_id));
      const newIds = [...new Set([...state.newIds, ...fresh])].filter((id) => present.has(id));
      update({ items, newIds, initialized: true, error: "", banner: newIds.length > 0 && (state.banner || fresh.length > 0) });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && version === epoch) update({ error: error instanceof Error ? error.message : "通知を取得できませんでした。" });
    }).finally(() => {
      if (read?.controller === controller) { read = null; update({ refreshing: false }); }
    });
    read = { controller, promise };
    return promise;
  }
  function send(): Promise<void> {
    if (write) return write.promise;
    const version = epoch;
    const controller = new AbortController();
    update({ sending: true, sendFeedback: "", sendError: "" });
    const promise = Promise.resolve().then(() => api.sendWorkoutNotification(controller.signal)).then(() => {
      if (!controller.signal.aborted && version === epoch) {
        update({ sendFeedback: "通知の送信を受け付けました。" });
        void refresh(); // Display only the recipient list returned by the server.
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && version === epoch) update({ sendError: error instanceof Error ? error.message : "通知の送信結果を確認できませんでした。" });
    }).finally(() => {
      if (write?.controller === controller) { write = null; update({ sending: false }); }
    });
    write = { controller, promise };
    return promise;
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh, send,
    dismissBanner() { update({ banner: false }); },
    clearNew() { update({ newIds: [], banner: false }); },
    reset() {
      epoch++;
      read?.controller.abort(); write?.controller.abort(); read = null; write = null;
      seen.clear(); state = initialState(); listeners.forEach((listener) => listener());
    },
  };
}
export type NotificationStore = ReturnType<typeof createNotificationStore>;
