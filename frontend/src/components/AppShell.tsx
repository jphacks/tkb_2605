import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { currentUser, homePreview } from "../features/social/seed.ts";
import { PendingNavigationContext } from "../features/home/navigation.ts";
import { PendingLink } from "./PendingLink.tsx";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";

export default function AppShell() {
  const { posts, notifications } = homePreview;
  const [notice, setNotice] = useState("");
  const unread = notifications.filter((notification) => !notification.read).length;
  return <PendingNavigationContext.Provider value={setNotice}><div className="app-shell">
    <a className="skip-link" href="#main-content">メインコンテンツへ</a>
    <aside className="sidebar">
      <Link to="/" className="brand" aria-label="WORKOUT ホーム"><span className="brand-symbol"><Icon name="dumbbell" size={24} /></span><span>WORKOUT<span className="brand-caption">MOVE. SHARE. GROW.</span></span></Link>
      <nav className="desktop-nav" aria-label="メインナビゲーション">
        <NavLink to="/" end><Icon name="home" />ホーム<span className="nav-active-dot" /></NavLink>
        <PendingLink to="/notifications"><Icon name="bell" />通知{unread > 0 && <span className="notification-count">{unread}</span>}</PendingLink>
        <PendingLink to={`/profile/${currentUser.id}`}><Icon name="user" />プロフィール</PendingLink>
        <PendingLink to="/settings"><Icon name="settings" />設定</PendingLink>
      </nav>
      <PendingLink to="/compose" className="sidebar-compose primary-button"><Icon name="plus" size={20} />投稿する</PendingLink>
      <div className="sidebar-bottom"><span className="small-label">ONE MORE REP. ONE MORE STEP.</span><PendingLink className="account-link" to={`/profile/${currentUser.id}`}><Avatar user={currentUser} size="small" linked={false} /><span><strong>{currentUser.name}</strong><small>@{currentUser.handle}</small></span><Icon name="chevron-right" size={17} /></PendingLink></div>
    </aside>
    <main id="main-content" className="main-column">
      <Outlet />
    </main>
    <aside className="right-sidebar" aria-label="あなたのプロフィールとトレーニングのヒント">
      <div className="community-label"><span /> YOUR DAILY TRAINING CLUB</div>
      <section className="summary-card">
        <div className="summary-cover"><span>KEEP<br />MOVING.</span><Icon name="sparkles" size={40} /></div>
        <div className="summary-body"><Avatar user={currentUser} size="large" /><PendingLink className="summary-name" to={`/profile/${currentUser.id}`}>{currentUser.name}</PendingLink><span className="muted">@{currentUser.handle}</span><p>{currentUser.bio}</p>
          <div className="summary-stats"><span><strong>{posts.filter((post) => post.authorId === currentUser.id && !post.parentId).length}</strong>投稿</span><span><strong>{currentUser.followingIds.length}</strong>フォロー</span><span><strong>{currentUser.followerIds.length}</strong>フォロワー</span></div>
        </div>
      </section>
      <section className="tip-card"><span className="eyebrow"><Icon name="leaf" size={16} /> SMALL STEP, BIG CHANGE</span><h2>昨日の自分に、<br />ひとつプラス。</h2><p>短い時間でも大丈夫。<br />あなたのペースで、続けよう。</p><PendingLink to="/training/recommended">今日のメニューを探す<Icon name="arrow-right" size={17} /></PendingLink></section>
      <p className="sidebar-footnote">日々の積み重ねを、仲間と一緒に。<br /><span>© WORKOUT</span></p>
    </aside>
    <PendingLink className="floating-compose" to="/compose" aria-label="投稿を作成"><Icon name="plus" size={28} /></PendingLink>
    <nav className="mobile-nav" aria-label="モバイルナビゲーション">
      <NavLink to="/" end><Icon name="home" /><span>ホーム</span></NavLink>
      <PendingLink to="/training"><Icon name="dumbbell" /><span>トレーニング</span></PendingLink>
      <PendingLink to="/notifications"><span className="mobile-icon"><Icon name="bell" />{unread > 0 && <b className="mobile-badge">{unread}</b>}</span><span>通知</span></PendingLink>
      <PendingLink to={`/profile/${currentUser.id}`}><Icon name="user" /><span>マイページ</span></PendingLink>
    </nav>
    <div className="home-notice" role="status" aria-atomic="true">{notice && <><span>{notice}</span><button className="icon-button" type="button" aria-label="お知らせを閉じる" onClick={() => setNotice("")}><Icon name="close" size={18} /></button></>}</div>
  </div></PendingNavigationContext.Provider>;
}
