import { useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import ProtectedRoutes from "./components/ProtectedRoutes.tsx";
import type { ComposeLocationState } from "./features/posts/navigation.ts";
import AppLayout from "./layouts/AppLayout.tsx";
import Chats from "./pages/Chats.tsx";
import Compose from "./pages/Compose.tsx";
import Exercises from "./pages/Exercises.tsx";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import Recommendations from "./pages/Recommendations.tsx";
import WorkoutRecord from "./pages/WorkoutRecord.tsx";
import WorkoutResults from "./pages/WorkoutResults.tsx";
import { paths } from "./routes.ts";

export default function App() {
  const location = useLocation();
  const state = location.state as ComposeLocationState | null;
  const [previewEnabled, setPreviewEnabled] = useState(false);
  // TODO: Add the authenticated session once the backend login API is available.
  // Preview access is development-only and is never treated as an authenticated user.
  const allowPreview = import.meta.env.DEV && previewEnabled;
  const backgroundLocation = allowPreview && location.pathname === paths.compose
    && state?.backgroundLocation?.pathname !== paths.compose
    ? state?.backgroundLocation
    : undefined;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route path={paths.login} element={<Login onPreview={() => setPreviewEnabled(true)} />} />
        <Route element={<ProtectedRoutes allowAccess={allowPreview} />}>
          <Route element={<AppLayout onExitPreview={() => setPreviewEnabled(false)} />}>
            <Route index element={<Home />} />
            <Route path={paths.compose} element={<><Home /><Compose /></>} />
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
          <Route element={<ProtectedRoutes allowAccess={allowPreview} />}>
            <Route path={paths.compose} element={<Compose />} />
          </Route>
        </Routes>
      )}
    </>
  );
}
