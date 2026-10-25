import { Link } from "react-router";
import { Icon } from "../components/Icon.tsx";
import NotificationList from "../features/notifications/NotificationList.tsx";
import PushSettings from "../features/notifications/PushSettings.tsx";
import { useNotifications } from "../features/notifications/context.ts";
import { paths } from "../routes.ts";

export default function Notifications() {
  const { send, sending, sendFeedback, sendError } = useNotifications();
  return <section className="notifications-page" aria-labelledby="notifications-title">
    <header className="notifications-header">
      <Link to={paths.home} aria-label="ホームに戻る" className="notifications-back"><Icon name="arrow-left" /></Link>
      <div><p>NOTIFICATIONS</p><h1 id="notifications-title">通知</h1></div>
      <Icon name="bell" size={26} />
    </header>
    <section className="notification-send" aria-labelledby="notification-send-title">
      <h2 id="notification-send-title">筋トレすることを知らせる</h2>
      <p>全員に筋トレの通知を送ります。</p>
      <button type="button" className="primary-button" disabled={sending} onClick={() => void send()}><Icon name="dumbbell" size={18} />{sending ? "送信中…" : "全員に筋トレ通知を送る"}</button>
      <p role="status">{sendFeedback}</p>
      {sendError && <p className="notifications-error" role="alert">{sendError}</p>}
    </section>
    <PushSettings />
    <NotificationList />
  </section>;
}
