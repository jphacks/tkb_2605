import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import { PageHeader } from "../components/PageHeader.tsx";
import { useSocial } from "../features/social/useSocial.ts";

export default function Settings() {
  const { currentUser, updateProfile } = useSocial();
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [saved, setSaved] = useState(false);
  const isChanged = name.trim() !== currentUser.name || bio.trim() !== currentUser.bio;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    updateProfile({ name: name.trim(), bio: bio.trim() });
    setSaved(true);
  }

  return (
    <>
      <PageHeader title="プロフィール・設定" subtitle="あなたらしさを、仲間に伝えよう。" />
      <div className="page-content">
        <form className="settings-form" onSubmit={submit}>
          <div className="settings-identity"><Avatar user={currentUser} size="large" linked={false} /><div><strong>{currentUser.name}</strong><p className="muted">@{currentUser.handle}</p></div></div>
          <label className="form-field" htmlFor="profile-name"><span>表示名 <span className="muted">（必須）</span></span><input id="profile-name" className="field" value={name} maxLength={40} required onChange={(event) => { setName(event.target.value); setSaved(false); }} autoComplete="nickname" /><span className="form-hint muted">40文字以内で入力してください。</span></label>
          <label className="form-field" htmlFor="profile-bio"><span>自己紹介</span><textarea id="profile-bio" className="field" rows={5} maxLength={160} value={bio} onChange={(event) => { setBio(event.target.value); setSaved(false); }} placeholder="好きなトレーニングや目標を書いてみよう" aria-describedby="bio-count" /><span id="bio-count" className="character-count">{bio.length} / 160</span></label>
          <div className="form-actions"><Link className="secondary-button" to={`/profile/${currentUser.id}`}>プロフィールを見る</Link><button className="primary-button" disabled={!name.trim() || !isChanged} type="submit"><Icon name="check" size={18} />変更を保存</button></div>
          {saved && <p className="success-message" role="status">プロフィールを更新しました。</p>}
        </form>
      </div>
    </>
  );
}
