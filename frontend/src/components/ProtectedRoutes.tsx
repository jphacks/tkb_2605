import { Navigate, Outlet } from "react-router";
import { paths } from "../routes.ts";
import { useAuth } from "../features/auth/useAuth.ts";
import { refreshSession } from "../features/auth/session.ts";

export default function ProtectedRoutes() {
  const auth = useAuth();
  if (auth.status === "loading") return <main className="auth-status" role="status">ログイン状態を確認しています…</main>;
  if (auth.status === "error") return <main className="auth-status"><p role="alert">{auth.error}</p><button className="primary-button" onClick={() => void refreshSession()}>再試行</button></main>;

  if (auth.status !== "authenticated") {
    return (
      <Navigate
        to={paths.login}
        replace
      />
    );
  }

  return <Outlet key={auth.revision} />;
}
