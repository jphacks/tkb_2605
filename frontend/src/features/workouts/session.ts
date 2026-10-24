import type { Workout } from "../../api/workouts.ts";
import { readActiveWorkout, rememberWorkout } from "./activeWorkout.ts";

// Identity is learned only from a validated server response in this SPA session.
// No preview identity or cross-user storage index is used to choose a workout.
let knownUserId: number | null = null;
let activeWorkoutId: string | null = null;
const completedWorkoutIds = new Set<string>();
let sessionVersion = 0;

export function acceptWorkout(workout: Workout): string {
  if (knownUserId !== workout.user_id) {
    activeWorkoutId = null;
    completedWorkoutIds.clear();
  }
  knownUserId = workout.user_id;
  if (workout.is_completed) {
    completedWorkoutIds.add(workout.workout_id);
    if (activeWorkoutId === workout.workout_id) activeWorkoutId = null;
  } else {
    completedWorkoutIds.delete(workout.workout_id);
    activeWorkoutId = workout.workout_id;
  }
  return rememberWorkout(workout);
}

export function knownActiveWorkoutId(): string | null {
  if (knownUserId === null) return null;
  const remembered = activeWorkoutId ?? readActiveWorkout(knownUserId);
  return remembered && !completedWorkoutIds.has(remembered) ? remembered : null;
}

export function workoutSessionVersion(): number { return sessionVersion; }

export function clearWorkoutSession(): void {
  knownUserId = null;
  activeWorkoutId = null;
  completedWorkoutIds.clear();
  sessionVersion += 1;
}
