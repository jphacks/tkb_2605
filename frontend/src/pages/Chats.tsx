import { Link } from "react-router";
import Page from "../components/Page.tsx";
import { paths } from "../routes.ts";

export default function Chats() {
  return (
    <Page title="チャット" description="チャット一覧を表示する画面です。">
      <Link to={paths.home} className="text-brand underline">ホームに戻る</Link>
    </Page>
  );
}
