export const recommendationKeys = [
  "dumbbell-curl", "hammer-curl", "kickback", "squat", "lunge", "calf-raise",
  "crunch", "leg-raise", "bicycle-crunch", "push-up", "bench-press", "chest-press",
  "dumbbell-row", "lat-pulldown", "reverse-fly",
] as const;
export type RecommendationKey = typeof recommendationKeys[number];
export type BodyPart = { body_part_id: string; name: string };
export type Equipment = { equipment_id: string; name: string };
export type ServerExercise = {
  exercise_id: string;
  display_name: string;
  body_parts: readonly BodyPart[];
  equipment: readonly Equipment[];
};
// UI model derived from the normalized master file owned by the frontend.
export type ServerCatalogData = {
  exercises: readonly ServerExercise[];
  body_parts: readonly BodyPart[];
  equipment: readonly Equipment[];
  recommendations: Readonly<Partial<Record<RecommendationKey, string>>>;
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function master(value: unknown, idField: "body_part_id" | "equipment_id"): Map<string, string> {
  if (!Array.isArray(value)) throw new Error("部位・器具データの形式を確認できませんでした。");
  const entries = new Map<string, string>();
  const names = new Set<string>();
  for (const item of value) {
    if (!object(item)) throw new Error("部位・器具データの形式を確認できませんでした。");
    const id = item[idField];
    if (!nonempty(id) || !nonempty(item.name) || entries.has(id) || names.has(item.name)) throw new Error("部位・器具データの形式を確認できませんでした。");
    entries.set(id, item.name);
    names.add(item.name);
  }
  return entries;
}
function references(value: unknown, entries: Map<string, string>): string[] {
  if (!Array.isArray(value) || !value.every((id) => nonempty(id) && entries.has(id)) || new Set(value).size !== value.length) {
    throw new Error("種目と部位・器具の対応を確認できませんでした。");
  }
  return value as string[];
}

// Only explicit IDs from the master file are usable; names and sample slugs never supply IDs.
export function parseServerCatalog(value: unknown): ServerCatalogData {
  if (!object(value) || !Array.isArray(value.exercises) || !object(value.recommendations)) {
    throw new Error("種目データの形式を確認できませんでした。");
  }
  const parts = master(value.body_parts, "body_part_id");
  const equipment = master(value.equipment, "equipment_id");
  const exerciseIds = new Set<string>();
  const exercises: ServerExercise[] = value.exercises.map((exercise: unknown) => {
    if (!object(exercise) || !nonempty(exercise.exercise_id) || !nonempty(exercise.display_name) || exerciseIds.has(exercise.exercise_id)) {
      throw new Error("種目データの形式を確認できませんでした。");
    }
    exerciseIds.add(exercise.exercise_id);
    return {
      exercise_id: exercise.exercise_id,
      display_name: exercise.display_name,
      body_parts: references(exercise.body_part_ids, parts).map((id) => ({ body_part_id: id, name: parts.get(id)! })),
      equipment: references(exercise.equipment_ids, equipment).map((id) => ({ equipment_id: id, name: equipment.get(id)! })),
    };
  });
  const recommendations: Partial<Record<RecommendationKey, string>> = {};
  for (const [key, id] of Object.entries(value.recommendations)) {
    if (!(recommendationKeys as readonly string[]).includes(key) || !nonempty(id) || !exerciseIds.has(id)) {
      throw new Error("おすすめメニューと種目データの対応を確認できませんでした。");
    }
    recommendations[key as RecommendationKey] = id;
  }
  return {
    exercises,
    body_parts: [...parts].map(([body_part_id, name]) => ({ body_part_id, name })),
    equipment: [...equipment].map(([equipment_id, name]) => ({ equipment_id, name })),
    recommendations,
  };
}

export function resolveRecommendation(catalog: ServerCatalogData, key: RecommendationKey): ServerExercise | undefined {
  const id = catalog.recommendations[key];
  return id ? catalog.exercises.find((exercise) => exercise.exercise_id === id) : undefined;
}

export function filterServerExercises(exercises: readonly ServerExercise[], query: string, bodyPartId = "", equipmentId = ""): readonly ServerExercise[] {
  const normalized = query.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
  return exercises.filter((exercise) => exercise.display_name.normalize("NFKC").toLocaleLowerCase("ja-JP").includes(normalized)
    && (!bodyPartId || exercise.body_parts.some((part) => part.body_part_id === bodyPartId))
    && (!equipmentId || exercise.equipment.some((item) => item.equipment_id === equipmentId)));
}
