import type { WorkoutDetail } from "../../api/workouts.ts";

export function workoutShareContent(workout: WorkoutDetail, caption = ""): string {
  if (!workout.is_completed) throw new Error("終了済みのトレーニングだけを共有できます。");
  const exercises = workout.exercises.filter((exercise) => exercise.sets.length > 0);
  if (!exercises.length) throw new Error("共有できるトレーニング記録がありません。");

  const menus = exercises.map((exercise) => [
    `${exercise.display_name}（${exercise.sets.length}セット）`,
    ...exercise.sets.map((set) => `セット${set.set_number}：${set.weight} kg × ${set.reps} 回`),
  ].join("\n"));
  return [caption.trim(), "トレーニング記録", ...menus].filter(Boolean).join("\n\n");
}
