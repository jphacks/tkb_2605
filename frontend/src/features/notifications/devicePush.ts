import { devicePushSessionVersion, enablePush, preparePush, pushSupported } from "./push.ts";

let syncing: { version: number; promise: Promise<void> } | null = null;

// Device/browser permission is the only on/off control. No per-kind preferences.
export function syncDevicePush(): Promise<void> {
  if (typeof window === "undefined" || !pushSupported() || Notification.permission !== "granted") return Promise.resolve();
  const version = devicePushSessionVersion();
  if (syncing?.version === version) return syncing.promise;
  const promise = preparePush().then(({ registration, config }) => version === devicePushSessionVersion() ? enablePush(registration, config, Promise.resolve("granted")) : undefined)
    .then(() => {}).catch(() => { /* Missing push backend must not block workouts or the GET inbox. */ })
    .finally(() => { if (syncing?.promise === promise) syncing = null; });
  syncing = { version, promise };
  return promise;
}

// Called synchronously from the training-start gesture, as browsers require.
export function requestDevicePush(): Promise<void> {
  if (typeof window === "undefined" || !pushSupported() || Notification.permission === "denied") return Promise.resolve();
  if (Notification.permission === "granted") return syncDevicePush();
  const version = devicePushSessionVersion();
  return Notification.requestPermission().then((permission) => permission === "granted" && version === devicePushSessionVersion() ? syncDevicePush() : undefined).catch(() => {});
}
