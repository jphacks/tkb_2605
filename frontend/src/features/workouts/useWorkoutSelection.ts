import { useEffect, useRef, useState } from "react";
import { createSearchParams, useNavigate, useSearchParams } from "react-router";
import { addWorkoutExercise } from "../../api/workouts.ts";
import { paths, workoutExercisePath } from "../../routes.ts";
import type { SelectionScreen } from "../record/entry.ts";
import { workoutSessionVersion } from "./session.ts";
import { useNotifications } from "../notifications/context.ts";
import { startWorkout } from "./startWorkout.ts";

export function useWorkoutSelection(from: SelectionScreen) {
  const navigate = useNavigate();
  const { send } = useNotifications();
  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get("workoutId") ?? "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function select(exerciseId: string): Promise<void> {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    const version = workoutSessionVersion();
    const active = () => mounted.current && version === workoutSessionVersion();
    let id = workoutId;
    try {
      if (!exerciseId.trim()) throw new Error("種目を選択してください。");
      if (!id) {
        const started = await startWorkout({ onStarted: send });
        id = started.workout_id;
        if (!active()) return;
        await navigate({ pathname: paths[from], search: "?" + createSearchParams({ workoutId: id }) }, { replace: true });
      }
      if (!active()) return;
      const added = await addWorkoutExercise(id, exerciseId);
      if (!active()) return;
      // Use the saved workout-exercise instance, not a client-generated ID.
      void navigate({
        pathname: workoutExercisePath(id, added.exercise_id),
        search: "?" + createSearchParams({ workoutExerciseId: added.workout_exercise_id, from }),
      });
    } catch (reason) {
      if (active()) setError(reason instanceof Error ? reason.message : "記録APIに接続できませんでした。");
    } finally {
      locked.current = false;
      if (active()) setBusy(false);
    }
  }
  return { select, busy, error };
}
