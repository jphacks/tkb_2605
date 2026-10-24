import { generatePath } from "react-router";

export const paths = {
  login: "/login",
  home: "/",
  chats: "/chats",
  recommendations: "/recommendations",
  exercises: "/exercises",
  workoutExercise: "/workouts/:workoutId/exercises/:exerciseId",
  workoutResults: "/workouts/:workoutId/results",
} as const;

export function workoutExercisePath(workoutId: string, exerciseId: string) {
  return generatePath(paths.workoutExercise, { workoutId, exerciseId });
}

export function workoutResultsPath(workoutId: string) {
  return generatePath(paths.workoutResults, { workoutId });
}
