import { Link } from "react-router";
import { Icon } from "../../components/Icon.tsx";
import { notificationPresentation } from "./presentation.ts";
import { useNotifications } from "./context.ts";

const dayFormat = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo" });
const timeFormat = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });

export default function NotificationList() {
  const { items, newIds, initialized, refreshing, error, refresh, clearNew } = useNotifications();
  const visible = items;
  const days = [...new Set(visible.map((item) => dayFormat.format(new Date(item.notified_at))))];
  return <div className="notifications-list">
    <div className="notifications-toolbar">
      <h2>通知</h2>
      <button type="button" className="notifications-refresh" onClick={() => void refresh()}>更新</button>
    </div>
    <p className="notifications-note">表示中は1秒ごとに新着を確認します。取得した通知は、この画面を閉じるまで保持します。</p>
    {newIds.length > 0 && <button type="button" className="notifications-clear" onClick={clearNew}>新着の表示をクリア</button>}
    {error && <div className="notifications-error"><p role="alert">{error}</p>{initialized && <p>前回取得した内容を表示しています。</p>}<button type="button" disabled={refreshing} onClick={() => void refresh()}>再試行</button></div>}
    {!initialized && !error && <p className="notifications-empty" role="status">通知を読み込んでいます…</p>}
    {days.map((day) => <section key={day} className="notifications-day" aria-label={day}>
      <h2>{day}<span>JST</span></h2>
      <ul>{visible.filter((item) => dayFormat.format(new Date(item.notified_at)) === day).map((item) => { const notice = notificationPresentation(item); return <li key={item.notification_id} className={newIds.includes(item.notification_id) ? "notification-item notification-new" : "notification-item"}>
        <span className="notification-kind"><Icon name={item.notification_type === "post_liked" ? "arm" : "dumbbell"} /></span>
        <div className="notification-content">
          <div className="notification-meta"><span>{notice.label}</span><time dateTime={item.notified_at}>{timeFormat.format(new Date(item.notified_at))}</time>{newIds.includes(item.notification_id) && <strong>新着</strong>}</div>
          <p><Link to={notice.profileHref} state={{ profile: { id: String(item.notifier_id), name: item.notifier_name } }}>{item.notifier_name}</Link>さんが{notice.postHref ? <><Link to={notice.postHref}>{notice.postLabel}</Link>にいいねしました。</> : "トレーニングを開始しました。"}</p>
        </div>
      </li>; })}</ul>
    </section>)}
    {initialized && !error && !visible.length && <div className="notifications-empty"><Icon name="bell" size={30} /><h2>通知はまだありません</h2><p>トレーニング開始と、あなたの投稿へのいいねをお知らせします。</p></div>}
    {initialized && <p className="notifications-note">この利用中に取得した最新100件を表示します。再読み込みや別端末では、取得済みの通知は再表示されません。</p>}
  </div>;
}
