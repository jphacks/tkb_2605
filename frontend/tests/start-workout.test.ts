import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Workout } from "../src/api/workouts.ts";
import { acceptWorkout, clearWorkoutSession, knownActiveWorkoutId } from "../src/features/workouts/session.ts";
import { startWorkout, StartWorkoutUncertainError } from "../src/features/workouts/startWorkout.ts";

const originalFetch = globalThis.fetch;
const originalLocal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
const workout: Workout = { workout_id: "server-workout", user_id: 12, performed_at: "2026-10-24T16:00:00+09:00", is_completed: false };
let local: ReturnType<typeof memory>;
let session: ReturnType<typeof memory>;
let requests: { url: string; method?: string }[];

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}
function response(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status }); }
function respond(value: unknown, status = 200) {
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method });
    return response(value, status);
  };
}
beforeEach(() => {
  clearWorkoutSession();
  local = memory(); session = memory(); requests = [];
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: local });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: session });
});
afterEach(() => {
  clearWorkoutSession();
  globalThis.fetch = originalFetch;
  if (originalLocal) Object.defineProperty(globalThis, "localStorage", originalLocal);
  else Reflect.deleteProperty(globalThis, "localStorage");
  if (originalSession) Object.defineProperty(globalThis, "sessionStorage", originalSession);
  else Reflect.deleteProperty(globalThis, "sessionStorage");
});

test("simultaneous start clicks send one POST and preserve the server-owned identity", async () => {
  let finish!: (value: Response) => void;
  globalThis.fetch = (url, init) => {
    requests.push({ url: String(url), method: init?.method });
    assert.notEqual(session.getItem("workout.operation.v1:start"), null);
    return new Promise((resolve) => { finish = resolve; });
  };
  const first = startWorkout();
  const second = startWorkout();
  assert.equal(requests.length, 1);
  finish(response(workout, 201));
  assert.deepEqual(await first, { workout, storageWarning: "" });
  assert.deepEqual(await second, { workout, storageWarning: "" });
  assert.equal(knownActiveWorkoutId(), workout.workout_id);
  assert.equal(local.getItem("workout.active.v1:12"), workout.workout_id);
  assert.equal(session.getItem("workout.operation.v1:start"), null);
});

test("known active workout is verified by GET and reused without creating another", async () => {
  acceptWorkout(workout);
  respond({ ...workout, exercises: [] });
  assert.equal((await startWorkout()).workout.workout_id, workout.workout_id);
  assert.deepEqual(requests, [{ url: "/api/note/workouts/server-workout/", method: "GET" }]);
});

test("failed active lookup never falls back to a new POST", async () => {
  acceptWorkout(workout);
  respond({}, 403);
  await assert.rejects(startWorkout(), /ログイン状態/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(knownActiveWorkoutId(), workout.workout_id);
});

test("a completed active workout can start a new server workout after GET verification", async () => {
  acceptWorkout(workout);
  const next = { ...workout, workout_id: "next-server-workout" };
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method });
    return init?.method === "GET" ? response({ ...workout, is_completed: true, exercises: [] }) : response(next, 201);
  };
  assert.equal((await startWorkout()).workout.workout_id, next.workout_id);
  assert.deepEqual(requests.map((item) => item.method), ["GET", "POST"]);
  assert.equal(local.getItem("workout.active.v1:12"), next.workout_id);
});

test("unknown creation remains blocked after session identity is cleared", async () => {
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method });
    throw new TypeError("connection lost after request");
  };
  await assert.rejects(startWorkout(), StartWorkoutUncertainError);
  assert.notEqual(session.getItem("workout.operation.v1:start"), null);
  clearWorkoutSession();
  await assert.rejects(startWorkout(), StartWorkoutUncertainError);
  assert.equal(requests.length, 1);
});

test("explicit server rejection clears the pending marker and allows a later action", async () => {
  respond({}, 403);
  await assert.rejects(startWorkout(), /ログイン状態/);
  assert.equal(session.getItem("workout.operation.v1:start"), null);
  respond(workout, 201);
  assert.equal((await startWorkout()).workout.workout_id, workout.workout_id);
  assert.equal(requests.length, 2);
});

test("storage warnings after creation retain the real ID in memory and do not resend", async () => {
  local.setItem = () => { throw new Error("quota"); };
  respond(workout, 201);
  const result = await startWorkout();
  assert.match(result.storageWarning, /保持できません/);
  assert.equal(result.workout.workout_id, workout.workout_id);
  assert.equal(knownActiveWorkoutId(), workout.workout_id);
  respond({ ...workout, exercises: [] });
  await startWorkout();
  assert.deepEqual(requests.map((item) => item.method), ["POST", "GET"]);
});

test("unavailable operation storage prevents the POST before it is sent", async () => {
  session.setItem = () => { throw new Error("quota"); };
  respond(workout, 201);
  await assert.rejects(startWorkout(), /送信を中止/);
  assert.equal(requests.length, 0);
});

test("a persistent active key alone does not establish the current user's identity", () => {
  local.setItem("workout.active.v1:12", workout.workout_id);
  assert.equal(knownActiveWorkoutId(), null);
  acceptWorkout(workout);
  assert.equal(knownActiveWorkoutId(), workout.workout_id);
  clearWorkoutSession();
  assert.equal(knownActiveWorkoutId(), null);
  assert.equal(local.getItem("workout.active.v1:12"), workout.workout_id);
});

test("preview exit during creation does not restore a previous identity on response", async () => {
  let finish!: (value: Response) => void;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const pending = startWorkout();
  clearWorkoutSession();
  finish(response(workout, 201));
  assert.equal((await pending).workout.workout_id, workout.workout_id);
  assert.equal(knownActiveWorkoutId(), null);
  assert.equal(local.getItem("workout.active.v1:12"), workout.workout_id);
});
