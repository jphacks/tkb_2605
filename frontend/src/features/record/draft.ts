export type SetInput = { id: string; weight: string; reps: string };
export type RecordedSet = { set_number: number; weight: number; reps: number };
export type ExerciseDraft = { exercise_id: string; display_name: string; sets: RecordedSet[] };
export type WorkoutDraft = { version: 1; workout_id: string; updated_at: string; exercises: ExerciseDraft[] };
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
    if (!/^\d+(?:\.\d)?$/.test(weightText) || !Number.isFinite(weight) || weight > Number.MAX_SAFE_INTEGER / 10) {
      throw new Error(`セット${index + 1}の重量は、0以上・小数第1位までで入力してください。`);
    }
    if (!/^\d+$/.test(repsText) || !Number.isSafeInteger(reps) || reps < 1) {
      throw new Error(`セット${index + 1}の回数は、1以上の整数で入力してください。`);
    }
    return { set_number: index + 1, weight, reps };
  });
}

function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validExercise(value: unknown): value is ExerciseDraft {
  if (!object(value) || typeof value.exercise_id !== "string" || !value.exercise_id || typeof value.display_name !== "string" ||
    !Array.isArray(value.sets) || !value.sets.length) return false;
  return value.sets.every((set, index) => object(set) && set.set_number === index + 1 &&
    typeof set.weight === "number" && Number.isFinite(set.weight) && set.weight >= 0 && set.weight <= Number.MAX_SAFE_INTEGER / 10 &&
    Math.abs(set.weight * 10 - Math.round(set.weight * 10)) < 0.000001 &&
    typeof set.reps === "number" && Number.isSafeInteger(set.reps) && set.reps > 0);
}

function key(workoutId: string) { return "workout.draft.v1:" + encodeURIComponent(workoutId); }

export function readDraft(storage: DraftStorage, workoutId: string): WorkoutDraft | null {
  let raw: string | null;
  try { raw = storage.getItem(key(workoutId)); }
  catch (cause) { throw new Error("この端末の下書きを読み込めません。ブラウザーの保存設定を確認してください。", { cause }); }
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch (cause) { throw new Error("下書きの形式を確認できません。保存済みの内容は上書きしません。", { cause }); }
  if (!object(value) || value.version !== 1 || value.workout_id !== workoutId || typeof value.updated_at !== "string" ||
    !Number.isFinite(Date.parse(value.updated_at)) || !Array.isArray(value.exercises) || !value.exercises.every(validExercise) ||
    new Set(value.exercises.map((exercise) => exercise.exercise_id)).size !== value.exercises.length) {
    throw new Error("下書きの形式を確認できません。保存済みの内容は上書きしません。");
  }
  return value as WorkoutDraft;
}

export function saveDraft(storage: DraftStorage, workoutId: string, exercise: ExerciseDraft): WorkoutDraft {
  if (!workoutId || !validExercise(exercise)) throw new Error("記録内容を確認してください。");
  const previous = readDraft(storage, workoutId);
  const exercises = previous?.exercises ?? [];
  const exists = exercises.some((item) => item.exercise_id === exercise.exercise_id);
  const draft: WorkoutDraft = {
    version: 1, workout_id: workoutId, updated_at: new Date().toISOString(),
    exercises: exists ? exercises.map((item) => item.exercise_id === exercise.exercise_id ? exercise : item) : [...exercises, exercise],
  };
  try { storage.setItem(key(workoutId), JSON.stringify(draft)); }
  catch (cause) { throw new Error("下書きを保存できませんでした。入力を残しています。保存容量・ブラウザーの設定を確認してください。", { cause }); }
  return draft;
}

// The backend table contract exists in #14; its HTTP save contract is not defined yet.
// A future server adapter can consume ExerciseDraft. This module only stores local drafts.
