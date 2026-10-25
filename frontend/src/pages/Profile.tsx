import { useState } from "react";
import { Link, useParams } from "react-router";
import { paths } from "../routes.ts";
import { ProfileAvatar } from "../features/profile/ProfileAvatar.tsx";
import { profilePosts, profileSamples, type ProfileSample } from "../features/profile/samples.ts";
import "../features/profile/profile.css";

function ProfileContent({ user }: { user: ProfileSample }) {
  const ownProfile = user.id === "me";
  const [following, setFollowing] = useState(user.following);
  const [notice, setNotice] = useState("");
  const posts = profilePosts.filter((post) => post.userId === user.id).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  function toggleFollow() {
    setFollowing((value) => !value);
    setNotice(following ? "サンプルのフォローを解除しました。" : "サンプルでフォローしました。");
  }

  return <section className="profile-page">
    <header className="profile-topbar"><Link to={paths.home} aria-label="ホームに戻る">←</Link><h1>プロフィール<span>PROFILE</span></h1></header>
    <section className="profile-body" aria-label={user.name + "のプロフィール"}>
      <div className="profile-head"><ProfileAvatar user={user} large /></div>
      <svg className="profile-outline profile-shoulders" viewBox="0 0 640 112" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path fill="var(--brand-soft)" d="M294 61v25c-33 10-78 11-138 17-35 3-57 5-71 9h470c-14-4-36-6-71-9-60-6-105-7-138-17V61Z" />
        <path d="M294 61v25c-33 10-78 11-138 17-35 3-57 5-71 9M346 61v25c33 10 78 11 138 17 35 3 57 5 71 9M294 86l26 17 26-17M320 103v9" />
      </svg>
      <div className="profile-chest">
        <svg className="profile-outline" viewBox="0 0 640 90" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path fill="var(--brand-soft)" d="M85 0h470l25 90H60Z" />
          <path d="M85 0 60 90M555 0l25 90M320 0v83M116 2c52-2 126-2 192 0v77c-55 8-137 7-192-2ZM524 2c-52-2-126-2-192 0v77c55 8 137 7 192-2Z" />
        </svg>
        <div className="profile-chest-content"><div className="profile-identity"><h2>{user.name}</h2><span>@{user.handle}</span></div>
          {ownProfile ? <Link className="profile-action" to={paths.profileEdit}>プロフィールを編集</Link> : <button type="button" className={"profile-action" + (following ? " profile-following" : "")} aria-pressed={following} onClick={toggleFollow}>{following ? "フォロー中" : "フォロー"}</button>}
        </div>
      </div>
    </section>
    <div className="profile-bio"><p>{user.bio}</p></div>
    <section className="profile-timeline" aria-labelledby="profile-timeline-title">
      <header className="profile-timeline-heading"><h2 id="profile-timeline-title">投稿</h2><span>{posts.length} 件の表示例</span></header>
      <p className="profile-sample-notice">プロフィール・投稿・フォローは表示用サンプルです。フォロー操作は相手に通知されず、再読み込みで元に戻ります。</p>
      {notice && <p role="status" className="profile-feedback">{notice}</p>}
      {posts.length ? posts.map((post) => <article key={post.id} className="profile-post">
        <ProfileAvatar user={user} />
        <div className="profile-post-main"><div className="profile-post-meta"><strong>{user.name}</strong><span>@{user.handle}</span><time dateTime={post.date}>{new Date(post.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</time></div><p>{post.text}</p>{post.image && <img src={post.image} alt="トレーニングルームのイメージ（サンプル）" loading="lazy" />}</div>
      </article>) : <p className="profile-empty">まだ投稿がありません。</p>}
    </section>
  </section>;
}

export default function Profile() {
  const { userId } = useParams<"userId">();
  const user = import.meta.env.DEV ? profileSamples.find((item) => item.id === userId) : undefined;
  if (!user) return <section className="profile-page profile-unavailable"><h1>プロフィールを表示できません</h1><p>ユーザー情報の取得機能は準備中です。</p><Link className="profile-action" to={paths.home}>ホームに戻る</Link></section>;
  return <ProfileContent key={user.id} user={user} />;
}
