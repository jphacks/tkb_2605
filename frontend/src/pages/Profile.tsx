import { useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { paths, profilePath } from "../routes.ts";
import { Avatar } from "../components/Avatar.tsx";
import { Icon } from "../components/Icon.tsx";
import BodyFrame from "../components/BodyFrame.tsx";
import { ApiTimeline } from "../components/ApiTimeline.tsx";
import { profileNameFromState } from "../features/profile/preview.ts";
import { usePreviewProfile } from "../features/profile/usePreviewProfile.ts";
import { becomePreviewMasmates } from "../features/profile/masmates.ts";
import { usePreviewMasmates } from "../features/profile/usePreviewMasmates.ts";
import "../features/profile/profile.css";

function ProfileContent({ userId, name }: { userId: string; name: string | null }) {
  const preview = usePreviewProfile();
  const own = userId === preview.id;
  const [author, setAuthor] = useState(name);
  const isMasmate = usePreviewMasmates(preview.id, userId);
  const [notice, setNotice] = useState("");
  const user = own ? preview : { id: userId, name: author ?? "ユーザー", bio: "", avatar: "mint" as const };
  return <section className="profile-page">
    <header className="profile-topbar"><Link to={paths.home} aria-label="ホームに戻る"><Icon name="arrow-left" /></Link><h1>プロフィール<span>PROFILE</span></h1></header>
    <section className="profile-body" aria-label={user.name + "のプロフィール"}>
      <BodyFrame head={<Avatar user={user} size="large" linked={false} />}>
        <div className="profile-identity"><h2 title={user.name}>{user.name}</h2><span>{own ? "YOUR PROFILE" : "ID: " + userId}</span></div>
        {own ? <Link className="profile-action" to={paths.profileEdit}>プロフィールを編集</Link>
          : <button type="button" className="profile-action" disabled={isMasmate} onClick={() => { becomePreviewMasmates(preview.id, userId); setNotice("表示例としてマスメイトになりました。相手には送信されません。"); }}>{isMasmate ? "マスメイト" : "マスメイトになる"}</button>}
      </BodyFrame>
    </section>
    <div className="profile-bio"><p>{own ? user.bio || "自己紹介はまだありません。" : "自己紹介・アイコンはユーザー情報APIの接続後に表示されます。"}</p></div>
    <p className="profile-sample-notice">{own ? "名前はログイン中の登録情報です。自己紹介・アイコンの編集はこのタブ内の表示に反映され、再読み込み・ログアウトで戻ります。" : "マスメイトはどちらか一方の操作で成立し、承認や解除はありません。現在はダミーのため、このタブ内でのみ保持され、再読み込みで戻ります。"}</p>
    {notice && <p className="profile-feedback" role="status">{notice}</p>}
    <section className="profile-timeline" aria-labelledby="profile-timeline-title">
      <header className="profile-timeline-heading"><h2 id="profile-timeline-title">TIMELINE</h2><span>{own ? "あなたの投稿" : user.name + "の投稿"}</span></header>
      <ApiTimeline key={userId} userId={userId} onAuthor={own ? undefined : setAuthor} />
    </section>
  </section>;
}
export default function Profile() {
  const { userId = "" } = useParams<"userId">();
  const { state } = useLocation();
  const currentUser = usePreviewProfile();
  if (userId === "me") return <Navigate to={profilePath(currentUser.id)} replace />;
  return <ProfileContent key={userId} userId={userId} name={profileNameFromState(userId, state)} />;
}
