import { createWorkout, type Workout } from "../../api/workouts.ts";
import { workoutSessionVersion } from "./session.ts";

import { requestDevicePush } from "../notifications/devicePush.ts";

let inFlight: { version: number; promise: Promise<Workout> } | null = null;

// Coalesce concurrent clicks only; each later explicit start creates a new server record.
export async function startWorkout({ onStarted }: { onStarted?: () => Promise<void> } = {}): Promise<Workout> {
  const version = workoutSessionVersion();
  if (inFlight?.version === version) return inFlight.promise;
  void requestDevicePush();
  const promise = createWorkout().then(async (workout) => {
    if (version === workoutSessionVersion()) await onStarted?.();
    return workout;
  });
  inFlight = { version, promise };
  try { return await promise; }
  finally { if (inFlight?.promise === promise) inFlight = null; }
}
