import { createWorkout, type Workout } from "../../api/workouts.ts";
import { workoutSessionVersion } from "./session.ts";

let inFlight: { version: number; promise: Promise<Workout> } | null = null;

// Coalesce concurrent clicks only; each later explicit start creates a new server record.
export async function startWorkout(): Promise<Workout> {
  const version = workoutSessionVersion();
  if (inFlight?.version === version) return inFlight.promise;
  const promise = createWorkout();
  inFlight = { version, promise };
  try { return await promise; }
  finally { if (inFlight?.promise === promise) inFlight = null; }
}
