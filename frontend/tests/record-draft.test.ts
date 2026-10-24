import assert from "node:assert/strict";
import test from "node:test";
import { blankSet, parseSets, readDraft, saveDraft, type DraftStorage, type ExerciseDraft } from "../src/features/record/draft.ts";

function memory(): DraftStorage {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
}
const bench: ExerciseDraft = { exercise_id: "bench-press", display_name: "ベンチプレス", sets: [{ set_number: 1, weight: 42.5, reps: 8 }] };

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
  for (const weight of ["", "-1", "0.12", "NaN", "Infinity", "1e3"]) assert.throws(() => parseSets([{ id: "a", weight, reps: "8" }]), /重量/);
  assert.throws(() => parseSets([]), /1つ以上/);
});

test("editing sets preserves other exercises and reloads the saved name and values", () => {
  const storage = memory();
  saveDraft(storage, "session", bench);
  saveDraft(storage, "session", { exercise_id: "squat", display_name: "スクワット", sets: [{ set_number: 1, weight: 0, reps: 15 }] });
  saveDraft(storage, "session", { ...bench, sets: [{ set_number: 1, weight: 45, reps: 6 }] });
  const restored = readDraft(storage, "session");
  assert.equal(restored?.exercises.length, 2);
  assert.deepEqual(restored?.exercises[0].sets, [{ set_number: 1, weight: 45, reps: 6 }]);
  assert.equal(restored?.exercises[1].display_name, "スクワット");
  assert.equal(readDraft(storage, "different"), null);
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
