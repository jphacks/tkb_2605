import assert from "node:assert/strict";
import test from "node:test";
import masterFile from "../src/features/exercises/serverCatalogData.json" with { type: "json" };
import { filterServerExercises, parseServerCatalog, recommendationKeys, resolveRecommendation } from "../src/features/exercises/serverCatalog.ts";

function fixture() {
  return {
    body_parts: [{ body_part_id: "chest-id", name: "胸" }, { body_part_id: "arms-id", name: "腕" }, { body_part_id: "back-id", name: "背中" }],
    equipment: [{ equipment_id: "bar-id", name: "バーベル" }, { equipment_id: "dumbbell-id", name: "ダンベル" }],
    exercises: [
      { exercise_id: "db-bench", display_name: "ベンチプレス", body_part_ids: ["chest-id", "arms-id"], equipment_ids: ["bar-id"] },
      { exercise_id: "db-row", display_name: "ダンベルロー", body_part_ids: ["back-id", "arms-id"], equipment_ids: ["dumbbell-id"] },
      { exercise_id: "db-push", display_name: "プッシュアップ", body_part_ids: ["chest-id", "arms-id"], equipment_ids: [] },
    ],
    recommendations: { "bench-press": "db-bench" },
  };
}

test("the checked-in master has unique UUIDs and explicitly maps every recommendation", () => {
  const catalog = parseServerCatalog(masterFile);
  assert.equal(catalog.exercises.length, 16);
  assert.equal(new Set(catalog.exercises.map((exercise) => exercise.exercise_id)).size, 16);
  for (const exercise of catalog.exercises) assert.match(exercise.exercise_id, /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i);
  for (const key of recommendationKeys) {
    const exercise = resolveRecommendation(catalog, key);
    assert.ok(exercise, `missing recommendation mapping: ${key}`);
    assert.notEqual(exercise.exercise_id, key);
  }
});

test("normalization joins the explicit body and equipment references without changing IDs", () => {
  const catalog = parseServerCatalog(fixture());
  assert.deepEqual(catalog.exercises[0], {
    exercise_id: "db-bench", display_name: "ベンチプレス",
    body_parts: [{ body_part_id: "chest-id", name: "胸" }, { body_part_id: "arms-id", name: "腕" }],
    equipment: [{ equipment_id: "bar-id", name: "バーベル" }],
  });
  assert.equal(resolveRecommendation(catalog, "bench-press")?.exercise_id, "db-bench");
});

test("matching names and sample keys cannot substitute for an explicit recommendation mapping", () => {
  const data = { ...fixture(), recommendations: {} };
  const catalog = parseServerCatalog(data);
  assert.equal(resolveRecommendation(catalog, "bench-press"), undefined);
  assert.equal(catalog.exercises.find((exercise) => exercise.exercise_id === "bench-press"), undefined);
});

test("invalid masters fail closed instead of producing selectable incomplete entries", () => {
  assert.throws(() => parseServerCatalog(null), /形式/);
  assert.throws(() => parseServerCatalog({ ...fixture(), exercises: [{ exercise_id: "only-id" }] }), /形式/);
  const duplicateExercise = fixture();
  duplicateExercise.exercises.push(duplicateExercise.exercises[0]);
  assert.throws(() => parseServerCatalog(duplicateExercise), /形式/);
  const duplicatePart = fixture();
  duplicatePart.body_parts.push(duplicatePart.body_parts[0]);
  assert.throws(() => parseServerCatalog(duplicatePart), /形式/);
  const invalidAssociation = fixture();
  invalidAssociation.exercises[0].body_part_ids.push("unknown-part");
  assert.throws(() => parseServerCatalog(invalidAssociation), /対応/);
  const duplicateAssociation = fixture();
  duplicateAssociation.exercises[0].equipment_ids.push("bar-id");
  assert.throws(() => parseServerCatalog(duplicateAssociation), /対応/);
  assert.throws(() => parseServerCatalog({ ...fixture(), recommendations: { "bench-press": "unknown-exercise" } }), /対応/);
  assert.throws(() => parseServerCatalog({ ...fixture(), recommendations: { unknown: "db-bench" } }), /対応/);
});

test("name search normalizes text without searching body or equipment labels", () => {
  const { exercises } = parseServerCatalog(fixture());
  assert.deepEqual(filterServerExercises(exercises, " ﾍﾞﾝﾁ ").map((item) => item.exercise_id), ["db-bench"]);
  assert.deepEqual(filterServerExercises(exercises, "胸"), []);
  assert.deepEqual(filterServerExercises(exercises, "バーベル"), []);
});

test("body and equipment filters use AND and retain each matching exercise only once", () => {
  const { exercises } = parseServerCatalog(fixture());
  assert.equal(filterServerExercises(exercises, "", "arms-id").length, 3);
  assert.deepEqual(filterServerExercises(exercises, "", "arms-id", "bar-id").map((item) => item.exercise_id), ["db-bench"]);
  assert.deepEqual(filterServerExercises(exercises, "", "chest-id", "dumbbell-id"), []);
  assert.deepEqual(filterServerExercises(exercises, "ロー", "arms-id", "dumbbell-id").map((item) => item.exercise_id), ["db-row"]);
  assert.equal(filterServerExercises(exercises, "").length, 3);
});
