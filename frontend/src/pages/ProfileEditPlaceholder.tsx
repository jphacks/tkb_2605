import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { profilePath } from "../routes.ts";
import { profileColors, savePreviewProfile } from "../features/profile/preview.ts";
import { usePreviewProfile } from "../features/profile/usePreviewProfile.ts";
import "../features/profile/profile.css";

export default function ProfileEditPlaceholder() {
  const navigate = useNavigate();
  const profile = usePreviewProfile();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [color, setColor] = useState(profile.color);
  const [error, setError] = useState("");
  function save(event: FormEvent) {
    event.preventDefault();
    try { savePreviewProfile({ name, bio, color }); void navigate(profilePath("me")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "入力を確認してください。"); }
  }
  return <section className="profile-page">
    <header className="profile-topbar"><Link to={profilePath("me")} aria-label="編集をキャンセル"><Icon name="arrow-left" /></Link><h1>プロフィールを編集<span>EDIT PROFILE</span></h1></header>
    <form className="profile-editor" onSubmit={save}>
      <p className="profile-editor-notice">認証接続前のダミー画面です。保存すると、このタブのプロフィールとホームに反映されます。サーバーには送信しません。</p>
      <div className="profile-editor-avatar"><Avatar user={{ ...profile, name: name || "あなた", color }} linked={false} size="large" /><span>アイコンの色</span></div>
      <fieldset className="profile-colors"><legend className="visually-hidden">アイコンの色</legend>{profileColors.map((value, index) => <label key={value} style={{ backgroundColor: value }}><input type="radio" name="avatar-color" value={value} checked={color === value} onChange={() => setColor(value)} /><span>カラー{index + 1}</span></label>)}</fieldset>
      <label className="profile-field"><span>名前 <small>{[...name].length} / 40</small></span><input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" /></label>
      <label className="profile-field"><span>自己紹介 <small>{[...bio].length} / 160</small></span><textarea rows={5} maxLength={320} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="トレーニングの目標や好きな種目など" /></label>
      {error && <p className="profile-form-error" role="alert">{error}</p>}
      <div className="profile-editor-actions"><Link className="profile-cancel" to={profilePath("me")}>キャンセル</Link><button className="profile-action" type="submit">保存（ダミー）</button></div>
    </form>
  </section>;
}
