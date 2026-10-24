import { Link, useParams } from "react-router";
import Page from "../components/Page.tsx";
import { paths } from "../routes.ts";

export default function WorkoutResults() {
  const { workoutId } = useParams<"workoutId">();

  return (
    <Page title="結果" description="今回のメニュー表示・結果の共有を実装する画面です。">
      <p className="break-all">トレーニングID：{workoutId}</p>
      <Link to={paths.home} className="inline-block rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white">
        閉じてホームに戻る
      </Link>
    </Page>
  );
}
