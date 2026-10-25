import { useEffect, useRef, useState } from "react";
import { createSearchParams, Link, useNavigate } from "react-router";
import NotificationList from "../features/notifications/NotificationList.tsx";
import NotificationLink from "../features/notifications/NotificationLink.tsx";
import { useNotifications } from "../features/notifications/context.ts";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { ApiTimeline } from "../components/ApiTimeline.tsx";
import { usePreviewProfile } from "../features/profile/usePreviewProfile.ts";
import { startWorkout } from "../features/workouts/startWorkout.ts";
import { workoutSessionVersion } from "../features/workouts/session.ts";
import { paths } from "../routes.ts";
import BodyFrame from "../components/BodyFrame.tsx";

export default function Home() {
  const navigate = useNavigate();
  const { newIds, send } = useNotifications();
  const [feed, setFeed] = useState<"masmates" | "notifications">("masmates");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const locked = useRef(false);
  const mounted = useRef(true);
  const currentUser = usePreviewProfile();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function start() {
    if (locked.current) return;
    locked.current = true;
    setStarting(true);
    setStartError("");
    const version = workoutSessionVersion();
    const active = () => mounted.current && version === workoutSessionVersion();
    try {
      const result = await startWorkout({ onStarted: send });
      if (active()) await navigate({ pathname: paths.exercises, search: "?" + createSearchParams({ workoutId: result.workout_id }) });
    } catch (reason) {
      if (active()) {
        setStartError(reason instanceof Error ? reason.message : "トレーニングを開始できませんでした。");
      }
    } finally {
      locked.current = false;
      if (active()) setStarting(false);
    }
  }

  return <div className="home-page">
    <div className="home-top">
    <header className="home-header">
      <h1><span>HOME</span></h1>
      <div className="home-header-actions">
        <Link className="icon-button home-settings" to="/settings" aria-label="設定を開く"><Icon name="settings" size={18} /></Link>
        <NotificationLink className="icon-button home-notification" />
      </div>
    </header>
    <section className="training-hero" aria-labelledby="training-heading">
      <h2 id="training-heading" className="visually-hidden">トレーニングを選ぶ</h2>
      <BodyFrame head={<Avatar user={currentUser} size="large" />} busy={starting}>
            <button type="button" onClick={() => void start()} disabled={starting} className="training-button training-start" aria-label="トレーニング開始"><Icon name="dumbbell" size={18} /><strong><span>トレーニング</span><span>開始</span></strong></button>
            <Link to={paths.recommendations} className="training-button training-recommended" aria-label="おすすめトレーニング"><Icon name="sparkles" size={18} /><strong><span>おすすめ</span><span>トレーニング</span></strong></Link>
      </BodyFrame>
    </section>
    </div>
    {starting && <p className="feed-note" role="status">トレーニングを確認しています…</p>}
    {startError && <p className="feed-note feed-error" role="alert">{startError}</p>}
    <section className="timeline-section" aria-labelledby="timeline-heading">
      <div className="timeline-heading"><h2 id="timeline-heading"><span>TIMELINE</span></h2><span className="timeline-live"><span />{feed === "notifications" ? "通知" : "トレーニングの投稿"}</span></div>
      <div className="feed-tabs" role="group" aria-label="タイムラインの表示切り替え">
        <button type="button" className={feed === "masmates" ? "active" : ""} aria-pressed={feed === "masmates"} onClick={() => setFeed("masmates")}>マスメイト</button>
        <button type="button" className={feed === "notifications" ? "active" : ""} aria-pressed={feed === "notifications"} onClick={() => setFeed("notifications")} aria-label={newIds.length ? "通知、新着" + newIds.length + "件" : "通知"}><Icon name="bell" size={20} />{newIds.length > 0 && <span className="notification-badge">{newIds.length}</span>}</button>
      </div>
      <div hidden={feed === "notifications"}>
        <ApiTimeline />
      </div>
      {feed === "notifications" && <NotificationList />}
    </section>
  </div>;
}
