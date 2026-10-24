import { Link } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { ApiTimeline } from "../components/ApiTimeline.tsx";
import { currentUser } from "../features/social/seed.ts";
import { paths } from "../routes.ts";

export default function Home() {
  return <>
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
      <div className="body-navigation">
        <svg className="body-lines upper-body" viewBox="0 0 640 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path className="body-fill" d="M296 52v30c-28 8-73 9-140 12-35 2-57 3-71 6h470c-14-3-36-4-71-6-67-3-112-4-140-12V52Z" />
          <path d="M296 52v30c-28 8-73 9-140 12-35 2-57 3-71 6M344 52v30c28 8 73 9 140 12 35 2 57 3 71 6M296 84l24 12 24-12M320 96v4" />
        </svg>
        <div className="head-avatar"><Avatar user={currentUser} size="large" /></div>
        <div className="chest-region">
          <svg className="body-lines" viewBox="0 0 640 64" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path className="body-fill" d="M85 0h470l25 64H60Z" />
            <path d="M85 0 60 64M555 0l25 64M320 0v58" />
          </svg>
          <div className="chest-actions">
            <Link to={paths.exercises} className="training-button training-start" aria-label="トレーニング開始"><Icon name="dumbbell" size={18} /><strong><span>トレーニング</span><span>開始</span></strong></Link>
            <Link to={paths.recommendations} className="training-button training-recommended" aria-label="おすすめトレーニング"><Icon name="sparkles" size={18} /><strong><span>おすすめ</span><span>トレーニング</span></strong></Link>
          </div>
        </div>
      </div>
    </section>
    </div>
    <section className="timeline-section" aria-labelledby="timeline-heading">
      <div className="timeline-heading"><h2 id="timeline-heading"><span>TIMELINE</span></h2><span className="timeline-live"><span />トレーニングの投稿</span></div>
      <ApiTimeline />
    </section>
  </>;
}
