import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import Home from "./pages/Home.tsx";
import Compose from "./pages/Compose.tsx";
import PostDetail from "./pages/PostDetail.tsx";
import Profile from "./pages/Profile.tsx";
import Settings from "./pages/Settings.tsx";
import Training from "./pages/Training.tsx";
import Notifications from "./pages/Notifications.tsx";
import AppShell from "./components/AppShell.tsx";
import { SocialProvider } from "./features/social/store.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SocialProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/posts/:postId" element={<PostDetail />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/training" element={<Training />} />
            <Route path="/training/recommended" element={<Training />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<div className="empty-state"><h1>ページが見つかりません</h1><Link className="primary-button" to="/">ホームに戻る</Link></div>} />
          </Route>
          <Route path="/status" element={<Landing />} />
        </Routes>
      </SocialProvider>
    </BrowserRouter>
  </StrictMode>,
);
