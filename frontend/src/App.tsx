import NotificationProvider from "./features/notifications/NotificationProvider.tsx";
import Notifications from "./pages/Notifications.tsx";
import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import ProtectedRoutes from "./components/ProtectedRoutes.tsx";
import type { ComposeLocationState } from "./features/posts/navigation.ts";
import AppShell from "./components/AppShell.tsx";
import AppLayout from "./layouts/AppLayout.tsx";
import PostDetail from "./pages/PostDetail.tsx";
import Chats from "./pages/Chats.tsx";
import Compose from "./pages/Compose.tsx";
import Exercises from "./pages/Exercises.tsx";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import Recommendations from "./pages/Recommendations.tsx";
import WorkoutRecord from "./pages/WorkoutRecord.tsx";
import WorkoutResults from "./pages/WorkoutResults.tsx";
import Profile from "./pages/Profile.tsx";
import ProfileEditPlaceholder from "./pages/ProfileEditPlaceholder.tsx";
import { refreshSession } from "./features/auth/session.ts";
import { useAuth } from "./features/auth/useAuth.ts";
import Settings from "./pages/Settings.tsx";
import { paths } from "./routes.ts";

export default function App() {
  const location = useLocation();
  const state = location.state as ComposeLocationState | null;
  const auth = useAuth();
  useEffect(() => {
    void refreshSession();
    const refresh = () => { if (document.visibilityState === "visible") void refreshSession(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    let channel: BroadcastChannel | null = null;
    try { channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("workout-auth"); } catch { /* Focus refresh remains available. */ }
    if (channel) channel.onmessage = (event) => { if (event.data === "session-changed") void refreshSession(); };
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); channel?.close(); };
  }, []);
  const backgroundLocation = auth.status === "authenticated" && location.pathname === paths.compose
    && state?.backgroundLocation?.pathname !== paths.compose
    ? state?.backgroundLocation
    : undefined;

  return (
    <NotificationProvider key={auth.revision} enabled={auth.status === "authenticated"}>
      <Routes location={backgroundLocation ?? location}>
        <Route path={paths.login} element={<Login />} />
        <Route element={<ProtectedRoutes />}>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path={paths.compose} element={<><Home /><Compose /></>} />
          </Route>
          <Route element={<AppLayout />}>
            <Route path="/posts/:postId" element={<PostDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path={paths.profile} element={<Profile />} />
            <Route path={paths.profileEdit} element={<ProfileEditPlaceholder />} />
            <Route path={paths.chats} element={<Chats />} />
            <Route path={paths.recommendations} element={<Recommendations />} />
            <Route path={paths.exercises} element={<Exercises />} />
            <Route path={paths.workoutExercise} element={<WorkoutRecord />} />
            <Route path={paths.workoutResults} element={<WorkoutResults />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {backgroundLocation && (
        <Routes>
          <Route element={<ProtectedRoutes />}>
            <Route path={paths.compose} element={<Compose />} />
          </Route>
        </Routes>
      )}
    </NotificationProvider>
  );
}
