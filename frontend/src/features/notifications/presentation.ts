import type { WorkoutNotification } from "../../api/notifications.ts";
export function notificationPresentation(item: WorkoutNotification) {
  const liked = item.notification_type === "post_liked";
  return {
    label: liked ? "いいね" : "トレーニング開始",
    profileHref: "/profile/" + encodeURIComponent(String(item.notifier_id)),
    postHref: liked && item.post_id ? "/posts/" + encodeURIComponent(item.post_id) : null,
    postLabel: item.post_excerpt ? "「" + item.post_excerpt + "」" : "あなたの投稿",
  };
}
