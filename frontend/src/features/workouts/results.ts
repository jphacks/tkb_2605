export type WorkoutSet = {
  workout_set_id: string;
  workout_exercise_id: string;
  set_number: number;
  reps: number;
  weight: number | string;
};

export type WorkoutExercise = {
  workout_exercise_id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
};

export type Exercise = {
  exercise_id: string;
  display_name: string;
};

// Frontend aggregate of the tables in issue #14, not a finalized API response.
export type WorkoutSummary = {
  workout_id: string;
  user_id: string;
  performed_at: string;
  workout_exercises: WorkoutExercise[];
  workout_sets: WorkoutSet[];
  exercises: Exercise[];
};

export type WorkoutResultsState = {
  workout: WorkoutSummary | null;
};

export function getWorkoutMenus(workout: WorkoutSummary | null) {
  if (!workout) return [];

  const exerciseNames = new Map(workout.exercises.map((exercise) => [exercise.exercise_id, exercise.display_name]));

  return workout.workout_exercises
    .filter((exercise) => exercise.workout_id === workout.workout_id)
    .sort((a, b) => a.position - b.position)
    .map((exercise) => ({
      workout_exercise_id: exercise.workout_exercise_id,
      display_name: exerciseNames.get(exercise.exercise_id) ?? "種目名未設定",
      sets: workout.workout_sets
        .filter((set) => set.workout_exercise_id === exercise.workout_exercise_id)
        .sort((a, b) => a.set_number - b.set_number),
    }))
    .filter((exercise) => exercise.sets.length > 0);
}

// Only used for the existing development preview workout, never for real IDs.
export const previewWorkout: WorkoutSummary = {
  workout_id: "preview",
  user_id: "preview-user",
  performed_at: new Date().toISOString(),
  exercises: [
    { exercise_id: "bench-press", display_name: "ベンチプレス" },
    { exercise_id: "lat-pulldown", display_name: "ラットプルダウン" },
    { exercise_id: "squat", display_name: "スクワット" },
  ],
  workout_exercises: [
    {
      workout_exercise_id: "preview-bench",
      workout_id: "preview",
      exercise_id: "bench-press",
      position: 1,
    },
    {
      workout_exercise_id: "preview-lat",
      workout_id: "preview",
      exercise_id: "lat-pulldown",
      position: 2,
    },
    {
      workout_exercise_id: "preview-squat",
      workout_id: "preview",
      exercise_id: "squat",
      position: 3,
    },
  ],
  workout_sets: [
    { workout_set_id: "bench-1", workout_exercise_id: "preview-bench", set_number: 1, weight: "40.0", reps: 10 },
    { workout_set_id: "bench-2", workout_exercise_id: "preview-bench", set_number: 2, weight: "40.0", reps: 10 },
    { workout_set_id: "bench-3", workout_exercise_id: "preview-bench", set_number: 3, weight: "40.0", reps: 8 },
    { workout_set_id: "lat-1", workout_exercise_id: "preview-lat", set_number: 1, weight: "30.0", reps: 12 },
    { workout_set_id: "lat-2", workout_exercise_id: "preview-lat", set_number: 2, weight: "30.0", reps: 10 },
    { workout_set_id: "squat-1", workout_exercise_id: "preview-squat", set_number: 1, weight: "0.0", reps: 15 },
    { workout_set_id: "squat-2", workout_exercise_id: "preview-squat", set_number: 2, weight: "0.0", reps: 15 },
  ],
};
