import { Link, useSearchParams } from "react-router";
import Page from "../components/Page.tsx";
import { paths, workoutExercisePath } from "../routes.ts";

export default function Recommendations() {
  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get("workoutId") || "preview";

  return (
    <Page title="初心者向けおすすめ" description="器具・部位から初心者向けの種目を探す画面です。">
      <p className="text-sm text-gray-600">おすすめの種目も、通常の種目選択と同じ記録画面に進みます。</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link to={workoutExercisePath(workoutId, "preview")} className="rounded-lg border border-gray-300 px-4 py-3">
          種目の記録画面へ（仮のおすすめ）
        </Link>
        <Link to={paths.home} className="text-emerald-800 underline">ホームに戻る</Link>
      </div>
    </Page>
  );
}
