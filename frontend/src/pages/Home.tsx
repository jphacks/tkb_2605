import { useState } from "react";
import { Link } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { ApiTimeline } from "../components/ApiTimeline.tsx";
import { SampleNotifications } from "../components/SampleNotifications.tsx";
import { currentUser, homePreview } from "../features/social/seed.ts";
import { paths } from "../routes.ts";

export default function Home() {
  const { posts, notifications } = homePreview;
  const [sample, setSample] = useState(import.meta.env.DEV);
  const [likedIds, setLikedIds] = useState(() => posts.filter((post) => post.likedBy.includes(currentUser.id)).map((post) => post.id));
  const [feed, setFeed] = useState<"following" | "followers" | "notifications">("following");
  const connectedIds = feed === "following" ? currentUser.followingIds : currentUser.followerIds;
  const timeline = posts.filter((post) => !post.parentId && (post.authorId === currentUser.id || connectedIds.includes(post.authorId))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unread = sample ? notifications.filter((notification) => !notification.read).length : 0;

  return <>
    <div className="home-top">
    <header className="home-header">
      <h1>ホーム<span>HOME</span></h1>
      <div className="home-header-actions">
        <Link className="icon-button home-settings" to="/settings" aria-label="設定を開く"><Icon name="settings" size={18} /></Link>
        <Link className="icon-button home-notification" to="/notifications" aria-label={sample ? `通知の表示例を見る（未読${unread}件）` : "通知を見る"}><Icon name="bell" size={18} />{unread > 0 && <span className="unread-dot" />}</Link>
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
      <div className="timeline-heading"><h2 id="timeline-heading">タイムライン<span>TIMELINE</span></h2><span className="timeline-live"><span /> {sample ? "サンプル表示" : "トレーニングの投稿"}</span></div>
      {import.meta.env.DEV && <div className="feed-mode"><span>{sample ? "投稿・画像・フォロー・通知の表示例です。" : "投稿APIから取得します。"}</span><button type="button" onClick={() => setSample((value) => !value)}>{sample ? "投稿API表示" : "サンプルを見る"}</button></div>}
      {!sample ? <ApiTimeline /> : <>
      <div className="feed-tabs" role="group" aria-label="タイムラインの表示切り替え"><button className={feed === "following" ? "active" : ""} aria-pressed={feed === "following"} onClick={() => setFeed("following")}>フォロー中</button><button className={feed === "followers" ? "active" : ""} aria-pressed={feed === "followers"} onClick={() => setFeed("followers")}>フォロワー</button><button className={feed === "notifications" ? "active" : ""} aria-pressed={feed === "notifications"} onClick={() => setFeed("notifications")}>通知{unread > 0 && <span className="tab-badge">{unread}</span>}</button></div>
      {feed === "notifications" ? <SampleNotifications /> : <>
      <div className="quick-compose"><Avatar user={currentUser} size="small" /><Link to="/compose">今日のトレーニング、どうだった？<Icon name="image" size={21} /></Link></div>
      <div className="post-list">{timeline.length ? timeline.map((post) => <PostCard key={post.id} post={post} liked={likedIds.includes(post.id)} onToggleLike={() => setLikedIds((ids) => ids.includes(post.id) ? ids.filter((id) => id !== post.id) : [...ids, post.id])} />) : <div className="empty-state"><Icon name="message" size={30} /><h3>まだ投稿がありません</h3><p>最初のトレーニング記録をシェアしましょう。</p><Link className="primary-button" to="/compose">投稿を作成する</Link></div>}</div>
      {timeline.length > 0 && <div className="feed-end"><span /><Icon name="check" size={15} />ここまでの投稿をチェックしました<span /></div>}
      </>}
      </>}
    </section>
  </>;
}
