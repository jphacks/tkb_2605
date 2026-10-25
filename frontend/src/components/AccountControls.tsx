import { Link } from "react-router";
import { useAuth } from "../features/auth/useAuth.ts";
import { signOut } from "../features/auth/session.ts";
import { profilePath } from "../routes.ts";

export default function AccountControls() {
  const { user, error } = useAuth();
  if (!user) return null;
  return <div className="account-controls">
    <Link to={profilePath(user.user_id)}>{user.user_name}</Link>
    <button type="button" onClick={() => void signOut()}>ログアウト</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
