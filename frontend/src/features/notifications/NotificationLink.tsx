import { Link } from "react-router";
import { Icon } from "../../components/Icon.tsx";
import { paths } from "../../routes.ts";
import { useNotifications } from "./context.ts";

export default function NotificationLink({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { newIds } = useNotifications();
  return <Link to={paths.notifications} className={className} aria-label={`通知を見る${newIds.length ? `（新着${newIds.length}件）` : ""}`}>
    <Icon name="bell" size={showLabel ? 22 : 18} />{showLabel && "通知"}
    {newIds.length > 0 && <span className="notification-badge" aria-hidden="true">{newIds.length}</span>}
  </Link>;
}
