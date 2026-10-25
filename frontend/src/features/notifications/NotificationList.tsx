import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../../components/Icon.tsx";
import { profilePath } from "../../routes.ts";
import { useNotifications } from "./context.ts";

const dayFormat = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo" });
const timeFormat = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });

export default function NotificationList() {
  const { items, newIds, initialized, refreshing, error, refresh, clearNew } = useNotifications();
  const [onlyNew, setOnlyNew] = useState(false);
  const visible = onlyNew ? items.filter((item) => newIds.includes(item.notification_id)) : items;
  const days = [...new Set(visible.map((item) => dayFormat.format(new Date(item.notified_at))))];
  return <div className="notifications-list">
    <div className="notifications-toolbar">
      <div role="group" aria-label="通知の絞り込み" className="notifications-filters">
        <button type="button" aria-pressed={!onlyNew} onClick={() => setOnlyNew(false)}>すべて</button>
        <button type="button" aria-pressed={onlyNew} onClick={() => setOnlyNew(true)}>新着{newIds.length > 0 && <span className="notification-badge">{newIds.length}</span>}</button>
      </div>
      <button type="button" className="notifications-refresh" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "更新中…" : "更新"}</button>
    </div>
    <p className="notifications-note">表示中は15秒ごとに更新します。新着は、この利用中に新しく取得した通知です。</p>
    {newIds.length > 0 && <button type="button" className="notifications-clear" onClick={clearNew}>新着の表示をクリア</button>}
    {error && <div className="notifications-error"><p role="alert">{error}</p>{initialized && <p>前回取得した内容を表示しています。</p>}<button type="button" disabled={refreshing} onClick={() => void refresh()}>再試行</button></div>}
    {!initialized && !error && <p className="notifications-empty" role="status">通知を読み込んでいます…</p>}
    {days.map((day) => <section key={day} className="notifications-day" aria-label={day}>
      <h2>{day}<span>JST</span></h2>
      <ul>{visible.filter((item) => dayFormat.format(new Date(item.notified_at)) === day).map((item) => <li key={item.notification_id} className={newIds.includes(item.notification_id) ? "notification-item notification-new" : "notification-item"}>
        <span className="notification-kind"><Icon name="dumbbell" /></span>
        <div className="notification-content">
          <div className="notification-meta"><span>筋トレ通知</span><time dateTime={item.notified_at}>{timeFormat.format(new Date(item.notified_at))}</time>{newIds.includes(item.notification_id) && <strong>新着</strong>}</div>
          <p><Link to={profilePath(String(item.notifier_id))}>{item.notifier_name}</Link>さんから筋トレの通知が届きました。</p>
        </div>
      </li>)}</ul>
    </section>)}
    {initialized && !error && !visible.length && <div className="notifications-empty"><Icon name="bell" size={30} /><h2>{onlyNew ? "新着の通知はありません" : "通知はまだありません"}</h2><p>{onlyNew ? "新しく通知を取得すると、ここに表示します。" : "届いた筋トレ通知をここに表示します。"}</p></div>}
    {initialized && <p className="notifications-note">最新100件まで表示します。</p>}
  </div>;
}
