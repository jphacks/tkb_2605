import { Link } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { useSocial } from "../features/social/useSocial.ts";

const labels = { like: "あなたの投稿にいいねしました", reply: "あなたの投稿に返信しました", follow: "あなたをフォローしました" };

export default function Notifications() {
  const { notifications, users, posts, markNotificationsRead } = useSocial();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <>
      <PageHeader title="通知" subtitle="仲間からのリアクションが届いています。" />
      <div className="notification-toolbar"><span className="muted">{unreadCount ? `${unreadCount} 件の未読` : "すべて確認済み"}</span><button className="secondary-button" type="button" disabled={!unreadCount} onClick={markNotificationsRead}><Icon name="check" size={16} />すべて既読にする</button></div>
      <div className="notification-list">
        {[...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((notification) => {
          const actor = users.find((user) => user.id === notification.actorId);
          const post = posts.find((item) => item.id === notification.postId);
          if (!actor) return null;
          return (
            <Link key={notification.id} className={`notification-item${notification.read ? "" : " unread"}`} to={notification.postId ? `/posts/${notification.postId}` : `/profile/${actor.id}`}>
              <Avatar user={actor} linked={false} />
              <div className="notification-copy"><p><strong>{actor.name}</strong>さんが{labels[notification.type]}</p>{post?.text && <p className="muted notification-preview">{post.text}</p>}<time className="muted" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString("ja-JP", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>
              {!notification.read && <span className="unread-dot" aria-label="未読" />}
            </Link>
          );
        })}
      </div>
      {!notifications.length && <div className="empty-state"><Icon name="bell" size={32} /><h2>通知はまだありません</h2><p className="muted">フォローや投稿へのリアクションがここに届きます。</p></div>}
    </>
  );
}
