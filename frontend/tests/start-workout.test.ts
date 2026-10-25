import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Workout } from "../src/api/workouts.ts";
import { clearWorkoutSession, workoutSessionVersion } from "../src/features/workouts/session.ts";
import { startWorkout } from "../src/features/workouts/startWorkout.ts";

const originalFetch = globalThis.fetch;
const originalLocal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
const workout: Workout = { workout_id: "workout-1", user_id: 1, performed_at: "2026-10-24T16:00:00+09:00", is_completed: false };
let requests: { url: string; method?: string }[];
function response(value: unknown, status = 201) { return new Response(JSON.stringify(value), { status }); }
beforeEach(() => {
  clearWorkoutSession(); requests = [];
  // No persisted active ID, old uncertain-operation marker, or mock user may be read or written.
  for (const name of ["localStorage", "sessionStorage"]) {
    Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error("Browser storage must not be used"); } });
  }
});
afterEach(() => {
  clearWorkoutSession(); globalThis.fetch = originalFetch;
  if (originalLocal) Object.defineProperty(globalThis, "localStorage", originalLocal);
  else Reflect.deleteProperty(globalThis, "localStorage");
  if (originalSession) Object.defineProperty(globalThis, "sessionStorage", originalSession);
  else Reflect.deleteProperty(globalThis, "sessionStorage");
});
function respond(value: unknown, status = 201) {
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method });
    return response(value, status);
  };
}

test("concurrent clicks issue one POST without persisting the mock identity", async () => {
  let finish!: (value: Response) => void;
  globalThis.fetch = (url, init) => {
    requests.push({ url: String(url), method: init?.method });
    return new Promise((resolve) => { finish = resolve; });
  };
  const first = startWorkout(); const second = startWorkout();
  assert.equal(requests.length, 1);
  finish(response(workout));
  assert.deepEqual(await first, workout);
  assert.deepEqual(await second, workout);
  assert.deepEqual(requests, [{ url: "/api/workouts/", method: "POST" }]);
});

test("later starts call POST again even when the mock repeats its ID", async () => {
  respond(workout);
  assert.deepEqual(await startWorkout(), workout);
  assert.deepEqual(await startWorkout(), workout);
  assert.deepEqual(requests.map((r) => r.method), ["POST", "POST"]);
});

test("network failure is not retried automatically or persisted as a blocked operation", async () => {
  globalThis.fetch = async () => { requests.push({ url: "/api/workouts/", method: "POST" }); throw new Error("offline"); };
  await assert.rejects(startWorkout(), /応答を確認できません/);
  assert.equal(requests.length, 1);
  respond(workout);
  assert.deepEqual(await startWorkout(), workout);
  assert.equal(requests.length, 2);
});

test("HTTP error releases the click lock for an explicit retry", async () => {
  respond({}, 500);
  await assert.rejects(startWorkout(), /500/);
  respond(workout);
  assert.deepEqual(await startWorkout(), workout);
  assert.equal(requests.length, 2);
});

test("preview exit invalidates old callbacks and isolates a new pending start", async () => {
  let finish!: (value: Response) => void;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const version = workoutSessionVersion();
  const old = startWorkout();
  clearWorkoutSession();
  assert.notEqual(version, workoutSessionVersion());
  respond(workout);
  assert.deepEqual(await startWorkout(), workout);
  finish(response(workout));
  assert.deepEqual(await old, workout);
});

test("only a successful new workout sends one start notification for concurrent clicks", async () => {
  respond(workout);
  let sent = 0;
  const onStarted = async () => { sent++; };
  await Promise.all([startWorkout({ onStarted }), startWorkout({ onStarted })]);
  assert.equal(sent, 1);
  respond({}, 403);
  await assert.rejects(startWorkout({ onStarted }));
  assert.equal(sent, 1);
});
test("preview exit before creation completes does not emit a late start notification", async () => {
  let finish!: (value: Response) => void;
  let sent = 0;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const starting = startWorkout({ onStarted: async () => { sent++; } });
  clearWorkoutSession(); finish(response(workout)); await starting;
  assert.equal(sent, 0);
});
