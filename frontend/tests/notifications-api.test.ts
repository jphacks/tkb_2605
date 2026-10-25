import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { fetchNotifications, sendWorkoutNotification, type WorkoutNotification } from "../src/api/notifications.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const sample: WorkoutNotification = { notification_id: 1, notifier_id: 2887, notifier_name: "U10", notified_at: "2026-10-24T15:00:00+09:00" };
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});
function response(value: unknown, status = 200) { globalThis.fetch = async () => new Response(JSON.stringify(value), { status }); }

test("GET uses the exact notify contract, latest limit, cookies, no body and no cache", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/notify/?limit=100");
    assert.equal(init?.method, "GET");
    assert.equal(init?.body, undefined);
    assert.equal(init?.credentials, "same-origin");
    assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).has("X-CSRFToken"), false);
    return new Response(JSON.stringify([sample]));
  };
  assert.deepEqual(await fetchNotifications({ limit: 100 }), [sample]);
});

test("GET defaults to 20 and rejects invalid limits before fetching", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => { calls++; assert.equal(url, "/api/notify/?limit=20"); return new Response("[]"); };
  assert.deepEqual(await fetchNotifications(), []);
  for (const limit of [0, -1, 101, 1.5, NaN]) await assert.rejects(fetchNotifications({ limit }));
  assert.equal(calls, 1);
});

test("notifications are deduplicated by ID and ordered by timestamp, including ties", async () => {
  const newer = { ...sample, notification_id: 3, notified_at: "2026-10-25T01:00:00Z" };
  response([sample, newer, sample, { ...newer, notification_id: 4 }]);
  assert.deepEqual((await fetchNotifications()).map((item) => item.notification_id), [4, 3, 1]);
});

test("malformed payloads fail instead of looking like an empty inbox", async () => {
  for (const value of [null, {}, { results: [] }, [null], [{ ...sample, notification_id: "1" }], [{ ...sample, notifier_id: -1 }], [{ ...sample, notifier_name: " " }], [{ ...sample, notified_at: "invalid" }], [{ ...sample, notified_at: "2026-10-25T01:00:00" }]]) {
    response(value); await assert.rejects(fetchNotifications(), /応答形式/);
  }
  globalThis.fetch = async () => new Response("not JSON");
  await assert.rejects(fetchNotifications(), /応答形式/);
});

test("POST has no body, includes CSRF and accepts an empty HTTP 200 response", async () => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "csrftoken=csrf%2Btoken" } });
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, "/api/notify/");
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, undefined);
    assert.equal(init?.credentials, "same-origin");
    assert.equal(new Headers(init?.headers).get("X-CSRFToken"), "csrf+token");
    assert.equal(new Headers(init?.headers).has("Content-Type"), false);
    return new Response(null, { status: 200 });
  };
  await sendWorkoutNotification();
  assert.equal(calls, 1);
});

test("POST does not impose an undocumented response schema or retry", async () => {
  for (const body of ["OK", "{}", "[]"]) { globalThis.fetch = async () => new Response(body); await sendWorkoutNotification(); }
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError("network lost"); };
  await assert.rejects(sendWorkoutNotification(), /届いている可能性/);
  assert.equal(calls, 1);
  response({}, 500);
  await assert.rejects(sendWorkoutNotification(), /届いている可能性/);
});

test("authorization, unavailable endpoints and unexpected success status are explicit errors", async () => {
  for (const status of [401, 403]) { response({}, status); await assert.rejects(fetchNotifications(), /ログイン/); }
  for (const status of [404, 501]) { response({}, status); await assert.rejects(fetchNotifications(), /まだ接続できません/); }
  for (const status of [201, 429, 500]) { response([], status); await assert.rejects(fetchNotifications(), /エラー/); }
  response({}, 201); await assert.rejects(sendWorkoutNotification(), /エラー/);
});

test("caller cancellation propagates to GET and POST without turning into an empty inbox", async () => {
  for (const action of [(signal: AbortSignal) => fetchNotifications({ signal }), sendWorkoutNotification]) {
    const controller = new AbortController();
    globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
    const pending = action(controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
  }
});

test("both allowed notification types retain their target, and incomplete likes are rejected", async () => {
  const like = { ...sample, notification_id: 2, notification_type: "post_liked", post_id: "post-uuid", post_excerpt: "今日の記録" };
  response([sample, like]);
  const items = await fetchNotifications();
  assert.equal(items.length, 2);
  assert.equal(items.find((item) => item.notification_id === 2)?.post_id, "post-uuid");
  for (const invalid of [{...like,post_id:undefined},{...like,notification_type:"follow"},{...like,post_excerpt:42}]) {
    response([invalid]); await assert.rejects(fetchNotifications(), /応答形式/);
  }
});
