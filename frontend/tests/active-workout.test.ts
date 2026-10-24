import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { forgetWorkout, readActiveWorkout, rememberWorkout, type ActiveWorkoutStorage } from "../src/features/workouts/activeWorkout.ts";
import type { Workout } from "../src/api/workouts.ts";

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const workout: Workout = { workout_id: "server-workout-1", user_id: 1, performed_at: "2026-10-24T16:00:00+09:00", is_completed: false };
function memory() {
  const data = new Map<string, string>();
  const removed: string[] = [];
  const storage: ActiveWorkoutStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { removed.push(key); data.delete(key); },
  };
  return { data, removed, storage };
}
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

test("server workout IDs are isolated by explicit integer user IDs", () => {
  const { storage, data } = memory();
  const second = { ...workout, user_id: 2, workout_id: "server-workout-2" };
  assert.equal(rememberWorkout(workout, storage), "");
  assert.equal(rememberWorkout(second, storage), "");
  assert.equal(readActiveWorkout(1, storage), workout.workout_id);
  assert.equal(readActiveWorkout(2, storage), second.workout_id);
  assert.equal(readActiveWorkout(3, storage), null);
  assert.deepEqual([...data], [["workout.active.v1:1", workout.workout_id], ["workout.active.v1:2", second.workout_id]]);
});

test("remember replaces only its user's active ID and does not modify legacy drafts", () => {
  const { storage, data } = memory();
  data.set("workout.draft.v1:old", '{"version":1,"workout_id":"old"}');
  data.set("unrelated", "keep");
  rememberWorkout(workout, storage);
  const opaqueId = "server/workout?second#part";
  assert.equal(rememberWorkout({ ...workout, workout_id: opaqueId }, storage), "");
  assert.equal(readActiveWorkout(1, storage), opaqueId);
  assert.deepEqual([...data], [
    ["workout.draft.v1:old", '{"version":1,"workout_id":"old"}'], ["unrelated", "keep"], ["workout.active.v1:1", opaqueId],
  ]);
});

test("finishing an older workout cannot delete a newer active ID for the same user", () => {
  const { storage, removed } = memory();
  rememberWorkout({ ...workout, workout_id: "newer" }, storage);
  rememberWorkout({ ...workout, user_id: 2 }, storage);
  assert.equal(forgetWorkout({ ...workout, is_completed: true }, storage), "");
  assert.equal(readActiveWorkout(1, storage), "newer");
  assert.equal(readActiveWorkout(2, storage), workout.workout_id);
  assert.deepEqual(removed, []);
  assert.equal(forgetWorkout({ ...workout, workout_id: "newer", is_completed: true }, storage), "");
  assert.equal(readActiveWorkout(1, storage), null);
  assert.equal(readActiveWorkout(2, storage), workout.workout_id);
  assert.deepEqual(removed, ["workout.active.v1:1"]);
});

test("remembering a completed server workout removes only its matching active ID", () => {
  const { storage, removed } = memory();
  rememberWorkout(workout, storage);
  assert.equal(rememberWorkout({ ...workout, is_completed: true }, storage), "");
  assert.equal(readActiveWorkout(1, storage), null);
  assert.deepEqual(removed, ["workout.active.v1:1"]);
  assert.equal(rememberWorkout({ ...workout, is_completed: true }, storage), "");
  assert.deepEqual(removed, ["workout.active.v1:1"]);
  rememberWorkout({ ...workout, workout_id: "another" }, storage);
  assert.equal(rememberWorkout({ ...workout, is_completed: true }, storage), "");
  assert.equal(readActiveWorkout(1, storage), "another");
});

test("storage write, read and deletion failures return warnings or null without throwing", () => {
  const denied = () => { throw new Error("browser storage denied"); };
  const failedWrite: ActiveWorkoutStorage = { getItem: () => null, setItem: denied, removeItem: denied };
  assert.match(rememberWorkout(workout, failedWrite), /保持できません/);
  const failedRead: ActiveWorkoutStorage = { getItem: denied, setItem: denied, removeItem: denied };
  assert.equal(readActiveWorkout(1, failedRead), null);
  assert.match(forgetWorkout(workout, failedRead), /削除できません/);
  const failedRemove: ActiveWorkoutStorage = { getItem: () => workout.workout_id, setItem: denied, removeItem: denied };
  assert.match(forgetWorkout(workout, failedRemove), /削除できません/);
  assert.match(rememberWorkout({ ...workout, is_completed: true }, failedRemove), /削除できません/);
  assert.deepEqual(workout, { workout_id: "server-workout-1", user_id: 1, performed_at: "2026-10-24T16:00:00+09:00", is_completed: false });
});

test("default localStorage access is inside the error boundary and supports normal calls", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("SecurityError"); } });
  assert.match(rememberWorkout(workout), /保持できません/);
  assert.equal(readActiveWorkout(1), null);
  assert.match(forgetWorkout(workout), /削除できません/);
  const { storage } = memory();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  assert.equal(rememberWorkout(workout), "");
  assert.equal(readActiveWorkout(1), workout.workout_id);
  assert.equal(forgetWorkout(workout), "");
  assert.equal(readActiveWorkout(1), null);
});

test("invalid or preview user IDs never read or modify a shared fallback key", () => {
  let calls = 0;
  const storage: ActiveWorkoutStorage = { getItem: () => { calls++; return null; }, setItem: () => { calls++; }, removeItem: () => { calls++; } };
  for (const userId of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1", "me", undefined, null]) {
    assert.equal(readActiveWorkout(userId as number, storage), null);
    assert.match(rememberWorkout({ ...workout, user_id: userId as number }, storage), /情報を確認できない/);
    assert.match(forgetWorkout({ ...workout, user_id: userId as number }, storage), /情報を確認できない/);
  }
  assert.equal(calls, 0);
});

test("empty stored IDs are ignored without deleting data, and invalid response identity cannot write", () => {
  const { data, storage } = memory();
  data.set("workout.active.v1:1", "   ");
  assert.equal(readActiveWorkout(1, storage), null);
  assert.equal(data.get("workout.active.v1:1"), "   ");
  for (const invalid of [{ ...workout, workout_id: "" }, { ...workout, is_completed: "false" }, null]) {
    assert.match(rememberWorkout(invalid as Workout, storage), /情報を確認できない/);
    assert.match(forgetWorkout(invalid as Workout, storage), /情報を確認できない/);
  }
  assert.deepEqual([...data], [["workout.active.v1:1", "   "]]);
});
