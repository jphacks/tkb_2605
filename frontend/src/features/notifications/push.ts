import { apiFetch } from "../../api/http.ts";
// Proposed backend contract: docs/web-push.md. This module never implements delivery.
export type PushConfig = { public_key: string; csrf_token: string };
let sessionGeneration = 0;
export const devicePushSessionVersion = () => sessionGeneration;

export function applicationKey(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) throw new Error("通知サーバーの公開鍵が不正です。");
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  if (raw.length !== 65 || raw.charCodeAt(0) !== 4) throw new Error("通知サーバーの公開鍵が不正です。");
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function pushRequest(path: string, method: "GET" | "POST" | "DELETE", token?: string, body?: unknown) {
  let response: Response;
  try {
    response = await apiFetch(`/api/push/${path}/`, {
      method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-CSRFToken": token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }, false);
  } catch { throw new Error("通知サーバーに接続できませんでした。通信を確認して再試行してください。"); }
  if (response.status === 200 || (method !== "GET" && response.status === 204)) return response;
  if ([401, 403].includes(response.status)) throw new Error("プッシュ通知の設定にはログインが必要です。ログイン状態を確認してください。");
  if ([404, 501, 503].includes(response.status)) throw new Error("プッシュ通知はサーバーの準備中です。時間をおいて再確認してください。");
  if (response.status === 409) throw new Error("この端末を登録できませんでした。以前のアカウントで通知を解除するか、登録端末数を確認してください。");
  throw new Error("プッシュ通知の設定を保存できませんでした。再試行してください。");
}

export async function fetchPushConfig(): Promise<PushConfig> {
  const value: unknown = await (await pushRequest("config", "GET")).json().catch(() => null);
  if (!value || typeof value !== "object" || !("public_key" in value) || !("csrf_token" in value)
    || typeof value.public_key !== "string" || typeof value.csrf_token !== "string" || !value.csrf_token) {
    throw new Error("プッシュ通知の設定を確認できませんでした。");
  }
  applicationKey(value.public_key);
  return { public_key: value.public_key, csrf_token: value.csrf_token };
}

export function savePushSubscription(subscription: PushSubscription, config: PushConfig) {
  const currentKey = subscription.options.applicationServerKey;
  if (currentKey) {
    const expected = applicationKey(config.public_key);
    const current = new Uint8Array(currentKey);
    if (current.length !== expected.length || current.some((byte, index) => byte !== expected[index])) {
      throw new Error("通知サーバーの鍵が更新されています。端末のサイト設定で通知の許可をリセットしてから、もう一度許可してください。");
    }
  }
  return pushRequest("subscriptions", "POST", config.csrf_token, subscription.toJSON());
}

export function deletePushSubscription(endpoint: string, config: PushConfig) {
  return pushRequest("subscriptions", "DELETE", config.csrf_token, { endpoint });
}

export function pushSupported() {
  return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function preparePush() {
  const config = await fetchPushConfig();
  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/", updateViaCache: "none" });
  if (!registration.active) {
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing ?? registration.waiting;
      if (!worker) { reject(new Error("通知の準備を再試行してください。")); return; }
      const timeout = window.setTimeout(() => finish(new Error("通知の準備がタイムアウトしました。再試行してください。")), 10_000);
      function finish(error?: Error) { clearTimeout(timeout); worker?.removeEventListener("statechange", check); if (error) reject(error); else resolve(); }
      function check() { if (worker?.state === "activated") finish(); else if (worker?.state === "redundant") finish(new Error("通知の準備に失敗しました。再試行してください。")); }
      worker.addEventListener("statechange", check); check();
    });
  }
  return { config, registration };
}

export async function enablePush(registration: ServiceWorkerRegistration, config: PushConfig, permission: Promise<NotificationPermission>) {
  const generation = sessionGeneration;
  if (await permission !== "granted") throw new Error("通知が許可されていません。ブラウザーのサイト設定から許可できます。");
  if (generation !== sessionGeneration) throw new Error("通知設定を中止しました。");
  const existing = await registration.pushManager.getSubscription();
  if (generation !== sessionGeneration) throw new Error("通知設定を中止しました。");
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config.public_key) });
  try {
    if (generation !== sessionGeneration) throw new Error("通知設定を中止しました。");
    await savePushSubscription(subscription, config);
    if (generation !== sessionGeneration) throw new Error("通知設定を中止しました。");
  }
  catch (error) {
    // A failed POST may still have saved on the server. Invalidate a newly created endpoint.
    if (!existing || generation !== sessionGeneration) {
      const removed = await subscription.unsubscribe().catch(() => false);
      if (!removed) throw new Error("登録を確認できず、端末側の解除も完了しませんでした。ブラウザーのサイト設定で通知を解除してください。", { cause: error });
    }
    throw error;
  }
  return subscription;
}

// Call before clearing login state. Do not unsubscribe on tab close: background push needs it.
export async function releaseDevicePush() {
  sessionGeneration += 1;
  if (typeof window === "undefined" || !pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  // Local revocation is the safety boundary; server cleanup can be deferred to its 410 handling.
  if (!await subscription.unsubscribe()) throw new Error("ブラウザーのサイト設定で通知を解除してから終了してください。");
  try { await deletePushSubscription(subscription.endpoint, await fetchPushConfig()); } catch { /* Already revoked locally. */ }
}
