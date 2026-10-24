export type WorkoutSet = { id: string; weight: number; value: number; completed: boolean };
export type ExerciseRecord = { exerciseId: string; name: string; mode: "reps" | "seconds"; sets: WorkoutSet[] };
export type WorkoutRecord = { version: 1; id: string; updatedAt: string; exercises: ExerciseRecord[] };
type ReadResult = { workout: WorkoutRecord | null; error: string | null };
const PREFIX = "workout.records.v1:";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validExercise(value: unknown): value is ExerciseRecord {
  if (!isObject(value) || typeof value.exerciseId !== "string" || !value.exerciseId ||
    typeof value.name !== "string" || !value.name || !["reps", "seconds"].includes(String(value.mode)) ||
    !Array.isArray(value.sets) || value.sets.length > 100) return false;
  return new Set(value.sets.map((set: unknown) => isObject(set) ? set.id : null)).size === value.sets.length &&
    value.sets.every((set: unknown) => isObject(set) && typeof set.id === "string" && !!set.id &&
      typeof set.weight === "number" && Number.isFinite(set.weight) && set.weight >= 0 && set.weight <= 1000 &&
      typeof set.value === "number" && Number.isInteger(set.value) && set.value > 0 &&
      set.value <= (value.mode === "seconds" ? 3600 : 999) && typeof set.completed === "boolean");
}

export function readWorkout(id: string): ReadResult {
  try {
    const raw = window.localStorage.getItem(PREFIX + encodeURIComponent(id));
    if (!raw) return { workout: null, error: null };
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || value.version !== 1 || value.id !== id ||
      typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)) ||
      !Array.isArray(value.exercises) || !value.exercises.every(validExercise) ||
      new Set(value.exercises.map((exercise) => exercise.exerciseId)).size !== value.exercises.length) {
      return { workout: null, error: "保存データを読み込めませんでした。元のデータを保護するため、上書きを止めています。" };
    }
    return { workout: value as WorkoutRecord, error: null };
  } catch {
    return { workout: null, error: "この端末の保存データにアクセスできません。ブラウザの保存設定を確認してください。" };
  }
}

export function saveExercise(workoutId: string, exercise: ExerciseRecord): { ok: boolean; error: string | null } {
  if (!workoutId || !validExercise(exercise)) return { ok: false, error: "重量・回数・秒数の入力を確認してください。" };
  const current = readWorkout(workoutId);
  if (current.error) return { ok: false, error: current.error };
  const remaining = (current.workout?.exercises ?? []).filter((item) => item.exerciseId !== exercise.exerciseId);
  const workout: WorkoutRecord = {
    version: 1, id: workoutId, updatedAt: new Date().toISOString(),
    exercises: exercise.sets.length ? [...remaining, exercise] : remaining,
  };
  try {
    window.localStorage.setItem(PREFIX + encodeURIComponent(workoutId), JSON.stringify(workout));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "記録を保存できませんでした。入力はこの画面に残っています。空き容量や保存設定を確認してください。" };
  }
}

export function summarizeWorkout(workout: WorkoutRecord) {
  const completed = workout.exercises.flatMap((exercise) => exercise.sets.filter((set) => set.completed).map((set) => ({ ...set, mode: exercise.mode })));
  return {
    exercises: workout.exercises.filter((exercise) => exercise.sets.some((set) => set.completed)).length,
    sets: completed.length,
    reps: completed.filter((set) => set.mode === "reps").reduce((total, set) => total + set.value, 0),
    seconds: completed.filter((set) => set.mode === "seconds").reduce((total, set) => total + set.value, 0),
    volume: completed.filter((set) => set.mode === "reps").reduce((total, set) => total + set.weight * set.value, 0),
    pendingSets: workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => !set.completed).length, 0),
  };
}
