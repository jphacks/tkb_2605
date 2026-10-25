import { Link } from "react-router";
import Page from "../components/Page.tsx";
import { paths } from "../routes.ts";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Page title="ページが見つかりません" description="URLを確認してください。">
        <Link to={paths.home} className="text-brand underline">ホームに戻る</Link>
      </Page>
    </main>
  );
}
