import { test } from "node:test";
import assert from "node:assert/strict";
import { createNotificationStore } from "../src/features/notifications/store.ts";
import { startNotificationPolling, NOTIFICATION_POLL_MS } from "../src/features/notifications/polling.ts";
import type { WorkoutNotification } from "../src/api/notifications.ts";

const item = (id: number, name = "送信者"): WorkoutNotification => ({ notification_id: id, notifier_id: 2887, notifier_name: name, notified_at: "2026-10-25T10:00:00+09:00" });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("first successful snapshot is a baseline, subsequent sender notification triggers one new arrival", async () => {
  let items = [item(1)];
  const store = createNotificationStore({ fetchNotifications: async () => items, sendWorkoutNotification: async () => {} });
  await store.refresh();
  assert.deepEqual(store.getSnapshot().newIds, []);
  assert.equal(store.getSnapshot().banner, false);
  items = [item(2), item(1)]; await store.refresh();
  assert.deepEqual(store.getSnapshot().newIds, [2]);
  assert.equal(store.getSnapshot().banner, true);
  store.dismissBanner(); await store.refresh();
  assert.equal(store.getSnapshot().banner, false);
  assert.deepEqual(store.getSnapshot().newIds, [2]);
  store.clearNew(); await store.refresh();
  assert.deepEqual(store.getSnapshot().newIds, []);
  items = [item(3), item(2), item(1)]; await store.refresh();
  assert.deepEqual(store.getSnapshot().newIds, [3]);
});

test("updates, reordering and notifications disappearing/reappearing do not repeat alerts", async () => {
  let items = [item(1), item(2)];
  const store = createNotificationStore({ fetchNotifications: async () => items, sendWorkoutNotification: async () => {} });
  await store.refresh(); items = [item(2, "改名")]; await store.refresh();
  items = [item(1), item(2, "改名")]; await store.refresh();
  assert.deepEqual(store.getSnapshot().newIds, []);
  items = [item(3), ...items]; await store.refresh();
  items = []; await store.refresh();
  assert.deepEqual(store.getSnapshot().items.map((value) => value.notification_id), [3, 2, 1]);
  assert.deepEqual(store.getSnapshot().newIds, [3]);
  assert.equal(store.getSnapshot().banner, true);
});

test("errors retain previously fetched data and new state, and recover on the next refresh", async () => {
  let fail = false;
  let items = [item(1)];
  const store = createNotificationStore({ fetchNotifications: async () => { if (fail) throw new Error("offline"); return items; }, sendWorkoutNotification: async () => {} });
  await store.refresh(); items = [item(2), item(1)]; await store.refresh();
  fail = true; await store.refresh();
  assert.equal(store.getSnapshot().error, "offline");
  assert.equal(store.getSnapshot().items.length, 2);
  assert.deepEqual(store.getSnapshot().newIds, [2]);
  fail = false; await store.refresh();
  assert.equal(store.getSnapshot().error, "");
});

test("failure before initial success is not an empty or historical new inbox", async () => {
  let fail = true;
  const store = createNotificationStore({ fetchNotifications: async () => { if (fail) throw new Error("not implemented"); return [item(1)]; }, sendWorkoutNotification: async () => {} });
  await store.refresh(); assert.equal(store.getSnapshot().initialized, false);
  fail = false; await store.refresh();
  assert.equal(store.getSnapshot().initialized, true);
  assert.deepEqual(store.getSnapshot().newIds, []);
});

test("concurrent refreshes coalesce and session reset ignores late responses", async () => {
  const pending = deferred<WorkoutNotification[]>();
  let calls = 0;
  let signal: AbortSignal | undefined;
  const store = createNotificationStore({ fetchNotifications: async (options) => { calls++; signal = options?.signal; return pending.promise; }, sendWorkoutNotification: async () => {} });
  const a = store.refresh(); const b = store.refresh(); assert.equal(a, b);
  await tick(); assert.equal(calls, 1);
  store.reset(); assert.equal(signal?.aborted, true);
  pending.resolve([item(1)]); await a;
  assert.equal(store.getSnapshot().initialized, false);
  assert.deepEqual(store.getSnapshot().items, []);
});

test("POST is explicit, coalesces double clicks and never invents a received notification", async () => {
  const posted = deferred<void>(); let sends = 0;
  const store = createNotificationStore({ fetchNotifications: async () => [], sendWorkoutNotification: async () => { sends++; return posted.promise; } });
  await store.refresh(); assert.equal(sends, 0);
  const a = store.send(); const b = store.send(); assert.equal(a, b);
  await tick(); assert.equal(sends, 1); assert.equal(store.getSnapshot().sending, true);
  posted.resolve(); await a; await tick();
  assert.equal(store.getSnapshot().sending, false);
  assert.match(store.getSnapshot().sendFeedback, /受け付け/);
  assert.deepEqual(store.getSnapshot().items, []);
});

test("POST error stays visible without automatic resend, reset ignores late send completion", async () => {
  let sends = 0;
  const posted = deferred<void>();
  const store = createNotificationStore({ fetchNotifications: async () => [], sendWorkoutNotification: async () => { sends++; if (sends === 1) throw new Error("uncertain"); return posted.promise; } });
  await store.send(); await store.refresh();
  assert.equal(sends, 1); assert.equal(store.getSnapshot().sendError, "uncertain");
  const second = store.send(); await tick(); store.reset(); posted.resolve(); await second;
  assert.equal(store.getSnapshot().sendFeedback, "");
  assert.equal(store.getSnapshot().sending, false);
});

test("poller waits for completion, refreshes on visible/online wake and removes all work on stop", async () => {
  let available = true, wake = () => {}, scheduled: (() => void) | null = null, removed = false, calls = 0;
  const first = deferred<void>();
  const stop = startNotificationPolling(async () => { calls++; if (calls === 1) await first.promise; }, {
    available: () => available,
    onWake(callback) { wake = callback; return () => { removed = true; }; },
    schedule(callback, delay) { assert.equal(delay, NOTIFICATION_POLL_MS); scheduled = callback; return () => { scheduled = null; }; },
  });
  assert.equal(calls, 1); wake(); assert.equal(calls, 1); assert.equal(scheduled, null);
  first.resolve(); await tick(); assert.ok(scheduled);
  available = false; wake(); assert.equal(scheduled, null); assert.equal(calls, 1);
  available = true; wake(); await tick(); assert.equal(calls, 2);
  const timer = scheduled as unknown as () => void; timer(); await tick(); assert.equal(calls, 3);
  stop(); assert.equal(removed, true); assert.equal(scheduled, null); wake(); assert.equal(calls, 3);
});

test("poller starts paused when hidden and cannot reschedule after cleanup during a request", async () => {
  let visible = false, wake = () => {}, calls = 0, timers = 0;
  const pending = deferred<void>();
  const stop = startNotificationPolling(async () => { calls++; await pending.promise; }, {
    available: () => visible,
    onWake(callback) { wake = callback; return () => {}; },
    schedule() { timers++; return () => {}; },
  });
  assert.equal(calls, 0); visible = true; wake(); assert.equal(calls, 1);
  stop(); pending.resolve(); await tick(); assert.equal(timers, 0);
});

test("consumed deltas accumulate across empty polls and cap the retained inbox at 100", async () => {
  let items = [item(1)];
  const store = createNotificationStore({ fetchNotifications: async () => items, sendWorkoutNotification: async () => {} });
  await store.refresh(); items = []; await store.refresh();
  assert.deepEqual(store.getSnapshot().items.map((value) => value.notification_id), [1]);
  items = [item(2)]; await store.refresh();
  assert.deepEqual(store.getSnapshot().items.map((value) => value.notification_id), [2, 1]);
  assert.deepEqual(store.getSnapshot().newIds, [2]);
  items = Array.from({ length: 100 }, (_, i) => item(i + 3)); await store.refresh();
  assert.equal(store.getSnapshot().items.length, 100);
  assert.equal(store.getSnapshot().items[0].notification_id, 102);
  assert.ok(!store.getSnapshot().newIds.includes(2));
  store.reset(); assert.deepEqual(store.getSnapshot().items, []);
});
