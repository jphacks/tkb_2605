import assert from "node:assert/strict";
import { test } from "node:test";
import { createNotificationStore } from "../src/features/notifications/store.ts";
import { notificationPresentation } from "../src/features/notifications/presentation.ts";
import type { WorkoutNotification } from "../src/api/notifications.ts";
const start: WorkoutNotification = { notification_id: 1, notifier_id: 2, notifier_name: "A", notified_at: "2026-10-25T12:00:00+09:00" };
test("mixed start and targeted like deltas retain correct destinations through empty polls", async () => {
  let received = [start];
  const store = createNotificationStore({ fetchNotifications: async () => received, sendWorkoutNotification: async () => {} });
  await store.refresh();
  const like: WorkoutNotification = { ...start, notification_id: 2, notification_type: "post_liked", post_id: "post/with?reserved", post_excerpt: "今日の記録" };
  received = [like]; await store.refresh(); received = []; await store.refresh();
  assert.deepEqual(store.getSnapshot().items.map((item) => item.notification_id), [2, 1]);
  assert.deepEqual(store.getSnapshot().newIds, [2]);
  assert.deepEqual(notificationPresentation(like), { label: "いいね", profileHref: "/profile/2", postHref: "/posts/post%2Fwith%3Freserved", postLabel: "「今日の記録」" });
  assert.equal(notificationPresentation(start).postHref, null);
  assert.equal(notificationPresentation({ ...like, post_excerpt: "" }).postLabel, "あなたの投稿");
  store.reset(); assert.deepEqual(store.getSnapshot().items, []);
});
