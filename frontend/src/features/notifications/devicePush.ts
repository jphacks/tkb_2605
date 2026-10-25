import { devicePushSessionVersion, enablePush, preparePush, pushSupported } from "./push.ts";

let syncing: Promise<void> | null = null;

// Device/browser permission is the only on/off control. No per-kind preferences.
export function syncDevicePush(): Promise<void> {
  if (typeof window === "undefined" || !pushSupported() || Notification.permission !== "granted") return Promise.resolve();
  if (syncing) return syncing;
  const version = devicePushSessionVersion();
  syncing = preparePush().then(({ registration, config }) => version === devicePushSessionVersion() ? enablePush(registration, config, Promise.resolve("granted")) : undefined)
    .then(() => {}).catch(() => { /* Missing push backend must not block workouts or the GET inbox. */ })
    .finally(() => { syncing = null; });
  return syncing;
}

// Called synchronously from the training-start gesture, as browsers require.
export function requestDevicePush(): Promise<void> {
  if (typeof window === "undefined" || !pushSupported() || Notification.permission === "denied") return Promise.resolve();
  if (Notification.permission === "granted") return syncDevicePush();
  const version = devicePushSessionVersion();
  return Notification.requestPermission().then((permission) => permission === "granted" && version === devicePushSessionVersion() ? syncDevicePush() : undefined).catch(() => {});
}
