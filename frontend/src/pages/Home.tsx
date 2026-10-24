import { useState } from "react";
import { Link } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { useSocial } from "../features/social/useSocial.ts";

export default function Home() {
  const { currentUser, posts, notifications } = useSocial();
  const [feed, setFeed] = useState<"following" | "followers">("following");
  const connectedIds = feed === "following" ? currentUser.followingIds : currentUser.followerIds;
  const timeline = posts.filter((post) => !post.parentId && (post.authorId === currentUser.id || connectedIds.includes(post.authorId))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unread = notifications.filter((notification) => !notification.read).length;

  return <>
    <header className="home-header"><div><h1>ホーム<span>HOME</span></h1><p>今日の頑張りを、みんなの力に。</p></div><Link className="icon-button home-notification" to="/notifications" aria-label={`通知を見る（未読${unread}件）`}><Icon name="bell" />{unread > 0 && <span className="unread-dot" />}</Link></header>
    <section className="training-hero" aria-labelledby="training-heading">
      <div className="hero-heading"><span className="eyebrow">READY FOR YOUR NEXT REP?</span><h2 id="training-heading">今日も、なりたい自分へ。</h2></div>
      <div className="body-navigation">
        <svg className="body-lines" viewBox="0 0 640 265" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path className="body-fill" d="M287 53v38c-22 18-49 22-82 29-45 8-74 20-89 52l-24 88h456l-24-88c-15-32-44-44-89-52-33-7-60-11-82-29V53Z" />
          <path d="M287 65v27c-22 17-49 21-82 28-45 8-74 20-89 52l-24 88M353 65v27c22 17 49 21 82 28 45 8 74 20 89 52l24 88M288 96l32 24 32-24M320 120v104M165 222c55 19 99 21 144 8M475 222c-55 19-99 21-144 8" />
          <path className="body-detail" d="m159 245-4 16m326-16 4 16M304 254h32" />
        </svg>
        <div className="head-avatar"><Avatar user={currentUser} size="large" /><span className="profile-hint">MY PAGE</span></div>
        <div className="chest-actions">
          <Link to="/training" className="training-button training-start"><span className="training-button-icon"><Icon name="dumbbell" size={23} /></span><span><strong>トレーニングを始める</strong><small>種目を選んで、自分のペースで</small></span><Icon name="arrow-right" size={17} /></Link>
          <Link to="/training/recommended" className="training-button training-recommended"><span className="training-button-icon"><Icon name="sparkles" size={23} /></span><span><strong>おすすめトレーニング</strong><small>今日のあなたに、ぴったりを</small></span><Icon name="arrow-right" size={17} /></Link>
        </div>
      </div>
      <p className="hero-footer"><span /> 小さな一歩が、大きな変化になる。</p>
    </section>
    <section className="timeline-section" aria-labelledby="timeline-heading">
      <div className="timeline-heading"><h2 id="timeline-heading">タイムライン<span>TIMELINE</span></h2><span className="timeline-live"><span /> 仲間のトレーニング記録</span></div>
      <div className="feed-tabs" role="group" aria-label="タイムラインの表示切り替え"><button className={feed === "following" ? "active" : ""} aria-pressed={feed === "following"} onClick={() => setFeed("following")}>フォロー中</button><button className={feed === "followers" ? "active" : ""} aria-pressed={feed === "followers"} onClick={() => setFeed("followers")}>フォロワー</button><Link to="/notifications">通知{unread > 0 && <span className="tab-badge">{unread}</span>}</Link></div>
      <div className="quick-compose"><Avatar user={currentUser} size="small" /><Link to="/compose">今日のトレーニング、どうだった？<Icon name="image" size={21} /></Link></div>
      <div className="post-list">{timeline.length ? timeline.map((post) => <PostCard key={post.id} post={post} />) : <div className="empty-state"><Icon name="message" size={30} /><h3>まだ投稿がありません</h3><p>最初のトレーニング記録をシェアしましょう。</p><Link className="primary-button" to="/compose">投稿を作成する</Link></div>}</div>
      {timeline.length > 0 && <div className="feed-end"><span /><Icon name="check" size={15} />ここまでの投稿をチェックしました<span /></div>}
    </section>
  </>;
}
