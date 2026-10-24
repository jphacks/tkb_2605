// Local display samples, not an HTTP response contract or server-assigned IDs.
// Issue #14 allows each exercise to be associated with multiple body parts.
export type ExerciseSample = {
  exercise_id: string;
  display_name: string;
  body_parts: readonly { body_part_id: string; name: string }[];
};

const arms = { body_part_id: "arms", name: "腕" };
const legs = { body_part_id: "legs", name: "足" };
const abdomen = { body_part_id: "abdomen", name: "腹" };
const chest = { body_part_id: "chest", name: "胸" };
const back = { body_part_id: "back", name: "背中" };
const shoulders = { body_part_id: "shoulders", name: "肩" };

export const sampleExercises: readonly ExerciseSample[] = [
  { exercise_id: "bench-press", display_name: "ベンチプレス", body_parts: [chest, arms] },
  { exercise_id: "push-up", display_name: "プッシュアップ", body_parts: [chest, arms] },
  { exercise_id: "squat", display_name: "スクワット", body_parts: [legs] },
  { exercise_id: "dumbbell-row", display_name: "ダンベルロー", body_parts: [back] },
  { exercise_id: "shoulder-press", display_name: "ショルダープレス", body_parts: [shoulders, arms] },
  { exercise_id: "lat-pulldown", display_name: "ラットプルダウン", body_parts: [back] },
  { exercise_id: "lunge", display_name: "ランジ", body_parts: [legs] },
  { exercise_id: "crunch", display_name: "クランチ", body_parts: [abdomen] },
  { exercise_id: "dumbbell-curl", display_name: "ダンベルカール", body_parts: [arms] },
  { exercise_id: "hammer-curl", display_name: "ハンマーカール", body_parts: [arms] },
  { exercise_id: "kickback", display_name: "キックバック", body_parts: [arms] },
  { exercise_id: "calf-raise", display_name: "カーフレイズ", body_parts: [legs] },
  { exercise_id: "leg-raise", display_name: "レッグレイズ", body_parts: [abdomen] },
  { exercise_id: "bicycle-crunch", display_name: "バイシクルクランチ", body_parts: [abdomen] },
  { exercise_id: "chest-press", display_name: "チェストプレス", body_parts: [chest, arms] },
  { exercise_id: "reverse-fly", display_name: "リバースフライ", body_parts: [back, shoulders] },
];

export function findSampleExercise(id: string): ExerciseSample | undefined {
  return sampleExercises.find((exercise) => exercise.exercise_id === id);
}
