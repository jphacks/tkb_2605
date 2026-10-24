import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readWorkout, saveExercise, summarizeWorkout, type ExerciseRecord } from "../src/features/workouts/storage.ts";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } },
  } });
});
const chest = (): ExerciseRecord => ({ exerciseId: "push-up", name: "プッシュアップ", mode: "reps", sets: [{ id: "one", weight: 10, value: 12, completed: true }] });

test("saving an exercise preserves other exercises and reloads its edited sets", () => {
  assert.equal(saveExercise("workout", chest()).ok, true);
  assert.equal(saveExercise("workout", { ...chest(), exerciseId: "squat", name: "スクワット" }).ok, true);
  assert.equal(saveExercise("workout", { ...chest(), sets: [{ id: "edited", weight: 20, value: 8, completed: false }] }).ok, true);
  const records = readWorkout("workout").workout!.exercises;
  assert.equal(records.length, 2);
  assert.deepEqual(records.find((exercise) => exercise.exerciseId === "push-up")!.sets, [{ id: "edited", weight: 20, value: 8, completed: false }]);
  assert.equal(records.find((exercise) => exercise.exerciseId === "squat")!.sets[0].value, 12);
});

test("summary counts completed reps and time separately without inflating volume", () => {
  saveExercise("workout", { ...chest(), sets: [...chest().sets, { id: "draft", weight: 99, value: 99, completed: false }] });
  saveExercise("workout", { exerciseId: "plank", name: "プランク", mode: "seconds", sets: [{ id: "timer", weight: 5, value: 30, completed: true }] });
  assert.deepEqual(summarizeWorkout(readWorkout("workout").workout!), { exercises: 2, sets: 2, reps: 12, seconds: 30, volume: 120, pendingSets: 1 });
});

test("deleting all sets removes only that exercise", () => {
  saveExercise("workout", chest());
  saveExercise("workout", { ...chest(), exerciseId: "squat" });
  saveExercise("workout", { ...chest(), sets: [] });
  assert.deepEqual(readWorkout("workout").workout!.exercises.map((exercise) => exercise.exerciseId), ["squat"]);
});

test("invalid numeric input and duplicate set IDs cannot overwrite saved content", () => {
  saveExercise("workout", chest());
  const original = [...values.values()][0];
  for (const value of [0, -1, 1.5, 1000, Number.NaN]) {
    assert.equal(saveExercise("workout", { ...chest(), sets: [{ ...chest().sets[0], value }] }).ok, false);
  }
  assert.equal(saveExercise("workout", { ...chest(), sets: [chest().sets[0], chest().sets[0]] }).ok, false);
  assert.equal([...values.values()][0], original);
});

test("corrupt storage is reported and never silently replaced", () => {
  values.set("workout.records.v1:workout", "{not-json");
  assert.ok(readWorkout("workout").error);
  assert.equal(saveExercise("workout", chest()).ok, false);
  assert.equal(values.get("workout.records.v1:workout"), "{not-json");
});

test("quota errors and storage denial are returned to the caller", () => {
  Object.defineProperty(window.localStorage, "setItem", { value: () => { throw new Error("quota"); } });
  assert.equal(saveExercise("workout", chest()).ok, false);
  Object.defineProperty(window.localStorage, "getItem", { value: () => { throw new Error("denied"); } });
  assert.ok(readWorkout("workout").error);
});
