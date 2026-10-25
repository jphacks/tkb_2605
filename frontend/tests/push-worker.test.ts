import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/push-sw.js", import.meta.url), "utf8");
function worker(windows: unknown[] = []) {
  const handlers = new Map<string, (event: Record<string, unknown>) => void>();
  const notifications: { title: string; options: Record<string, unknown> }[] = [];
  const opened: string[] = [];
  const self = {
    location: { origin: "https://workout.example" },
    addEventListener: (type: string, handler: (event: Record<string, unknown>) => void) => handlers.set(type, handler),
    registration: { showNotification: async (title: string, options: Record<string, unknown>) => { notifications.push({ title, options }); } },
    clients: { matchAll: async () => windows, openWindow: async (url: string) => { opened.push(url); }, claim: async () => {} },
    skipWaiting: async () => {},
  };
  vm.runInNewContext(source, { self, URL });
  return { notifications, opened, handlers, async dispatch(type: string, event: Record<string, unknown>) {
    let completion: Promise<unknown> = Promise.resolve();
    handlers.get(type)!({ ...event, waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion;
  } };
}

test("background push displays generic lock-screen text, stable dedup tag, and refreshes open apps", async () => {
  const messages: unknown[] = [];
  const sw = worker([{ postMessage: (value: unknown) => messages.push(value) }]);
  await sw.dispatch("push", { data: { json: () => ({ notification_id: 42, notifier_name: "private name", url: "https://evil.example" }) } });
  assert.equal(sw.notifications[0].title, "WORKOUT");
  assert.equal(sw.notifications[0].options.tag, "workout-42");
  assert.equal(sw.notifications[0].options.renotify, false);
  assert.equal(JSON.stringify(sw.notifications).includes("private name"), false);
  assert.equal(JSON.stringify(sw.notifications).includes("evil.example"), false);
  assert.equal(JSON.stringify(messages), '[{"type":"workout-push-received"}]');
  assert.equal(sw.handlers.has("fetch"), false);
});

test("empty, malformed and invalid-id payloads still show visible notifications", async () => {
  for (const data of [null, { json: () => { throw new Error("bad JSON"); } }, { json: () => ({ notification_id: -1 }) }]) {
    const sw = worker(); await sw.dispatch("push", { data });
    assert.equal(sw.notifications.length, 1); assert.equal(sw.notifications[0].options.tag, "workout");
  }
});

test("notification click focuses an existing app and never follows payload URLs", async () => {
  let destination = ""; let focused = false; let closed = false;
  const sw = worker([{ url: "https://workout.example/", navigate: async (url: string) => { destination = url; return { focus: async () => { focused = true; } }; } }]);
  await sw.dispatch("notificationclick", { notification: { data: { url: "https://evil.example" }, close: () => { closed = true; } } });
  assert.equal(destination, "https://workout.example/notifications"); assert.equal(focused, true); assert.equal(closed, true); assert.equal(sw.opened.length, 0);
});

test("click opens notification page when no window exists or a closing window cannot navigate", async () => {
  for (const windows of [[], [{ url: "https://workout.example/", navigate: async () => { throw new Error("window closed"); } }]]) {
    const sw = worker(windows); await sw.dispatch("notificationclick", { notification: { close: () => {} } });
    assert.deepEqual(sw.opened, ["https://workout.example/notifications"]);
  }
});
