export type SetInput = { id: string; weight: string; reps: string };
export type RecordedSet = { set_number: number; weight: number; reps: number };
export type ExerciseDraftInput = { exercise_id: string; display_name: string; sets: RecordedSet[] };
export type ExerciseDraft = ExerciseDraftInput & { position: number };
// Local data follows the known table fields, but is not an HTTP request or a saved server workout.
export type WorkoutDraft = { version: 2; workout_id: string; performed_at: string; updated_at: string; exercises: ExerciseDraft[] };
export type DraftStorage = Pick<Storage, "getItem" | "setItem">;

export function blankSet(): SetInput { return { id: crypto.randomUUID(), weight: "0", reps: "" }; }

// Match Issue #14: weight >= 0 with one decimal place; reps is a positive integer.
export function parseSets(inputs: SetInput[]): RecordedSet[] {
  if (!inputs.length) throw new Error("セットを1つ以上入力してください。");
  return inputs.map((input, index) => {
    const weightText = input.weight.trim();
    const repsText = input.reps.trim();
    const weight = Number(weightText);
    const reps = Number(repsText);
    if (!/^\d+(?:\.\d)?$/.test(weightText) || !Number.isFinite(weight) || weight > 99999.9) {
      throw new Error(`セット${index + 1}の重量は、0〜99999.9・小数第1位までで入力してください。`);
    }
    if (!/^\d+$/.test(repsText) || !Number.isSafeInteger(reps) || reps < 1) {
      throw new Error(`セット${index + 1}の回数は、1以上の整数で入力してください。`);
    }
    return { set_number: index + 1, weight, reps };
  });
}

function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validExercise(value: unknown): value is ExerciseDraftInput {
  if (!object(value) || typeof value.exercise_id !== "string" || !value.exercise_id || typeof value.display_name !== "string" ||
    !Array.isArray(value.sets) || !value.sets.length) return false;
  return value.sets.every((set, index) => object(set) && set.set_number === index + 1 &&
    typeof set.weight === "number" && Number.isFinite(set.weight) && set.weight >= 0 && set.weight <= Number.MAX_SAFE_INTEGER / 10 &&
    Math.abs(set.weight * 10 - Math.round(set.weight * 10)) < 0.000001 &&
    typeof set.reps === "number" && Number.isSafeInteger(set.reps) && set.reps > 0);
}

// Retain the original storage namespace so existing drafts have one authoritative copy.
// The version field inside the value determines its schema.
function key(workoutId: string) { return "workout.draft.v1:" + encodeURIComponent(workoutId); }

export function readDraft(storage: DraftStorage, workoutId: string): WorkoutDraft | null {
  let raw: string | null;
  try { raw = storage.getItem(key(workoutId)); }
  catch (cause) { throw new Error("この端末の下書きを読み込めません。ブラウザーの保存設定を確認してください。", { cause }); }
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch (cause) { throw new Error("下書きの形式を確認できません。保存済みの内容は上書きしません。", { cause }); }
  if (!object(value) || (value.version !== 1 && value.version !== 2) || value.workout_id !== workoutId || typeof value.updated_at !== "string" ||
    !Number.isFinite(Date.parse(value.updated_at)) || !Array.isArray(value.exercises) || !value.exercises.every(validExercise) ||
    new Set(value.exercises.map((exercise) => exercise.exercise_id)).size !== value.exercises.length) {
    throw new Error("下書きの形式を確認できません。保存済みの内容は上書きしません。");
  }
  if (value.version === 1) {
    // V1 did not record performed_at. Its last saved time is the only available
    // migration value, not a recovered workout start time. Reading never writes.
    return {
      version: 2, workout_id: workoutId, performed_at: value.updated_at, updated_at: value.updated_at,
      exercises: value.exercises.map((exercise, index) => ({ ...exercise, position: index + 1 })),
    };
  }
  if (typeof value.performed_at !== "string" || !Number.isFinite(Date.parse(value.performed_at)) ||
    !value.exercises.every((exercise, index) => object(exercise) && "position" in exercise && exercise.position === index + 1)) {
    throw new Error("下書きの形式を確認できません。保存済みの内容は上書きしません。");
  }
  return value as WorkoutDraft;
}

export function saveDraft(storage: DraftStorage, workoutId: string, exercise: ExerciseDraftInput): WorkoutDraft {
  if (!workoutId || !validExercise(exercise)) throw new Error("記録内容を確認してください。");
  const previous = readDraft(storage, workoutId);
  const exercises = previous?.exercises ?? [];
  const exists = exercises.some((item) => item.exercise_id === exercise.exercise_id);
  const updatedAt = new Date().toISOString();
  const draft: WorkoutDraft = {
    version: 2, workout_id: workoutId, performed_at: previous?.performed_at ?? updatedAt, updated_at: updatedAt,
    exercises: exists
      ? exercises.map((item) => item.exercise_id === exercise.exercise_id ? { ...exercise, position: item.position } : item)
      : [...exercises, { ...exercise, position: exercises.length + 1 }],
  };
  try { storage.setItem(key(workoutId), JSON.stringify(draft)); }
  catch (cause) { throw new Error("下書きを保存できませんでした。入力を残しています。保存容量・ブラウザーの設定を確認してください。", { cause }); }
  return draft;
}

// Legacy draft helpers are retained for existing data compatibility. The current
// record screen uses the #31 API and does not read, migrate, or upload these drafts.
