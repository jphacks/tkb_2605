// HTTP contract: https://github.com/jphacks/tkb_2605/issues/31
// DB-backed implementation: PR #44. Same URLs, authenticated session, persisted state.
export type Workout = { workout_id: string; user_id: number; performed_at: string; is_completed: boolean };
export type WorkoutExercise = { workout_exercise_id: string; workout_id: string; exercise_id: string; display_name: string; position: number };
export type WorkoutSetInput = { set_number: number; reps: number; weight: string };
export type WorkoutSet = WorkoutSetInput & { workout_set_id: string };
export type WorkoutSets = { workout_exercise_id: string; sets: WorkoutSet[] };
export type WorkoutExerciseDetail = Omit<WorkoutExercise, "workout_id"> & { sets: WorkoutSet[] };
export type WorkoutDetail = Workout & { exercises: WorkoutExerciseDetail[] };

export type WorkoutApiErrorKind = "input" | "http" | "network" | "response";
export type WorkoutWriteOutcome = "not-sent" | "rejected" | "unknown";
type FailureDetails = { kind: WorkoutApiErrorKind; writeOutcome?: WorkoutWriteOutcome; status?: number; cause?: unknown };

export class WorkoutApiError extends Error {
  readonly kind: WorkoutApiErrorKind;
  readonly writeOutcome: WorkoutWriteOutcome | undefined;
  readonly status: number | undefined;

  constructor(message: string, details: FailureDetails) {
    super(message, { cause: details.cause });
    this.name = "WorkoutApiError";
    this.kind = details.kind;
    this.writeOutcome = details.writeOutcome;
    this.status = details.status;
  }
}

function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function id(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function positiveInt(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 1; }
function weight(value: unknown): value is string { return typeof value === "string" && /^\d+(?:\.\d)?$/.test(value) && Number(value) <= 99999.9; }
function unique(values: readonly (string | number)[]): boolean { return new Set(values).size === values.length; }
function ascending(values: readonly number[]): boolean { return values.every((value, index) => index === 0 || values[index - 1] < value); }
function validWorkout(value: unknown): value is Workout {
  return object(value) && id(value.workout_id) && positiveInt(value.user_id) && typeof value.performed_at === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.performed_at) &&
    Number.isFinite(Date.parse(value.performed_at)) && typeof value.is_completed === "boolean";
}
function validExerciseFields(value: unknown): value is Omit<WorkoutExercise, "workout_id"> {
  return object(value) && id(value.workout_exercise_id) && id(value.exercise_id) &&
    typeof value.display_name === "string" && positiveInt(value.position);
}
function validSetInput(value: unknown): value is WorkoutSetInput {
  return object(value) && positiveInt(value.set_number) && positiveInt(value.reps) && weight(value.weight);
}
function validSet(value: unknown): value is WorkoutSet {
  return object(value) && id(value.workout_set_id) && validSetInput(value);
}
function validSets(value: unknown, allowEmpty: boolean, ordered: boolean): value is WorkoutSet[] {
  return Array.isArray(value) && (allowEmpty || value.length > 0) && value.every(validSet) &&
    unique(value.map((set) => set.workout_set_id)) && unique(value.map((set) => set.set_number)) &&
    (!ordered || ascending(value.map((set) => set.set_number)));
}
function validExerciseDetail(value: unknown): value is WorkoutExerciseDetail {
  return object(value) && validExerciseFields(value) && "sets" in value && validSets(value.sets, true, true);
}
function validDetail(value: unknown): value is WorkoutDetail {
  if (!object(value) || !validWorkout(value) || !("exercises" in value) || !Array.isArray(value.exercises) ||
    !value.exercises.every(validExerciseDetail)) return false;
  return unique(value.exercises.map((exercise) => exercise.workout_exercise_id)) &&
    ascending(value.exercises.map((exercise) => exercise.position)) &&
    unique(value.exercises.flatMap((exercise) => exercise.sets.map((set) => set.workout_set_id)));
}
function encodedId(value: string): string {
  if (!id(value)) throw new WorkoutApiError("記録・種目のIDを確認してください。", { kind: "input", writeOutcome: "not-sent" });
  try { return encodeURIComponent(value); }
  catch (cause) { throw new WorkoutApiError("記録・種目のIDを確認してください。", { kind: "input", writeOutcome: "not-sent", cause }); }
}
function requestHeaders(write: boolean): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (write) {
    headers.set("Content-Type", "application/json");
    if (typeof document !== "undefined") {
      const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrftoken="));
      if (cookie) {
        try { headers.set("X-CSRFToken", decodeURIComponent(cookie.slice("csrftoken=".length))); }
        catch { /* Invalid cookies are left for the server's session/CSRF check. */ }
      }
    }
  }
  return headers;
}
const uncertainMessage = "応答を確認できませんでした。保存済みの可能性があります。記録を再取得して確認してください。";
function invalidResponse(write: boolean, status?: number, cause?: unknown): WorkoutApiError {
  return new WorkoutApiError("記録APIの応答形式を確認できませんでした。" + (write ? uncertainMessage : ""), {
    kind: "response", writeOutcome: write ? "unknown" : undefined, status, cause,
  });
}
function isAbort(error: unknown): boolean { return error instanceof Error && error.name === "AbortError"; }

async function request(url: string, method: "GET" | "POST" | "PATCH", expectedStatus: 200 | 201, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const write = method !== "GET";
  let response: Response;
  try {
    // Never automatically repeat a write: a lost response may have committed to the DB.
    response = await fetch(url, { method, credentials: "same-origin", redirect: "error", headers: requestHeaders(write),
      cache: "no-store", ...(write ? { body: JSON.stringify(body) } : {}), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000) });
  } catch (cause) {
    if (!write && isAbort(cause)) throw cause;
    throw new WorkoutApiError(write ? uncertainMessage : "記録を取得できませんでした。接続を確認して再試行してください。", {
      kind: "network", writeOutcome: write ? "unknown" : undefined, cause,
    });
  }
  if (!response.ok) {
    const unknown = write && (response.status >= 500 || response.status === 408);
    const message = response.status === 401 || response.status === 403
      ? "記録機能を利用するにはログイン状態の確認が必要です。"
      : response.status === 409
        ? "このトレーニングは終了済みです。記録を再取得して確認してください。"
      : response.status === 404
        ? "記録または種目が見つかりません。対象とログイン中のアカウントを確認してください。"
      : response.status === 405 || response.status === 501
        ? "記録APIにまだ接続できません。時間をおいて再試行してください。"
        : `記録APIでエラーが発生しました（${response.status}）。`;
    throw new WorkoutApiError(message + (unknown ? uncertainMessage : ""), {
      kind: "http", status: response.status, writeOutcome: write ? (unknown ? "unknown" : "rejected") : undefined,
    });
  }
  if (response.status !== expectedStatus) throw invalidResponse(write, response.status);
  try { return await response.json(); }
  catch (cause) {
    if (!write && isAbort(cause)) throw cause;
    throw invalidResponse(write, response.status, cause);
  }
}

export async function createWorkout(): Promise<Workout> {
  const value = await request("/api/workouts/", "POST", 201, {});
  if (!validWorkout(value) || value.is_completed) throw invalidResponse(true, 201);
  return value;
}

export async function addWorkoutExercise(workoutId: string, exerciseId: string): Promise<WorkoutExercise> {
  const url = `/api/workouts/${encodedId(workoutId)}/exercises/`;
  encodedId(exerciseId);
  const value = await request(url, "POST", 201, { exercise_id: exerciseId });
  if (!object(value) || !validExerciseFields(value) || !("workout_id" in value) || value.workout_id !== workoutId || value.exercise_id !== exerciseId) {
    throw invalidResponse(true, 201);
  }
  return value as WorkoutExercise;
}

export async function saveWorkoutSets(workoutExerciseId: string, sets: readonly WorkoutSetInput[]): Promise<WorkoutSets> {
  const url = `/api/workout-exercises/${encodedId(workoutExerciseId)}/sets/`;
  if (!Array.isArray(sets) || !sets.length || !sets.every(validSetInput) || !unique(sets.map((set) => set.set_number))) {
    throw new WorkoutApiError("セットを1つ以上指定し、セット番号・回数は1以上の整数、重量は0以上・小数第1位までの文字列で入力してください。", { kind: "input", writeOutcome: "not-sent" });
  }
  // The backend atomically replaces all sets for this workout-exercise instance.
  const sent = sets.map(({ set_number, reps, weight }) => ({ set_number, reps, weight }));
  const value = await request(url, "POST", 201, { sets: sent });
  const returnedSets = object(value) ? value.sets : null;
  if (!object(value) || value.workout_exercise_id !== workoutExerciseId || !validSets(returnedSets, false, true) || returnedSets.length !== sent.length
    || sent.some((input) => !returnedSets.some((set) => set.set_number === input.set_number && set.reps === input.reps && Number(set.weight) === Number(input.weight)))) {
    throw invalidResponse(true, 201);
  }
  return value as WorkoutSets;
}

export async function fetchWorkout(workoutId: string, { signal }: { signal?: AbortSignal } = {}): Promise<WorkoutDetail> {
  const value = await request(`/api/workouts/${encodedId(workoutId)}/`, "GET", 200, undefined, signal);
  if (!validDetail(value) || value.workout_id !== workoutId) throw invalidResponse(false, 200);
  return value;
}

export async function completeWorkout(workoutId: string): Promise<Workout> {
  const value = await request(`/api/workouts/${encodedId(workoutId)}/`, "PATCH", 200, { is_completed: true });
  if (!validWorkout(value) || value.workout_id !== workoutId || !value.is_completed) throw invalidResponse(true, 200);
  return value;
}
