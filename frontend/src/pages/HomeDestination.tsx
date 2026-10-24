import { Link } from "react-router";
import Page from "../components/Page.tsx";
import { paths } from "../routes.ts";

// Temporary destinations keep navigation usable until their individual screens land.
// The concrete /profile/:userId route in Issue #20 takes precedence over /profile/*.
export default function HomeDestination({ title }: { title: string }) {
  return <Page title={title} description="この画面は準備中です。">
    <p className="text-sm leading-7 text-gray-600">ホーム画面から移動しました。この機能はまだ利用できません。</p>
    <Link to={paths.home} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-5 py-2 text-sm font-semibold text-white">ホームに戻る</Link>
  </Page>;
}
