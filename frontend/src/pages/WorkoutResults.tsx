import { useEffect, useState } from "react";
import { createSearchParams, Link, useLocation, useParams } from "react-router";
import { fetchWorkout, type WorkoutDetail } from "../api/workouts.ts";
import { forgetWorkout } from "../features/workouts/activeWorkout.ts";
import { paths } from "../routes.ts";
import "./WorkoutResults.css";

type ResultsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; workout: WorkoutDetail; storageWarning: string };

function WorkoutResultsContent({ workoutId }: { workoutId: string }) {
  const location = useLocation();
  const [state, setState] = useState<ResultsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkout(workoutId, { signal: controller.signal }).then((workout) => {
      if (controller.signal.aborted) return;
      const storageWarning = workout.is_completed ? forgetWorkout(workout) : "";
      setState({ status: "success", workout, storageWarning });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setState({ status: "error", message: reason instanceof Error ? reason.message : "記録を取得できませんでした。" });
    });
    return () => controller.abort();
  }, [workoutId, attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  const workout = state.status === "success" ? state.workout : null;
  const exercises = workout?.exercises.filter((exercise) => exercise.sets.length > 0) ?? [];

  return (
    <section className="workout-results" aria-labelledby="workout-results-heading">
      <header className="workout-results-header">
        <h1 id="workout-results-heading">今日のメニュー</h1>
        {workout && <p>{workout.is_completed ? "トレーニング完了" : "トレーニングはまだ終了していません。保存済みの記録を表示しています。"}</p>}
        {state.status === "success" && state.storageWarning && <p className="workout-results-warning" role="status">{state.storageWarning}</p>}
      </header>

      <div className="workout-results-content" tabIndex={0} role="region" aria-label="行ったメニュー" aria-busy={state.status === "loading"}>
        {state.status === "loading" && <p className="workout-results-empty" role="status">記録を読み込んでいます…</p>}
        {state.status === "error" && <div className="workout-results-empty">
          <p className="workout-results-error" role="alert">{state.message}</p>
          <button type="button" className="workout-results-retry" onClick={retry}>再試行</button>
        </div>}
        {state.status === "success" && (exercises.length > 0 ? (
          <ol className="workout-results-list">
            {exercises.map((exercise) => (
              <li key={exercise.workout_exercise_id} className="workout-results-menu">
                <div className="workout-results-menu-heading">
                  <h2>{exercise.display_name}</h2>
                  <span>{exercise.sets.length}セット</span>
                </div>
                <ol className="workout-results-sets" aria-label={`${exercise.display_name}のセット`}>
                  {exercise.sets.map((set) => (
                    <li key={set.workout_set_id}>
                      <span className="workout-results-set-number">セット{set.set_number}</span>
                      <span>{set.weight} kg × {set.reps} 回</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        ) : (
          <div className="workout-results-empty" role="status">
            <p>保存済みのメニューがありません</p>
            <p>種目の記録が保存されると、ここに表示されます。</p>
          </div>
        ))}
      </div>

      <footer className="workout-results-actions">
        {workout?.is_completed ? <Link
          to={{ pathname: "/compose", search: `?${createSearchParams({ workoutId })}` }}
          state={{ backgroundLocation: location }}
          className="workout-results-share"
        >共有</Link> : <button type="button" className="workout-results-share" disabled>共有</button>}
        <Link to={paths.home} className="workout-results-close">閉じる</Link>
      </footer>
    </section>
  );
}

export default function WorkoutResults() {
  const { workoutId } = useParams<"workoutId">();
  return <WorkoutResultsContent key={workoutId} workoutId={workoutId ?? ""} />;
}
