import { useState } from "react";
import { PendingLink as Link } from "../components/PendingLink.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { currentUser, homePreview } from "../features/social/seed.ts";

export default function Home() {
  const { posts, notifications } = homePreview;
  const [likedIds, setLikedIds] = useState(() => posts.filter((post) => post.likedBy.includes(currentUser.id)).map((post) => post.id));
  const [feed, setFeed] = useState<"following" | "followers">("following");
  const connectedIds = feed === "following" ? currentUser.followingIds : currentUser.followerIds;
  const timeline = posts.filter((post) => !post.parentId && (post.authorId === currentUser.id || connectedIds.includes(post.authorId))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unread = notifications.filter((notification) => !notification.read).length;

  return <>
    <div className="home-top">
    <header className="home-header"><h1>ホーム<span>HOME</span></h1><Link className="icon-button home-notification" to="/notifications" aria-label={`通知を見る（未読${unread}件）`}><Icon name="bell" size={18} />{unread > 0 && <span className="unread-dot" />}</Link></header>
    <section className="training-hero" aria-labelledby="training-heading">
      <h2 id="training-heading" className="visually-hidden">トレーニングを選ぶ</h2>
      <div className="body-navigation">
        <svg className="body-lines upper-body" viewBox="0 0 640 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path className="body-fill" d="M296 40v30c-28 12-73 13-140 19-35 3-57 6-71 11h470c-14-5-36-8-71-11-67-6-112-7-140-19V40Z" />
          <path d="M296 40v30c-28 12-73 13-140 19-35 3-57 6-71 11M344 40v30c28 12 73 13 140 19 35 3 57 6 71 11M296 74l24 18 24-18M320 92v8" />
        </svg>
        <div className="head-avatar"><Avatar user={currentUser} size="large" /></div>
        <div className="chest-region">
          <svg className="body-lines" viewBox="0 0 640 64" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path className="body-fill" d="M85 0h470l25 64H60Z" />
            <path d="M85 0 60 64M555 0l25 64M320 0v58M116 2c52-2 126-2 192 0v53c-55 8-137 7-192-2ZM524 2c-52-2-126-2-192 0v53c55 8 137 7 192-2Z" />
          </svg>
          <div className="chest-actions">
            <Link to="/training" className="training-button training-start" aria-label="トレーニングを始める"><Icon name="dumbbell" size={18} /><strong><span>トレーニング</span><span>を始める</span></strong></Link>
            <Link to="/training/recommended" className="training-button training-recommended" aria-label="おすすめトレーニング"><Icon name="sparkles" size={18} /><strong><span>おすすめ</span><span>トレーニング</span></strong></Link>
          </div>
        </div>
      </div>
    </section>
    </div>
    <section className="timeline-section" aria-labelledby="timeline-heading">
      <div className="timeline-heading"><h2 id="timeline-heading">タイムライン<span>TIMELINE</span></h2><span className="timeline-live"><span /> 仲間のトレーニング記録</span></div>
      <div className="feed-tabs" role="group" aria-label="タイムラインの表示切り替え"><button className={feed === "following" ? "active" : ""} aria-pressed={feed === "following"} onClick={() => setFeed("following")}>フォロー中</button><button className={feed === "followers" ? "active" : ""} aria-pressed={feed === "followers"} onClick={() => setFeed("followers")}>フォロワー</button><Link to="/notifications">通知{unread > 0 && <span className="tab-badge">{unread}</span>}</Link></div>
      <div className="quick-compose"><Avatar user={currentUser} size="small" /><Link to="/compose">今日のトレーニング、どうだった？<Icon name="image" size={21} /></Link></div>
      <div className="post-list">{timeline.length ? timeline.map((post) => <PostCard key={post.id} post={post} liked={likedIds.includes(post.id)} onToggleLike={() => setLikedIds((ids) => ids.includes(post.id) ? ids.filter((id) => id !== post.id) : [...ids, post.id])} />) : <div className="empty-state"><Icon name="message" size={30} /><h3>まだ投稿がありません</h3><p>最初のトレーニング記録をシェアしましょう。</p><Link className="primary-button" to="/compose">投稿を作成する</Link></div>}</div>
      {timeline.length > 0 && <div className="feed-end"><span /><Icon name="check" size={15} />ここまでの投稿をチェックしました<span /></div>}
    </section>
  </>;
}
