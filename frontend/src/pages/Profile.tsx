import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { paths } from "../routes.ts";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import BodyFrame from "../components/BodyFrame.tsx";
import { ApiTimeline } from "../components/ApiTimeline.tsx";
import { profileNameFromState } from "../features/profile/preview.ts";
import { usePreviewProfile } from "../features/profile/usePreviewProfile.ts";
import "../features/profile/profile.css";

function ProfileContent({ userId, name }: { userId: string; name: string | null }) {
  const own = userId === "me";
  const preview = usePreviewProfile();
  const [author, setAuthor] = useState(name);
  const [added, setAdded] = useState(false);
  const [notice, setNotice] = useState("");
  const user = own ? preview : { id: userId, name: author ?? "ユーザー", bio: "", avatar: "mint" as const };
  return <section className="profile-page">
    <header className="profile-topbar"><Link to={paths.home} aria-label="ホームに戻る"><Icon name="arrow-left" /></Link><h1>プロフィール<span>PROFILE</span></h1></header>
    <section className="profile-body" aria-label={user.name + "のプロフィール"}>
      <BodyFrame head={<Avatar user={user} size="large" linked={false} />}>
        <div className="profile-identity"><h2 title={user.name}>{user.name}</h2><span>{own ? "YOUR PROFILE" : "ID: " + userId}</span></div>
        {own ? <Link className="profile-action" to={paths.profileEdit}>プロフィールを編集</Link>
          : <button type="button" className="profile-action" disabled={added} onClick={() => { setAdded(true); setNotice("表示例としてマスメイトになりました。相手には送信されません。"); }}>{added ? "マスメイト" : "マスメイトになる"}</button>}
      </BodyFrame>
    </section>
    <div className="profile-bio"><p>{own ? user.bio || "自己紹介を追加してみましょう。" : "自己紹介・アイコンはユーザー情報APIの接続後に表示されます。"}</p></div>
    <p className="profile-sample-notice">{own ? "ダミープロフィールです。編集内容はこのタブ内だけに反映され、再読み込みで戻ります。" : "投稿者のIDと名前を表示しています。マスメイトへの追加は表示用のダミーです。"}</p>
    {notice && <p className="profile-feedback" role="status">{notice}</p>}
    <section className="profile-timeline" aria-labelledby="profile-timeline-title">
      <header className="profile-timeline-heading"><h2 id="profile-timeline-title">TIMELINE</h2><span>{own ? "あなたの投稿" : user.name + "の投稿"}</span></header>
      {own ? <div className="profile-empty"><Icon name="message" size={28} /><p>認証接続後に、あなたの投稿が表示されます。</p></div> : <ApiTimeline key={userId} userId={userId} onAuthor={setAuthor} />}
    </section>
  </section>;
}
export default function Profile() {
  const { userId = "" } = useParams<"userId">();
  const { state } = useLocation();
  return <ProfileContent key={userId} userId={userId} name={profileNameFromState(userId, state)} />;
}
