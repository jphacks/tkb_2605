import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { applicationKey, enablePush, fetchPushConfig, releaseDevicePush, savePushSubscription } from "../src/features/notifications/push.ts";

const originalFetch = globalThis.fetch;
const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
afterEach(() => {
  globalThis.fetch = originalFetch;
  Reflect.deleteProperty(globalThis, "window");
  if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
});
const key = Buffer.from([4, ...Array(64).fill(1)]).toString("base64url");
const config = { public_key: key, csrf_token: "csrf-from-session" };
function subscription(unsubscribe = async () => true) {
  return { endpoint: "https://push.example.test/device", options: { applicationServerKey: applicationKey(key).buffer }, unsubscribe,
    toJSON: () => ({ endpoint: "https://push.example.test/device", keys: { auth: "auth", p256dh: "key" } }),
  } as unknown as PushSubscription;
}
function registration(existing: PushSubscription | null, created = subscription()) {
  let subscribed = 0;
  return { value: { pushManager: { getSubscription: async () => existing, subscribe: async (options: PushSubscriptionOptionsInit) => {
    subscribed++; assert.equal(options.userVisibleOnly, true); assert.deepEqual(options.applicationServerKey, applicationKey(key)); return created;
  } } } as unknown as ServiceWorkerRegistration, subscribed: () => subscribed };
}

test("public VAPID key rejects invalid length, prefix and encoding", () => {
  assert.equal(applicationKey(key).length, 65);
  for (const invalid of ["bad", "!", Buffer.alloc(65).toString("base64url")]) assert.throws(() => applicationKey(invalid));
});

test("configuration uses same-origin session and rejects an unconfigured backend", async () => {
  globalThis.fetch = async (url, init) => { assert.equal(url, "/api/push/config/"); assert.equal(init?.credentials, "same-origin"); assert.equal(init?.cache, "no-store"); return Response.json(config); };
  assert.deepEqual(await fetchPushConfig(), config);
  for (const status of [404, 501, 503]) {
    globalThis.fetch = async () => new Response(null, { status });
    await assert.rejects(fetchPushConfig(), /準備中/);
  }
  globalThis.fetch = async () => Response.json({ public_key: key });
  await assert.rejects(fetchPushConfig(), /確認できません/);
});

test("denied or dismissed permission never subscribes or calls the API", async () => {
  const manager = registration(null);
  globalThis.fetch = async () => { throw new Error("must not fetch"); };
  for (const permission of ["denied", "default"] as const) await assert.rejects(enablePush(manager.value, config, Promise.resolve(permission)), /許可されていません/);
  assert.equal(manager.subscribed(), 0);
});

test("successful enable registers endpoint and encryption keys with CSRF, without user IDs", async () => {
  const endpoint = subscription(); const manager = registration(null, endpoint);
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/push/subscriptions/"); assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("X-CSRFToken"), config.csrf_token);
    assert.deepEqual(JSON.parse(String(init?.body)), endpoint.toJSON());
    return new Response(null, { status: 204 });
  };
  assert.equal(await enablePush(manager.value, config, Promise.resolve("granted")), endpoint);
  assert.equal(manager.subscribed(), 1);
});

test("existing subscription is synchronized without creating another endpoint", async () => {
  const existing = subscription(); const manager = registration(existing);
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await enablePush(manager.value, config, Promise.resolve("granted")), existing);
  assert.equal(manager.subscribed(), 0);
});

test("changed VAPID key requires explicit removal instead of silently registering incompatible keys", () => {
  assert.throws(() => savePushSubscription(subscription(), { ...config, public_key: Buffer.from([4, ...Array(64).fill(2)]).toString("base64url") }), /鍵が更新/);
});

test("failed new registration revokes the browser endpoint and never retries POST", async () => {
  let revoked = 0; let requests = 0;
  const endpoint = subscription(async () => { revoked++; return true; });
  globalThis.fetch = async () => { requests++; return new Response(null, { status: 500 }); };
  await assert.rejects(enablePush(registration(null, endpoint).value, config, Promise.resolve("granted")), /保存できません/);
  assert.equal(revoked, 1); assert.equal(requests, 1);
});

test("failed sync preserves an existing endpoint so the user can explicitly revoke it", async () => {
  let revoked = false;
  const endpoint = subscription(async () => { revoked = true; return true; });
  globalThis.fetch = async () => new Response(null, { status: 409 });
  await assert.rejects(enablePush(registration(endpoint).value, config, Promise.resolve("granted")), /登録できません/);
  assert.equal(revoked, false);
});



test("logout invalidates an enrollment still waiting on notification permission", async () => {
  let grant!: (value: NotificationPermission) => void;
  const manager = registration(null);
  const enabling = enablePush(manager.value, config, new Promise((resolve) => { grant = resolve; }));
  Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: false } });
  await releaseDevicePush(); grant("granted");
  await assert.rejects(enabling, /中止/); assert.equal(manager.subscribed(), 0);
});

test("subscription completing after logout is revoked before it can be saved", async () => {
  let complete!: (value: PushSubscription) => void;
  let started!: () => void;
  const didStart = new Promise<void>((resolve) => { started = resolve; });
  let revoked = 0;
  const endpoint = subscription(async () => { revoked++; return true; });
  const manager = { pushManager: {
    getSubscription: async () => null,
    subscribe: () => { started(); return new Promise<PushSubscription>((resolve) => { complete = resolve; }); },
  } } as unknown as ServiceWorkerRegistration;
  globalThis.fetch = async () => { assert.fail("late enrollment must not be saved"); };
  const enabling = enablePush(manager, config, Promise.resolve("granted"));
  await didStart;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: false } });
  await releaseDevicePush(); complete(endpoint);
  await assert.rejects(enabling, /中止/); assert.equal(revoked, 1);
});

test("rollback failure explicitly tells the user that browser revocation is incomplete", async () => {
  globalThis.fetch = async () => new Response(null, { status: 500 });
  await assert.rejects(enablePush(registration(null, subscription(async () => false)).value, config, Promise.resolve("granted")), /端末側の解除も完了しません/);
});


test("a merely accepted subscription is not shown as registered", async () => {
  globalThis.fetch = async () => new Response(null, { status: 202 });
  await assert.rejects(enablePush(registration(null).value, config, Promise.resolve("granted")), /保存できません/);
});
