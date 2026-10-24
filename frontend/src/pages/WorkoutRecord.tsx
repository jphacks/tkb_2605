import { createSearchParams, Link, useParams } from "react-router";
import Page from "../components/Page.tsx";
import { paths, workoutResultsPath } from "../routes.ts";

export default function WorkoutRecord() {
  const { workoutId, exerciseId } = useParams<"workoutId" | "exerciseId">();

  if (!workoutId || !exerciseId) return null;

  return (
    <Page title="種目ごとの記録" description="セットの入力・追加・修正・削除を実装する画面です。">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-gray-200 p-4">
        <dt>トレーニングID</dt><dd className="break-all">{workoutId}</dd>
        <dt>種目ID</dt><dd className="break-all">{exerciseId}</dd>
      </dl>
      <div className="flex flex-wrap gap-3">
        <Link
          to={{ pathname: paths.exercises, search: `?${createSearchParams({ workoutId })}` }}
          className="rounded-lg border border-gray-300 px-4 py-3"
        >
          別の種目を選ぶ
        </Link>
        <Link to={workoutResultsPath(workoutId)} className="rounded-lg bg-emerald-700 px-4 py-3 font-medium text-white">
          結果画面へ
        </Link>
      </div>
    </Page>
  );
}
