import { findSampleExercise } from "../exercises/catalog.ts";

export type EntryState = { exerciseName?: unknown; returnTo?: unknown };
export type SelectionScreen = "exercises" | "recommendations";

export function recordReturnTo(search: string, stateReturnTo: unknown): SelectionScreen {
  const from = new URLSearchParams(search).get("from");
  // URL context survives the login redirect and reloads that lose history state.
  if (from === "exercises" || from === "recommendations") return from;
  return stateReturnTo === "recommendations" ? "recommendations" : "exercises";
}

export function recordExerciseName(exerciseId: string, entryName: unknown, savedName?: string): string {
  if (typeof entryName === "string" && entryName.trim()) return entryName.trim();
  return savedName ?? findSampleExercise(exerciseId === "preview" ? "push-up" : exerciseId)?.display_name ?? "選択した種目";
}
