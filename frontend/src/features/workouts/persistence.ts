import { completeWorkout, fetchWorkout, saveWorkoutSets, WorkoutApiError, type WorkoutSetInput } from "../../api/workouts.ts";

const defaultApi = { completeWorkout, fetchWorkout, saveWorkoutSets };

// A lost write response may already be committed. Reconcile by GET, never repeat the write automatically.
export async function persistSets(workoutId: string, workoutExerciseId: string, input: WorkoutSetInput[], api = defaultApi) {
  try { return await api.saveWorkoutSets(workoutExerciseId, input); }
  catch (cause) {
    if (!(cause instanceof WorkoutApiError) || cause.writeOutcome !== "unknown") throw cause;
    const saved = await api.fetchWorkout(workoutId).catch(() => null);
    const exercise = saved?.exercises.find((item) => item.workout_exercise_id === workoutExerciseId);
    if (exercise && exercise.sets.length === input.length && input.every((expected) => exercise.sets.some((set) =>
      set.set_number === expected.set_number && set.reps === expected.reps && Number(set.weight) === Number(expected.weight)))) {
      return { workout_exercise_id: workoutExerciseId, sets: exercise.sets };
    }
    throw cause;
  }
}

export async function finishWorkout(workoutId: string, api = defaultApi) {
  try { return await api.completeWorkout(workoutId); }
  catch (cause) {
    if (!(cause instanceof WorkoutApiError) || cause.writeOutcome !== "unknown") throw cause;
    const saved = await api.fetchWorkout(workoutId).catch(() => null);
    if (saved?.is_completed) return saved;
    throw cause;
  }
}
