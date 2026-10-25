import { Link } from "react-router";
import { profilePath } from "../routes.ts";
import "../features/profile/profile.css";

export default function ProfileEditPlaceholder() {
  return <section className="profile-page profile-unavailable">
    <h1>プロフィールを編集</h1>
    <p>プロフィール編集機能は準備中です。</p>
    <Link className="profile-action" to={profilePath("me")}>プロフィールに戻る</Link>
  </section>;
}
