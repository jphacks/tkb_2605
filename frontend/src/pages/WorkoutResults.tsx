import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { fetchWorkout, WORKOUT_MOCK_NOTICE, type WorkoutDetail } from "../api/workouts.ts";
import { paths } from "../routes.ts";
import "./WorkoutResults.css";

type ResultsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; workout: WorkoutDetail };

function WorkoutResultsContent({ workoutId }: { workoutId: string }) {
  const [state, setState] = useState<ResultsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkout(workoutId, { signal: controller.signal }).then((workout) => {
      if (controller.signal.aborted) return;
      setState({ status: "success", workout });
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
        <p>{WORKOUT_MOCK_NOTICE}</p>
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
            <p>応答にメニューがありません</p>
          </div>
        ))}
      </div>

      <footer className="workout-results-actions">
        <button type="button" className="workout-results-share" disabled title="サンプルのため共有できません">共有</button>
        <Link to={paths.home} className="workout-results-close">閉じる</Link>
      </footer>
    </section>
  );
}

export default function WorkoutResults() {
  const { workoutId } = useParams<"workoutId">();
  return <WorkoutResultsContent key={workoutId} workoutId={workoutId ?? ""} />;
}
