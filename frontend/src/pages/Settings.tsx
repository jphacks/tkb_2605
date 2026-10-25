import { Link } from "react-router";
import { useAuth } from "../features/auth/useAuth.ts";
import { paths } from "../routes.ts";

export default function Settings() {
  const { user } = useAuth();
  return <section className="profile-page profile-unavailable">
    <h1>アカウント</h1>
    <dl className="account-details"><dt>名前</dt><dd>{user?.user_name}</dd><dt>メールアドレス</dt><dd>{user?.email}</dd></dl>
    <p>名前・メールアドレス・パスワードの変更は現在準備中です。</p>
    <Link className="profile-action" to={paths.profileEdit}>プロフィールの表示を編集</Link>
    <p><Link to={paths.home}>ホームに戻る</Link></p>
  </section>;
}
