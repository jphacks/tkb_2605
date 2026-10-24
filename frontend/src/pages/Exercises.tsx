import { Link, useSearchParams } from "react-router";
import Page from "../components/Page.tsx";
import { paths, workoutExercisePath } from "../routes.ts";

export default function Exercises() {
  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get("workoutId") || "preview";

  return (
    <Page title="種目選択" description="部位による絞り込み・種目名での検索を追加する画面です。">
      <p className="text-sm text-gray-600">以下は画面遷移を確認するための仮の種目です。</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link to={workoutExercisePath(workoutId, "preview")} className="rounded-lg border border-gray-300 px-4 py-3">
          種目の記録画面へ
        </Link>
        <Link to={paths.home} className="text-emerald-800 underline">ホームに戻る</Link>
      </div>
    </Page>
  );
}
