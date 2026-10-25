import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  addWorkoutExercise, completeWorkout, createWorkout, fetchWorkout, saveWorkoutSets, WorkoutApiError,
  type Workout, type WorkoutDetail, type WorkoutExercise, type WorkoutSetInput, type WorkoutSets,
  type WorkoutApiErrorKind, type WorkoutWriteOutcome,
} from "../src/api/workouts.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const workout: Workout = { workout_id: "workout/1", user_id: 1, performed_at: "2026-10-24T16:00:00+09:00", is_completed: false };
const exercise: WorkoutExercise = { workout_exercise_id: "workout-exercise/1", workout_id: workout.workout_id, exercise_id: "master/bench", display_name: "ベンチプレス", position: 1 };
const input: WorkoutSetInput[] = [{ set_number: 1, reps: 10, weight: "20.0" }, { set_number: 2, reps: 9, weight: "18.0" }];
const saved: WorkoutSets = { workout_exercise_id: exercise.workout_exercise_id, sets: input.map((set, index) => ({ ...set, workout_set_id: `server-set-${index + 1}` })) };
const detail: WorkoutDetail = {
  ...workout,
  exercises: [{ workout_exercise_id: exercise.workout_exercise_id, exercise_id: exercise.exercise_id, display_name: exercise.display_name, position: 1, sets: saved.sets }],
};
let requests: { url: string; init?: RequestInit }[];

function respond(body: unknown, status = 200) {
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
}
function failure(kind: WorkoutApiErrorKind, outcome?: WorkoutWriteOutcome, status?: number) {
  return (error: unknown) => {
    assert.ok(error instanceof WorkoutApiError);
    assert.equal(error.kind, kind);
    assert.equal(error.writeOutcome, outcome);
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  };
}
function lastBody() { return JSON.parse(String(requests.at(-1)!.init?.body)); }
beforeEach(() => { requests = []; });
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

test("start POST uses the current URL and accepts the fixed mock identity and time", async () => {
  respond(workout, 201);
  assert.deepEqual(await createWorkout(), workout);
  assert.equal(requests[0].url, "/api/workouts/");
  assert.equal(requests[0].init?.method, "POST");
  assert.equal(requests[0].init?.credentials, "same-origin");
  assert.equal(requests[0].init?.redirect, "error");
  assert.deepEqual(lastBody(), {});
});

test("adding a master exercise encodes the workout ID and sends no generated IDs or position", async () => {
  respond(exercise, 201);
  assert.deepEqual(await addWorkoutExercise(workout.workout_id, exercise.exercise_id), exercise);
  assert.equal(requests[0].url, "/api/workouts/workout%2F1/exercises/");
  assert.equal(requests[0].init?.method, "POST");
  assert.deepEqual(lastBody(), { exercise_id: "master/bench" });
});

test("all sets are sent in one POST as decimal text and returned server IDs replace input data", async () => {
  respond(saved, 201);
  const extraInput = input.map((set) => ({ ...set, local_row_id: "local-only" }));
  const result = await saveWorkoutSets(exercise.workout_exercise_id, extraInput);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/workout-exercises/workout-exercise%2F1/sets/");
  assert.equal(requests[0].init?.method, "POST");
  assert.deepEqual(lastBody(), { sets: input });
  assert.deepEqual(result, saved);
  assert.equal(result.sets.length, input.length);
  assert.deepEqual(input, [{ set_number: 1, reps: 10, weight: "20.0" }, { set_number: 2, reps: 9, weight: "18.0" }]);
});

test("set numbering may have gaps and weight formatting can be normalized without changing its value", async () => {
  const sets = [{ set_number: 1, reps: 10, weight: "00020" }, { set_number: 3, reps: 9, weight: "0" }];
  const response = { workout_exercise_id: exercise.workout_exercise_id, sets: [
    { workout_set_id: "a", set_number: 1, reps: 10, weight: "20.0" },
    { workout_set_id: "b", set_number: 3, reps: 9, weight: "0.0" },
  ] };
  respond(response, 201);
  assert.deepEqual(await saveWorkoutSets(exercise.workout_exercise_id, sets), response);
});

test("GET forwards its AbortSignal and restores both saved and not-yet-recorded exercises", async () => {
  const response: WorkoutDetail = { ...detail, exercises: [...detail.exercises, { ...detail.exercises[0], workout_exercise_id: "second-instance", position: 4, sets: [] }] };
  respond(response);
  const signal = new AbortController().signal;
  assert.deepEqual(await fetchWorkout(workout.workout_id, { signal }), response);
  assert.equal(requests[0].url, "/api/workouts/workout%2F1/");
  assert.equal(requests[0].init?.method, "GET");
  assert.equal(requests[0].init?.signal, signal);
  assert.equal(requests[0].init?.body, undefined);
  assert.equal(requests[0].init?.credentials, "same-origin");
  respond({ ...workout, exercises: [] });
  assert.deepEqual((await fetchWorkout(workout.workout_id)).exercises, []);
});

test("completion PATCH is separate from set submission and requires completed server state", async () => {
  respond({ ...workout, is_completed: true });
  assert.deepEqual(await completeWorkout(workout.workout_id), { ...workout, is_completed: true });
  assert.equal(requests[0].url, "/api/workouts/workout%2F1/");
  assert.equal(requests[0].init?.method, "PATCH");
  assert.deepEqual(lastBody(), { is_completed: true });
  respond(workout);
  await assert.rejects(completeWorkout(workout.workout_id), failure("response", "unknown"));
});

test("empty IDs and invalid local sets are rejected without sending any request", async () => {
  respond(saved, 201);
  for (const badId of ["", "   ", "\ud800"]) {
    await assert.rejects(addWorkoutExercise(badId, exercise.exercise_id), failure("input", "not-sent"));
    await assert.rejects(addWorkoutExercise(workout.workout_id, badId), failure("input", "not-sent"));
    await assert.rejects(saveWorkoutSets(badId, input), failure("input", "not-sent"));
    await assert.rejects(fetchWorkout(badId), failure("input", "not-sent"));
    await assert.rejects(completeWorkout(badId), failure("input", "not-sent"));
  }
  for (const sets of [
    [], [input[0], input[0]], [{ ...input[0], set_number: 0 }], [{ ...input[0], set_number: 1.5 }],
    [{ ...input[0], reps: 0 }], [{ ...input[0], reps: 2.5 }], [{ ...input[0], reps: Number.MAX_SAFE_INTEGER + 1 }],
    ...["", "-1", "1.25", "1e2", "NaN", "Infinity", " 20.0 ", 20].map((weight) => [{ ...input[0], weight }]),
  ]) await assert.rejects(saveWorkoutSets(exercise.workout_exercise_id, sets as WorkoutSetInput[]), failure("input", "not-sent"));
  assert.equal(requests.length, 0);
});

test("write headers include the Django CSRF cookie, while GET sends neither body nor CSRF header", async () => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "other=value;csrftoken=csrf%2Dtoken; another=value" } });
  respond(workout, 201); await createWorkout();
  respond(exercise, 201); await addWorkoutExercise(workout.workout_id, exercise.exercise_id);
  respond(saved, 201); await saveWorkoutSets(exercise.workout_exercise_id, input);
  respond({ ...workout, is_completed: true }); await completeWorkout(workout.workout_id);
  for (const { init } of requests) {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-CSRFToken"), "csrf-token");
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(headers.get("Accept"), "application/json");
    assert.equal(init?.credentials, "same-origin");
  }
  respond(detail); await fetchWorkout(workout.workout_id);
  assert.equal(new Headers(requests.at(-1)!.init?.headers).has("X-CSRFToken"), false);
  assert.equal(new Headers(requests.at(-1)!.init?.headers).has("Content-Type"), false);
});

test("an invalid CSRF cookie does not become a forged header or a client-side success", async () => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "csrftoken=%E0" } });
  respond({}, 403);
  await assert.rejects(createWorkout(), failure("http", "rejected", 403));
  assert.equal(new Headers(requests[0].init?.headers).has("X-CSRFToken"), false);
});

test("response IDs reflected from URL must match; the fixed exercise need not match selection", async () => {
  for (const response of [{ ...exercise, workout_id: "other" }]) {
    respond(response, 201);
    await assert.rejects(addWorkoutExercise(workout.workout_id, exercise.exercise_id), failure("response", "unknown"));
  }
  respond({ ...exercise, exercise_id: "exercise-1" }, 201);
  assert.equal((await addWorkoutExercise(workout.workout_id, "selected-master-uuid")).exercise_id, "exercise-1");
  respond({ ...saved, workout_exercise_id: "other" }, 201);
  await assert.rejects(saveWorkoutSets(exercise.workout_exercise_id, input), failure("response", "unknown"));
  respond({ ...detail, workout_id: "other" });
  await assert.rejects(fetchWorkout(workout.workout_id), failure("response"));
  respond({ ...workout, workout_id: "other", is_completed: true });
  await assert.rejects(completeWorkout(workout.workout_id), failure("response", "unknown"));
});

test("workout shape requires an integer Django user ID, server string ID, timestamp and boolean completion", async () => {
  for (const response of [
    ...["1", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map((user_id) => ({ ...workout, user_id })),
    { ...workout, workout_id: "" }, { ...workout, workout_id: 1 }, { ...workout, performed_at: "invalid" },
    { ...workout, performed_at: "2026-10-24" }, { ...workout, is_completed: "false" }, { ...workout, is_completed: true },
  ]) {
    respond(response, 201);
    await assert.rejects(createWorkout(), failure("response", "unknown"));
  }
});

test("mock set responses still require valid shapes and unique IDs", async () => {
  for (const sets of [
    [],
    saved.sets.map((set) => ({ ...set, workout_set_id: "same" })),
    saved.sets.map((set) => ({ ...set, set_number: 1 })),
    [{ ...saved.sets[0], weight: 20 }, saved.sets[1]],
    [{ ...saved.sets[0], workout_set_id: "" }, saved.sets[1]],
  ]) {
    respond({ workout_exercise_id: exercise.workout_exercise_id, sets }, 201);
    await assert.rejects(saveWorkoutSets(exercise.workout_exercise_id, input), failure("response", "unknown"));
  }
});

test("fixed sample sets are accepted even when count, reps and weight differ from input", async () => {
  const sample = { workout_exercise_id: "custom-exercise", sets: [
    { workout_set_id: "workout-set-1", set_number: 1, reps: 10, weight: "20.0" },
    { workout_set_id: "workout-set-2", set_number: 2, reps: 9, weight: "18.0" },
    { workout_set_id: "workout-set-3", set_number: 3, reps: 8, weight: "16.0" },
  ] };
  respond(sample, 201);
  const result = await saveWorkoutSets("custom-exercise", [{ set_number: 1, reps: 42, weight: "99.5" }]);
  assert.deepEqual(result, sample);
  assert.deepEqual(lastBody(), { sets: [{ set_number: 1, reps: 42, weight: "99.5" }] });
});

test("PATCH true is only a mock response and subsequent GET false is returned unchanged", async () => {
  respond({ ...workout, is_completed: true });
  assert.equal((await completeWorkout(workout.workout_id)).is_completed, true);
  respond(detail);
  assert.equal((await fetchWorkout(workout.workout_id)).is_completed, false);
  respond(workout, 201);
  assert.deepEqual(await createWorkout(), await createWorkout());
});

test("detail responses enforce independent ordered positions/set numbers and unique saved IDs", async () => {
  const first = detail.exercises[0];
  for (const exercises of [
    [{ ...first, position: 0 }], [{ ...first, position: "1" }],
    [first, { ...first, position: 2, sets: [] }],
    [{ ...first, position: 2 }, { ...first, workout_exercise_id: "second", position: 1, sets: [] }],
    [first, { ...first, workout_exercise_id: "second", position: 2 }],
    [{ ...first, sets: [...first.sets].reverse() }],
    [{ ...first, sets: first.sets.map((set) => ({ ...set, set_number: 1 })) }],
    [{ ...first, sets: [{ ...first.sets[0], weight: "1.23" }] }],
    [{ ...first, sets: [{ ...first.sets[0], reps: 0 }] }],
  ]) {
    respond({ ...workout, exercises });
    await assert.rejects(fetchWorkout(workout.workout_id), failure("response"));
  }
});

test("wrong success status cannot masquerade as a confirmed write or valid read", async () => {
  respond(workout, 200);
  await assert.rejects(createWorkout(), failure("response", "unknown", 200));
  respond(exercise, 200);
  await assert.rejects(addWorkoutExercise(workout.workout_id, exercise.exercise_id), failure("response", "unknown", 200));
  respond(saved, 200);
  await assert.rejects(saveWorkoutSets(exercise.workout_exercise_id, input), failure("response", "unknown", 200));
  respond(detail, 201);
  await assert.rejects(fetchWorkout(workout.workout_id), failure("response", undefined, 201));
  respond({ ...workout, is_completed: true }, 201);
  await assert.rejects(completeWorkout(workout.workout_id), failure("response", "unknown", 201));
});

test("write transport failures are uncertain and never automatically retried", async () => {
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    throw new TypeError("Network failure after request dispatch");
  };
  const writes = [() => createWorkout(), () => addWorkoutExercise(workout.workout_id, exercise.exercise_id), () => saveWorkoutSets(exercise.workout_exercise_id, input), () => completeWorkout(workout.workout_id)];
  for (const [index, write] of writes.entries()) {
    await assert.rejects(write(), failure("network", "unknown"));
    assert.equal(requests.length, index + 1);
  }
  await assert.rejects(fetchWorkout(workout.workout_id), failure("network"));
  assert.equal(requests.length, 5);
});

test("HTTP rejections differ from ambiguous timeouts or server failures without automatic resubmission", async () => {
  for (const status of [400, 401, 403, 404, 405, 409, 422, 429]) {
    respond({}, status);
    await assert.rejects(createWorkout(), failure("http", "rejected", status));
  }
  for (const status of [408, 500, 501, 502, 503]) {
    respond({}, status);
    await assert.rejects(createWorkout(), failure("http", "unknown", status));
  }
  assert.equal(requests.length, 13);
  respond({}, 500);
  await assert.rejects(fetchWorkout(workout.workout_id), failure("http", undefined, 500));
});

test("invalid successful JSON is an unknown write outcome, while aborted reads keep AbortError", async () => {
  globalThis.fetch = async () => new Response("not-json", { status: 201 });
  await assert.rejects(createWorkout(), failure("response", "unknown", 201));
  globalThis.fetch = async () => new Response("not-json", { status: 200 });
  await assert.rejects(fetchWorkout(workout.workout_id), failure("response", undefined, 200));
  const aborted = new DOMException("Aborted", "AbortError");
  globalThis.fetch = async () => { throw aborted; };
  await assert.rejects(fetchWorkout(workout.workout_id), (error) => error === aborted);
  await assert.rejects(createWorkout(), failure("network", "unknown"));
  globalThis.fetch = async () => {
    const response = new Response("{}", { status: 200 });
    response.json = async () => { throw aborted; };
    return response;
  };
  await assert.rejects(fetchWorkout(workout.workout_id), (error) => error === aborted);
});
