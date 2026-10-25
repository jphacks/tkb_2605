import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { profilePath } from "../routes.ts";
import { avatarColors, getOwnProfile, updateProfile, type Profile } from "../api/profiles.ts";
import { acceptProfile } from "../features/profile/currentProfile.ts";
import { refreshSession } from "../features/auth/session.ts";
import { useAuth } from "../features/auth/useAuth.ts";
import "../features/profile/profile.css";

function Editor({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const [name, setName] = useState(profile.user_name);
  const [bio, setBio] = useState(profile.bio);
  const [color, setColor] = useState(profile.avatar_color);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      const saved = await updateProfile({ user_name: name, bio, avatar_color: color });
      if (!mounted.current) return;
      acceptProfile(saved);
      await refreshSession();
      if (mounted.current) void navigate(profilePath(saved.user_id));
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : "保存できませんでした。"); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  return <form className="profile-editor" onSubmit={(event) => void save(event)} aria-busy={busy}>
    <p className="profile-editor-notice">名前・自己紹介・アイコンの色を保存します。</p>
    <div className="profile-editor-avatar"><Avatar user={{ id: profile.user_id, name: name || "あなた", bio, color, avatar: "mint" }} linked={false} size="large" /><span>アイコンの色</span></div>
    <fieldset className="profile-colors" disabled={busy}><legend className="visually-hidden">アイコンの色</legend>{avatarColors.map((value, index) => <label key={value} style={{ backgroundColor: value }}><input type="radio" name="avatar-color" value={value} checked={color === value} onChange={() => setColor(value)} /><span>カラー{index + 1}</span></label>)}</fieldset>
    <label className="profile-field"><span>名前 <small>{[...name].length} / 50</small></span><input required maxLength={100} readOnly={busy} value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" /></label>
    <label className="profile-field"><span>自己紹介 <small>{[...bio].length} / 160</small></span><textarea rows={5} maxLength={320} readOnly={busy} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="トレーニングの目標や好きな種目など" /></label>
    {error && <p className="profile-form-error" role="alert">{error}</p>}
    <div className="profile-editor-actions">{!busy && <Link className="profile-cancel" to={profilePath(profile.user_id)}>キャンセル</Link>}<button className="profile-action" type="submit" disabled={busy}>{busy ? "保存中…" : "保存"}</button></div>
  </form>;
}
export default function ProfileEdit() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getOwnProfile(controller.signal).then((value) => { if (!controller.signal.aborted) setProfile(value); }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "読み込めませんでした。"); });
    return () => controller.abort();
  }, [attempt]);
  return <section className="profile-page"><header className="profile-topbar"><Link to={profilePath(user?.user_id ?? "me")} aria-label="編集をキャンセル"><Icon name="arrow-left" /></Link><h1>プロフィールを編集<span>EDIT PROFILE</span></h1></header>{profile ? <Editor profile={profile} /> : <div className="profile-empty">{error ? <><p role="alert">{error}</p><button className="profile-action" onClick={() => setAttempt((value) => value + 1)}>再試行</button></> : <p role="status">プロフィールを読み込んでいます…</p>}</div>}</section>;
}
