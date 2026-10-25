import { Link } from "react-router";
import { Icon } from "../components/Icon.tsx";
import NotificationList from "../features/notifications/NotificationList.tsx";
import { paths } from "../routes.ts";

export default function Notifications() {
  return <section className="notifications-page" aria-labelledby="notifications-title">
    <header className="notifications-header">
      <Link to={paths.home} aria-label="ホームに戻る" className="notifications-back"><Icon name="arrow-left" /></Link>
      <div><p>NOTIFICATIONS</p><h1 id="notifications-title">通知</h1></div>
      <Icon name="bell" size={26} />
    </header>
    <NotificationList />
  </section>;
}
