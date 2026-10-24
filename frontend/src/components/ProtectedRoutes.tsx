import { Navigate, Outlet, useLocation } from "react-router";
import { paths } from "../routes.ts";

export default function ProtectedRoutes({ allowAccess }: { allowAccess: boolean }) {
  const location = useLocation();

  if (!allowAccess) {
    return (
      <Navigate
        to={paths.login}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  return <Outlet />;
}
