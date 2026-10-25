import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { paths, profilePath } from "../routes.ts";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import BodyFrame from "../components/BodyFrame.tsx";
import { ApiTimeline } from "../components/ApiTimeline.tsx";
import { becomeMasmates, getProfile, type Profile as UserProfile } from "../api/profiles.ts";
import { useAuth } from "../features/auth/useAuth.ts";
import "../features/profile/profile.css";

function ProfileContent({ userId }: { userId: string }) {
  const { user: account } = useAuth();
  const own = userId === account?.user_id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getProfile(userId, controller.signal).then((value) => { if (!controller.signal.aborted) { setProfile(value); setError(""); } }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "読み込めませんでした。"); });
    return () => controller.abort();
  }, [userId, attempt]);
  async function connect() {
    if (busy) return;
    setBusy(true); setActionError("");
    try { setProfile(await becomeMasmates(userId)); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "追加できませんでした。"); }
    finally { setBusy(false); }
  }
  return <section className="profile-page">
    <header className="profile-topbar"><Link to={paths.home} aria-label="ホームに戻る"><Icon name="arrow-left" /></Link><h1>プロフィール<span>PROFILE</span></h1><Link to={paths.masmates}>マスメイトを探す</Link></header>
    {!profile ? <div className="profile-empty">{error ? <><p role="alert">{error}</p><button className="profile-action" onClick={() => setAttempt((value) => value + 1)}>再試行</button></> : <p role="status">プロフィールを読み込んでいます…</p>}</div> : <>
      <section className="profile-body" aria-label={profile.user_name + "のプロフィール"}>
        <BodyFrame head={<Avatar user={{ id: profile.user_id, name: profile.user_name, bio: profile.bio, color: profile.avatar_color, avatar: "mint" }} size="large" linked={false} />}>
          <div className="profile-identity"><h2 title={profile.user_name}>{profile.user_name}</h2><span>{own ? "YOUR PROFILE" : "ID: " + userId}</span></div>
          {own ? <Link className="profile-action" to={paths.profileEdit}>プロフィールを編集</Link> : <button className="profile-action" type="button" disabled={busy || profile.is_masmate} onClick={() => void connect()}>{busy ? "追加中…" : profile.is_masmate ? "マスメイト" : "マスメイトになる"}</button>}
        </BodyFrame>
      </section>
      <div className="profile-bio"><p>{profile.bio || "自己紹介はまだありません。"}</p></div>
      {actionError && <p className="profile-form-error" role="alert">{actionError}</p>}
      <section className="profile-timeline" aria-labelledby="profile-timeline-title">
        <header className="profile-timeline-heading"><h2 id="profile-timeline-title">TIMELINE</h2><span>{own ? "あなたの投稿" : profile.user_name + "の投稿"}</span></header>
        <ApiTimeline key={userId} userId={userId} />
      </section>
    </>}
  </section>;
}
export default function Profile() {
  const { userId = "" } = useParams<"userId">();
  const { user } = useAuth();
  if (userId === "me" && user) return <Navigate to={profilePath(user.user_id)} replace />;
  return <ProfileContent key={userId} userId={userId} />;
}
