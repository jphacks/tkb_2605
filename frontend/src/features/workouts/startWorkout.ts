import { createWorkout, fetchWorkout, WorkoutApiError, type Workout } from "../../api/workouts.ts";
import { rememberWorkout } from "./activeWorkout.ts";
import { clearOperation, readOperation, writeOperation } from "./operationJournal.ts";
import { acceptWorkout, knownActiveWorkoutId, workoutSessionVersion } from "./session.ts";

export const uncertainStartMessage = "トレーニングの開始結果を確認できません。重複を防ぐため、再度の開始を停止しています。";

export class StartWorkoutUncertainError extends Error {
  constructor() { super(uncertainStartMessage); this.name = "StartWorkoutUncertainError"; }
}

export type StartedWorkout = { workout: Workout; storageWarning: string };
let inFlight: { version: number; promise: Promise<StartedWorkout> } | null = null;

async function begin(version: number): Promise<StartedWorkout> {
  if (readOperation("start") !== null) throw new StartWorkoutUncertainError();

  const activeId = knownActiveWorkoutId();
  if (activeId) {
    const active = await fetchWorkout(activeId);
    // Exiting the preview invalidates the known identity even while GET is pending.
    if (version !== workoutSessionVersion()) throw new Error("画面が切り替わったため、開始を中止しました。");
    const storageWarning = acceptWorkout(active);
    if (!active.is_completed) return { workout: active, storageWarning };
  }

  if (version !== workoutSessionVersion()) throw new Error("画面が切り替わったため、開始を中止しました。");
  if (readOperation("start") !== null) throw new StartWorkoutUncertainError();
  // Persist before sending so a reload cannot silently replay an uncertain POST.
  writeOperation("start", { kind: "start" });
  let workout: Workout;
  try {
    workout = await createWorkout();
  } catch (reason) {
    if (reason instanceof WorkoutApiError && (reason.writeOutcome === "not-sent" || reason.writeOutcome === "rejected")) {
      clearOperation("start");
      throw reason;
    }
    throw new StartWorkoutUncertainError();
  }
  clearOperation("start");
  // Storage failure does not turn a successful creation into a retryable POST.
  const storageWarning = version === workoutSessionVersion() ? acceptWorkout(workout) : rememberWorkout(workout);
  return { workout, storageWarning };
}

export async function startWorkout(): Promise<StartedWorkout> {
  const version = workoutSessionVersion();
  if (inFlight?.version === version) return inFlight.promise;
  const promise = begin(version);
  inFlight = { version, promise };
  try { return await promise; }
  finally { if (inFlight?.promise === promise) inFlight = null; }
}
