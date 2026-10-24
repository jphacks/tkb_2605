import { Link } from "react-router";
import { homePreview } from "../features/social/seed.ts";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";

export function SampleNotifications() {
  return <div aria-label="通知の表示例">{homePreview.notifications.map((notice) => {
    const actor = homePreview.users.find((user) => user.id === notice.actorId);
    if (!actor) return null;
    const text = notice.type === "follow" ? "あなたをフォローしました" : notice.type === "like" ? "あなたの投稿にいいねしました" : "あなたの投稿に返信しました";
    return <article className="post-card notification-card" key={notice.id}>
      <Avatar user={actor} />
      <div className="post-main">
        <div className="post-meta"><Icon name={notice.type === "like" ? "heart" : notice.type === "follow" ? "user" : "message"} size={16} /><Link className="post-author" to={"/profile/" + actor.id}>{actor.name}</Link>{!notice.read && <span className="unread-dot" aria-label="未読の表示例" />}</div>
        <Link className="post-content" to={notice.postId ? "/posts/" + notice.postId + (notice.type === "reply" ? "#reply" : "") : "/profile/" + actor.id}><p className="post-text">{text}</p></Link>
        <time className="notification-time" dateTime={notice.createdAt}>{new Date(notice.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
      </div>
    </article>;
  })}</div>;
}
