import { createSearchParams, Link, useLocation, useParams } from "react-router";
import { getWorkoutMenus, previewWorkout, type WorkoutResultsState } from "../features/workouts/results.ts";
import { paths } from "../routes.ts";
import "./WorkoutResults.css";

export default function WorkoutResults() {
  const { workoutId } = useParams<"workoutId">();
  const location = useLocation();
  const state = location.state as WorkoutResultsState | null;
  const receivedWorkout = state?.workout && state.workout.workout_id === workoutId ? state.workout : null;
  const isSample = !receivedWorkout && import.meta.env.DEV && workoutId === previewWorkout.workout_id;
  const workout = receivedWorkout ?? (isSample ? previewWorkout : null);
  const exercises = getWorkoutMenus(workout);

  return (
    <section className="workout-results" aria-labelledby="workout-results-heading">
      <header className="workout-results-header">
        <h1 id="workout-results-heading">今日のメニュー</h1>
        {isSample && <p>サンプルの記録を表示しています</p>}
      </header>

      <div className="workout-results-content" tabIndex={0} role="region" aria-label="行ったメニュー">
        {exercises.length > 0 ? (
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
                      {Number(set.weight).toLocaleString("ja-JP", { maximumFractionDigits: 1, useGrouping: false })} kg × {set.reps} 回
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        ) : (
          <div className="workout-results-empty" role="status">
            <p>表示できるメニューがありません</p>
            <p>トレーニングを記録すると、ここにメニューが表示されます。</p>
          </div>
        )}
      </div>

      <footer className="workout-results-actions">
        <Link
          to={{ pathname: paths.compose, search: workoutId ? `?${createSearchParams({ workoutId })}` : "" }}
          state={{ workout } satisfies WorkoutResultsState}
          className="workout-results-share"
        >
          共有
        </Link>
        <Link to={paths.home} className="workout-results-close">閉じる</Link>
      </footer>
    </section>
  );
}
