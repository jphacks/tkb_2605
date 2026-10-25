import { generatePath } from "react-router";

export const paths = {
  login: "/login",
  home: "/",
  compose: "/compose",
  chats: "/chats",
  notifications: "/notifications",
  recommendations: "/recommendations",
  exercises: "/exercises",
  workoutExercise: "/workouts/:workoutId/exercises/:exerciseId",
  workoutResults: "/workouts/:workoutId/results",
  profile: "/profile/:userId",
  profileEdit: "/profile/me/edit",
} as const;

export function workoutExercisePath(workoutId: string, exerciseId: string) {
  return generatePath(paths.workoutExercise, { workoutId: encodeURIComponent(workoutId), exerciseId: encodeURIComponent(exerciseId) });
}

export function workoutResultsPath(workoutId: string) {
  return generatePath(paths.workoutResults, { workoutId: encodeURIComponent(workoutId) });
}

export function profilePath(userId: string) {
  return generatePath(paths.profile, { userId: encodeURIComponent(userId) });
}
