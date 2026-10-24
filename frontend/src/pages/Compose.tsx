import { Link, useLocation, useSearchParams } from "react-router";
import Page from "../components/Page.tsx";
import type { WorkoutResultsState } from "../features/workouts/results.ts";
import { paths, workoutResultsPath } from "../routes.ts";

// The posting feature will replace this placeholder. Keep the workout available
// in navigation state so the destination can prefill the shared menu.
export default function Compose() {
  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get("workoutId");
  const location = useLocation();
  const state = location.state as WorkoutResultsState | null;

  return (
    <Page title="投稿" description="投稿機能は準備中です。">
      <div className="flex flex-wrap gap-3">
        {workoutId && (
          <Link to={workoutResultsPath(workoutId)} state={state} className="inline-block rounded-lg border border-emerald-700 px-4 py-3 text-emerald-800">
            結果画面に戻る
          </Link>
        )}
        <Link to={paths.home} className="inline-block rounded-lg border border-emerald-700 px-4 py-3 text-emerald-800">ホームに戻る</Link>
      </div>
    </Page>
  );
}
