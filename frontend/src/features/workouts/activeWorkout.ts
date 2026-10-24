import type { Workout } from "../../api/workouts.ts";

export type ActiveWorkoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function validUserId(userId: unknown): userId is number {
  return typeof userId === "number" && Number.isSafeInteger(userId) && userId > 0;
}
function validId(workoutId: unknown): workoutId is string {
  return typeof workoutId === "string" && workoutId.trim().length > 0;
}
function validWorkout(workout: Workout): boolean {
  return workout !== null && typeof workout === "object" && validUserId(workout.user_id) &&
    validId(workout.workout_id) && typeof workout.is_completed === "boolean";
}
function key(userId: number): string { return `workout.active.v1:${userId}`; }

// Call only with the authenticated user's ID. A remembered ID is not an identity
// source or an authorization check; the server remains responsible for ownership.
export function readActiveWorkout(userId: number, storage?: ActiveWorkoutStorage): string | null {
  if (!validUserId(userId)) return null;
  try {
    const workoutId = (storage ?? globalThis.localStorage).getItem(key(userId));
    return validId(workoutId) ? workoutId : null;
  } catch {
    return null;
  }
}

// Supply a validated create/GET/PATCH response, never a preview identity or local ID.
// Browser persistence failures do not undo a successful server operation.
export function rememberWorkout(workout: Workout, storage?: ActiveWorkoutStorage): string {
  if (!validWorkout(workout)) return "トレーニングの情報を確認できないため、この端末の進行状況を更新できませんでした。";
  if (workout.is_completed) return forgetWorkout(workout, storage);
  try {
    (storage ?? globalThis.localStorage).setItem(key(workout.user_id), workout.workout_id);
    return "";
  } catch {
    return "この端末に進行中のトレーニングを保持できませんでした。再読み込み後に再開できない場合があります。";
  }
}

export function forgetWorkout(workout: Workout, storage?: ActiveWorkoutStorage): string {
  if (!validWorkout(workout)) return "トレーニングの情報を確認できないため、この端末の進行状況を更新できませんでした。";
  try {
    const target = storage ?? globalThis.localStorage;
    // An older workout finishing must not erase a newer active workout for this user.
    if (target.getItem(key(workout.user_id)) === workout.workout_id) target.removeItem(key(workout.user_id));
    return "";
  } catch {
    return "この端末の進行中トレーニングIDを削除できませんでした。";
  }
}
