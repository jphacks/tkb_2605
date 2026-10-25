import NotificationLink from "../features/notifications/NotificationLink.tsx";
import AccountControls from "./AccountControls.tsx";
import { Link, NavLink, Outlet } from "react-router";
import { useCurrentProfile } from "../features/profile/useCurrentProfile.ts";
import { paths } from "../routes.ts";
import { Avatar } from "./Avatar.tsx";
import ComposeLink from "./ComposeLink.tsx";
import { Icon } from "./Icon.tsx";

export default function AppShell() {
  const currentUser = useCurrentProfile();
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">メインコンテンツへ</a>
    <aside className="sidebar">
      <Link to="/" className="brand" aria-label="MUSCLE MATE ホーム"><span className="brand-symbol"><Icon name="dumbbell" size={24} /></span><span>MUSCLE MATE</span></Link>
      <nav className="desktop-nav" aria-label="メインナビゲーション">
        <NavLink to="/" end><Icon name="home" />ホーム<span className="nav-active-dot" /></NavLink>
        <Link to={paths.masmates}><Icon name="user" />マスメイト</Link>
        <Link to={paths.chats}><Icon name="message" />チャット</Link>
        <NotificationLink showLabel />
        <Link to={`/profile/${currentUser.id}`}><Icon name="user" />プロフィール</Link>
        <Link to="/settings"><Icon name="settings" />設定</Link>
      </nav>
      <ComposeLink className="sidebar-compose primary-button"><Icon name="plus" size={20} />投稿する</ComposeLink>
      <div className="sidebar-bottom"><Link className="account-link" to={`/profile/${currentUser.id}`}><Avatar user={currentUser} size="small" linked={false} /><span><strong>{currentUser.name}</strong><small>あなたのプロフィール</small></span><Icon name="chevron-right" size={17} /></Link></div>
    </aside>
    <main id="main-content" className="main-column">
      <AccountControls />
      <Outlet />
    </main>
    <aside className="right-sidebar" aria-label="プロフィールとおすすめトレーニング">
      <section className="summary-card">
        <div className="summary-cover"><Icon name="sparkles" size={40} /></div>
        <div className="summary-body"><Avatar user={currentUser} size="large" /><Link className="summary-name" to={`/profile/${currentUser.id}`}>{currentUser.name}</Link><span className="muted">あなたのプロフィール</span><p>{currentUser.bio}</p>
        </div>
      </section>
      <section className="tip-card"><Link to={paths.recommendations}>おすすめトレーニング<Icon name="arrow-right" size={17} /></Link></section>
      <p className="sidebar-footnote">© チーム_M1</p>
    </aside>
    <ComposeLink className="floating-compose" aria-label="投稿を作成"><Icon name="plus" size={28} /></ComposeLink>
  </div>;
}
