import NotificationLink from "../features/notifications/NotificationLink.tsx";
import AccountControls from "./AccountControls.tsx";
import { Link, NavLink, Outlet } from "react-router";
import { usePreviewProfile } from "../features/profile/usePreviewProfile.ts";
import { paths } from "../routes.ts";
import { Avatar } from "./Avatar.tsx";
import ComposeLink from "./ComposeLink.tsx";
import { Icon } from "./Icon.tsx";

export default function AppShell() {
  const currentUser = usePreviewProfile();
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">メインコンテンツへ</a>
    <aside className="sidebar">
      <Link to="/" className="brand" aria-label="WORKOUT ホーム"><span className="brand-symbol"><Icon name="dumbbell" size={24} /></span><span>WORKOUT<span className="brand-caption">MOVE. SHARE. GROW.</span></span></Link>
      <nav className="desktop-nav" aria-label="メインナビゲーション">
        <NavLink to="/" end><Icon name="home" />ホーム<span className="nav-active-dot" /></NavLink>
        <Link to={paths.chats}><Icon name="message" />チャット</Link>
        <NotificationLink showLabel />
        <Link to={`/profile/${currentUser.id}`}><Icon name="user" />プロフィール</Link>
        <Link to="/settings"><Icon name="settings" />設定</Link>
      </nav>
      <ComposeLink className="sidebar-compose primary-button"><Icon name="plus" size={20} />投稿する</ComposeLink>
      <div className="sidebar-bottom"><span className="small-label">ONE MORE REP. ONE MORE STEP.</span><Link className="account-link" to={`/profile/${currentUser.id}`}><Avatar user={currentUser} size="small" linked={false} /><span><strong>{currentUser.name}</strong><small>あなたのプロフィール</small></span><Icon name="chevron-right" size={17} /></Link></div>
    </aside>
    <main id="main-content" className="main-column">
      <AccountControls />
      <Outlet />
    </main>
    <aside className="right-sidebar" aria-label="あなたのプロフィールとトレーニングのヒント">
      <div className="community-label"><span /> YOUR DAILY TRAINING CLUB</div>
      <section className="summary-card">
        <div className="summary-cover"><span>KEEP<br />MOVING.</span><Icon name="sparkles" size={40} /></div>
        <div className="summary-body"><Avatar user={currentUser} size="large" /><Link className="summary-name" to={`/profile/${currentUser.id}`}>{currentUser.name}</Link><span className="muted">あなたのプロフィール</span><p>{currentUser.bio}</p>
        </div>
      </section>
      <section className="tip-card"><span className="eyebrow"><Icon name="leaf" size={16} /> SMALL STEP, BIG CHANGE</span><h2>昨日の自分に、<br />ひとつプラス。</h2><p>短い時間でも大丈夫。<br />あなたのペースで、続けよう。</p><Link to={paths.recommendations}>今日のメニューを探す<Icon name="arrow-right" size={17} /></Link></section>
      <p className="sidebar-footnote">日々の積み重ねを、仲間と一緒に。<br /><span>© WORKOUT</span></p>
    </aside>
    <ComposeLink className="floating-compose" aria-label="投稿を作成"><Icon name="plus" size={28} /></ComposeLink>
  </div>;
}
