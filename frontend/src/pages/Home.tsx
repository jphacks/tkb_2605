import { useEffect, useRef, useState } from "react";
import { createSearchParams, Link, useNavigate } from "react-router";
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
  const [feed, setFeed] = useState<"following" | "followers" | "notifications">("following");
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
      const result = await startWorkout();
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
        <Link className="icon-button home-notification" to="/notifications" aria-label="通知を見る"><Icon name="bell" size={18} /></Link>
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
        <button type="button" className={feed === "following" ? "active" : ""} aria-pressed={feed === "following"} onClick={() => setFeed("following")}>フォロー中</button>
        <button type="button" className={feed === "followers" ? "active" : ""} aria-pressed={feed === "followers"} onClick={() => setFeed("followers")}>フォロワー</button>
        <button type="button" className={feed === "notifications" ? "active" : ""} aria-pressed={feed === "notifications"} onClick={() => setFeed("notifications")}>通知</button>
      </div>
      <div hidden={feed === "notifications"}>
        <p className="feed-note">フォロー・フォロワー別の表示は準備中です。現在は投稿一覧を表示しています。</p>
        <ApiTimeline />
      </div>
      {feed === "notifications" && <p className="feed-note" role="status">通知は準備中です。</p>}
    </section>
  </div>;
}
