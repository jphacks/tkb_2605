import assert from "node:assert/strict";
import test from "node:test";
import { blankSet, parseSets, readDraft, saveDraft, type DraftStorage, type ExerciseDraftInput } from "../src/features/record/draft.ts";
import { recordExerciseName, recordReturnTo } from "../src/features/record/entry.ts";

function memory(): DraftStorage {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
}
const bench: ExerciseDraftInput = { exercise_id: "bench-press", display_name: "ベンチプレス", sets: [{ set_number: 1, weight: 42.5, reps: 8 }] };

test("new rows start at 0 kg with empty reps and have independent identities", () => {
  const a = blankSet(); const b = blankSet();
  assert.equal(a.weight, "0"); assert.equal(a.reps, ""); assert.notEqual(a.id, b.id);
});

test("valid decimal weights and positive integer reps become consecutive set numbers", () => {
  assert.deepEqual(parseSets([{ id: "a", weight: "0", reps: "10" }, { id: "c", weight: "42.5", reps: "8" }]), [
    { set_number: 1, weight: 0, reps: 10 }, { set_number: 2, weight: 42.5, reps: 8 },
  ]);
});

test("empty, negative, fractional reps and unsupported weights are rejected", () => {
  for (const reps of ["", " ", "0", "-1", "1.5", "NaN", "Infinity"]) assert.throws(() => parseSets([{ id: "a", weight: "0", reps }]), /回数/);
  for (const weight of ["", "-1", "0.12", "NaN", "Infinity", "1e3", "100000"]) assert.throws(() => parseSets([{ id: "a", weight, reps: "8" }]), /重量/);
  assert.throws(() => parseSets([]), /1つ以上/);
});

test("editing sets preserves exercise positions independently of their set numbers", () => {
  const storage = memory();
  saveDraft(storage, "session", bench);
  saveDraft(storage, "session", { exercise_id: "squat", display_name: "スクワット", sets: [{ set_number: 1, weight: 0, reps: 15 }] });
  saveDraft(storage, "session", { ...bench, sets: [{ set_number: 1, weight: 45, reps: 6 }, { set_number: 2, weight: 40, reps: 8 }] });
  const restored = readDraft(storage, "session");
  assert.equal(restored?.exercises.length, 2);
  assert.deepEqual(restored?.exercises.map((exercise) => exercise.position), [1, 2]);
  assert.deepEqual(restored?.exercises[0].sets, [{ set_number: 1, weight: 45, reps: 6 }, { set_number: 2, weight: 40, reps: 8 }]);
  assert.equal(restored?.exercises[1].sets[0].set_number, 1);
  assert.equal(restored?.exercises[1].display_name, "スクワット");
  assert.equal(readDraft(storage, "different"), null);
});

test("performed_at starts at the first save and remains stable across edits", (context) => {
  context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-24T01:00:00.000Z") });
  const storage = memory();
  const first = saveDraft(storage, "session", bench);
  assert.equal(first.version, 2);
  assert.equal(first.performed_at, "2026-10-24T01:00:00.000Z");
  assert.equal(first.updated_at, first.performed_at);
  context.mock.timers.tick(60_000);
  const edited = saveDraft(storage, "session", { ...bench, sets: [{ set_number: 1, weight: 45, reps: 8 }] });
  assert.equal(edited.performed_at, first.performed_at);
  assert.equal(edited.updated_at, "2026-10-24T01:01:00.000Z");
  assert.deepEqual(readDraft(storage, "session"), edited);
});

test("legacy drafts use the only saved timestamp and retain all exercises on migration", () => {
  const storage = memory();
  const key = "workout.draft.v1:session%2Flegacy";
  const legacy = {
    version: 1, workout_id: "session/legacy", updated_at: "2026-10-20T04:00:00.000Z",
    exercises: [bench, { exercise_id: "squat", display_name: "スクワット", sets: [{ set_number: 1, weight: 0, reps: 15 }] }],
  };
  const raw = JSON.stringify(legacy);
  storage.setItem(key, raw);
  const restored = readDraft(storage, legacy.workout_id);
  assert.equal(restored?.version, 2);
  assert.equal(restored?.performed_at, legacy.updated_at);
  assert.deepEqual(restored?.exercises, legacy.exercises.map((exercise, index) => ({ ...exercise, position: index + 1 })));
  assert.equal(storage.getItem(key), raw, "reading alone must not modify the legacy draft");
  const updated = saveDraft(storage, legacy.workout_id, { ...bench, sets: [{ set_number: 1, weight: 50, reps: 5 }] });
  assert.equal(updated.performed_at, legacy.updated_at);
  assert.deepEqual(updated.exercises[1], { ...legacy.exercises[1], position: 2 });
  assert.deepEqual(JSON.parse(storage.getItem(key)!), updated);
});

test("invalid v2 timestamps or exercise positions cannot be overwritten", () => {
  const valid = {
    version: 2, workout_id: "session", performed_at: "2026-10-24T01:00:00.000Z", updated_at: "2026-10-24T01:01:00.000Z",
    exercises: [{ ...bench, position: 1 }, { ...bench, exercise_id: "squat", position: 2 }],
  };
  for (const invalid of [
    { ...valid, performed_at: "invalid" },
    { ...valid, performed_at: undefined },
    { ...valid, exercises: [{ ...bench, position: 0 }] },
    { ...valid, exercises: [{ ...bench, position: 1.5 }] },
    { ...valid, exercises: valid.exercises.map((exercise) => ({ ...exercise, position: 1 })) },
    { ...valid, exercises: valid.exercises.toReversed() },
  ]) {
    let writes = 0;
    const storage: DraftStorage = { getItem: () => JSON.stringify(invalid), setItem: () => { writes++; } };
    assert.throws(() => readDraft(storage, "session"), /上書きしません/);
    assert.throws(() => saveDraft(storage, "session", bench), /上書きしません/);
    assert.equal(writes, 0);
  }
});

test("invalid stored data is never silently overwritten", () => {
  let writes = 0;
  const storage: DraftStorage = { getItem: () => "{broken", setItem: () => { writes++; } };
  assert.throws(() => readDraft(storage, "session"), /上書きしません/);
  assert.throws(() => saveDraft(storage, "session", bench), /上書きしません/);
  assert.equal(writes, 0);
});

test("duplicate exercises or invalid persisted precision are rejected", () => {
  const draft = { version: 1, workout_id: "session", updated_at: new Date().toISOString(), exercises: [bench, bench] };
  const storage: DraftStorage = { getItem: () => JSON.stringify(draft), setItem: () => {} };
  assert.throws(() => readDraft(storage, "session"), /形式/);
  draft.exercises = [{ ...bench, sets: [{ set_number: 1, weight: 1.23, reps: 1 }] }];
  assert.throws(() => readDraft(storage, "session"), /形式/);
});

test("storage denial and quota errors are reported instead of success", () => {
  assert.throws(() => readDraft({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} }, "session"), /読み込めません/);
  assert.throws(() => saveDraft({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, "session", bench), /保存できませんでした/);
});

test("a failed legacy migration save retains its original stored content", () => {
  const raw = JSON.stringify({ version: 1, workout_id: "session", updated_at: "2026-10-20T04:00:00.000Z", exercises: [bench] });
  const storage: DraftStorage = { getItem: () => raw, setItem: () => { throw new Error("quota"); } };
  assert.throws(() => saveDraft(storage, "session", bench), /保存できませんでした/);
  assert.equal(storage.getItem("workout.draft.v1:session"), raw);
});

test("URL entry context survives absent history state and takes precedence over state", () => {
  assert.equal(recordReturnTo("?from=recommendations", undefined), "recommendations");
  assert.equal(recordReturnTo("?from=exercises", "recommendations"), "exercises");
  assert.equal(recordReturnTo("?from=recommendations", "exercises"), "recommendations");
  assert.equal(recordReturnTo("", "recommendations"), "recommendations");
  assert.equal(recordReturnTo("?from=https%3A%2F%2Fexample.com", "recommendations"), "recommendations");
  assert.equal(recordReturnTo("?from=invalid", "invalid"), "exercises");
});

test("unsaved recommendation names are restored from the catalog without history state", () => {
  assert.equal(recordExerciseName("dumbbell-curl", undefined), "ダンベルカール");
  assert.equal(recordExerciseName("bicycle-crunch", undefined), "バイシクルクランチ");
  assert.equal(recordExerciseName("reverse-fly", undefined), "リバースフライ");
  assert.equal(recordExerciseName("bench-press", undefined), "ベンチプレス");
  assert.equal(recordExerciseName("preview", undefined), "プッシュアップ");
  assert.equal(recordExerciseName("server-exercise", undefined, "保存済みの種目名"), "保存済みの種目名");
  assert.equal(recordExerciseName("server-exercise", "  選択した種目名  ", "保存済みの種目名"), "選択した種目名");
  assert.equal(recordExerciseName("unknown", 1), "選択した種目");
});
