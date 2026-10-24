import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useSocial } from "../features/social/useSocial.ts";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";

export default function AppShell() {
  const { currentUser, posts, notifications, storageError } = useSocial();
  const { pathname, hash, key } = useLocation();
  const unread = notifications.filter((notification) => !notification.read).length;
  useEffect(() => {
    if (hash === "#reply") {
      document.getElementById("reply")?.scrollIntoView({ block: "start" });
      document.getElementById("reply-text")?.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash, key]);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">メインコンテンツへ</a>
    <aside className="sidebar">
      <Link to="/" className="brand" aria-label="WORKOUT ホーム"><span className="brand-symbol"><Icon name="dumbbell" size={24} /></span><span>WORKOUT<span className="brand-caption">MOVE. SHARE. GROW.</span></span></Link>
      <nav className="desktop-nav" aria-label="メインナビゲーション">
        <NavLink to="/" end><Icon name="home" />ホーム<span className="nav-active-dot" /></NavLink>
        <NavLink to="/notifications"><Icon name="bell" />通知{unread > 0 && <span className="notification-count">{unread}</span>}</NavLink>
        <NavLink to={`/profile/${currentUser.id}`}><Icon name="user" />プロフィール</NavLink>
        <NavLink to="/settings"><Icon name="settings" />設定</NavLink>
      </nav>
      <Link to="/compose" className="sidebar-compose primary-button"><Icon name="plus" size={20} />投稿する</Link>
      <div className="sidebar-bottom"><span className="small-label">ONE MORE REP. ONE MORE STEP.</span><Link className="account-link" to={`/profile/${currentUser.id}`}><Avatar user={currentUser} size="small" linked={false} /><span><strong>{currentUser.name}</strong><small>@{currentUser.handle}</small></span><Icon name="chevron-right" size={17} /></Link></div>
    </aside>
    <main id="main-content" className="main-column">
      {storageError && <div className="storage-warning" role="alert">{storageError}</div>}
      <Outlet />
    </main>
    <aside className="right-sidebar" aria-label="あなたのプロフィールとトレーニングのヒント">
      <div className="community-label"><span /> YOUR DAILY TRAINING CLUB</div>
      <section className="summary-card">
        <div className="summary-cover"><span>KEEP<br />MOVING.</span><Icon name="sparkles" size={40} /></div>
        <div className="summary-body"><Avatar user={currentUser} size="large" /><Link className="summary-name" to={`/profile/${currentUser.id}`}>{currentUser.name}</Link><span className="muted">@{currentUser.handle}</span><p>{currentUser.bio}</p>
          <div className="summary-stats"><span><strong>{posts.filter((post) => post.authorId === currentUser.id && !post.parentId).length}</strong>投稿</span><span><strong>{currentUser.followingIds.length}</strong>フォロー</span><span><strong>{currentUser.followerIds.length}</strong>フォロワー</span></div>
        </div>
      </section>
      <section className="tip-card"><span className="eyebrow"><Icon name="leaf" size={16} /> SMALL STEP, BIG CHANGE</span><h2>昨日の自分に、<br />ひとつプラス。</h2><p>短い時間でも大丈夫。<br />あなたのペースで、続けよう。</p><Link to="/training/recommended">今日のメニューを探す<Icon name="arrow-right" size={17} /></Link></section>
      <p className="sidebar-footnote">日々の積み重ねを、仲間と一緒に。<br /><span>© WORKOUT</span></p>
    </aside>
    <Link className="floating-compose" to="/compose" aria-label="投稿を作成"><Icon name="plus" size={28} /></Link>
    <nav className="mobile-nav" aria-label="モバイルナビゲーション">
      <NavLink to="/" end><Icon name="home" /><span>ホーム</span></NavLink>
      <NavLink to="/training"><Icon name="dumbbell" /><span>トレーニング</span></NavLink>
      <NavLink to="/notifications"><span className="mobile-icon"><Icon name="bell" />{unread > 0 && <b className="mobile-badge">{unread}</b>}</span><span>通知</span></NavLink>
      <NavLink to={`/profile/${currentUser.id}`}><Icon name="user" /><span>マイページ</span></NavLink>
    </nav>
  </div>;
}
