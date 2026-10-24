import { useEffect, useRef, useState } from "react";
import { createSearchParams, useLocation, useNavigate, useSearchParams } from "react-router";
import { addWorkoutExercise, fetchWorkout, WorkoutApiError, type WorkoutExercise } from "../../api/workouts.ts";
import { paths, workoutExercisePath } from "../../routes.ts";
import type { SelectionScreen } from "../record/entry.ts";
import { clearOperation, readOperation, writeOperation } from "./operationJournal.ts";
import { acceptWorkout, workoutSessionVersion } from "./session.ts";
import { startWorkout, StartWorkoutUncertainError, uncertainStartMessage } from "./startWorkout.ts";

type PendingAdd = { kind: "add"; workoutId: string; exerciseId: string; beforeIds: string[] };
type SelectionState = { error: string; uncertain: boolean };
const uncertainAddMessage = "種目の追加結果を確認できません。重複を防ぐため再送を停止しています。保存済みの記録を確認してください。";

function pendingAdd(value: unknown, workoutId: string): value is PendingAdd {
  if (value === null || typeof value !== "object") return false;
  const item = value as Partial<PendingAdd>;
  return item.kind === "add" && item.workoutId === workoutId && typeof item.exerciseId === "string" && item.exerciseId.trim().length > 0 &&
    Array.isArray(item.beforeIds) && item.beforeIds.every((id) => typeof id === "string" && id.trim().length > 0) && new Set(item.beforeIds).size === item.beforeIds.length;
}

function message(reason: unknown): string { return reason instanceof Error ? reason.message : "記録APIに接続できませんでした。"; }
function journalStatus(workoutId: string): SelectionState {
  try {
    const pending = readOperation(workoutId ? "add:" + workoutId : "start");
    return pending === null ? { error: "", uncertain: false } : { error: workoutId ? uncertainAddMessage : uncertainStartMessage, uncertain: true };
  } catch (reason) { return { error: message(reason), uncertain: true }; }
}

export function useWorkoutSelection(from: SelectionScreen) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get("workoutId") ?? "";
  const pending = journalStatus(workoutId);
  const [state, setState] = useState<SelectionState>({ error: "", uncertain: false });
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function show(error: string, uncertain = false) {
    if (mounted.current) setState({ error, uncertain });
  }
  function openRecord(id: string, exercise: Pick<WorkoutExercise, "exercise_id" | "workout_exercise_id">, version: number) {
    if (!mounted.current || version !== workoutSessionVersion()) return;
    void navigate({
      pathname: workoutExercisePath(id, exercise.exercise_id),
      search: "?" + createSearchParams({ workoutExerciseId: exercise.workout_exercise_id, from }),
    });
  }

  async function select(exerciseId: string): Promise<void> {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    show("");
    const version = workoutSessionVersion();
    const active = () => mounted.current && version === workoutSessionVersion();
    const update = (error: string, uncertain = false) => { if (active()) show(error, uncertain); };
    let id = workoutId;
    try {
      if (!exerciseId.trim()) throw new Error("種目を選択してください。");
      if (!id) {
        const started = await startWorkout();
        id = started.workout.workout_id;
        if (!active()) return;
        update(started.storageWarning);
        // Retain the server ID even if the following GET or add request fails.
        await navigate({ pathname: paths[from], search: "?" + createSearchParams({ workoutId: id }) }, { replace: true });
      }
      if (!active()) return;
      if (readOperation("add:" + id) !== null) { update(uncertainAddMessage, true); return; }
      const workout = await fetchWorkout(id);
      if (!active()) return;
      const warning = acceptWorkout(workout);
      if (workout.is_completed) { update("このトレーニングは終了しています。種目は追加できません。"); return; }
      update(warning);
      if (readOperation("add:" + id) !== null) { update(uncertainAddMessage, true); return; }
      const operation: PendingAdd = { kind: "add", workoutId: id, exerciseId, beforeIds: workout.exercises.map((item) => item.workout_exercise_id) };
      writeOperation("add:" + id, operation);
      let added: WorkoutExercise;
      try {
        added = await addWorkoutExercise(id, exerciseId);
      } catch (reason) {
        if (reason instanceof WorkoutApiError && (reason.writeOutcome === "not-sent" || reason.writeOutcome === "rejected")) {
          clearOperation("add:" + id);
          update(message(reason));
        } else update(uncertainAddMessage, true);
        return;
      }
      clearOperation("add:" + id);
      openRecord(id, added, version);
    } catch (reason) {
      update(message(reason), reason instanceof StartWorkoutUncertainError);
    } finally {
      locked.current = false;
      if (active()) setBusy(false);
    }
  }

  async function reconcile(): Promise<void> {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    const id = workoutId;
    const version = workoutSessionVersion();
    const active = () => mounted.current && version === workoutSessionVersion();
    const update = (error: string, uncertain = false) => { if (active()) show(error, uncertain); };
    try {
      if (!id) {
        const pendingStart = readOperation("start") !== null;
        update(pendingStart ? uncertainStartMessage : "", pendingStart);
        return;
      }
      const operation = readOperation("add:" + id);
      if (operation === null) { update(""); return; }
      if (!pendingAdd(operation, id)) { update("前回の送信内容を確認できないため、種目の追加を停止しています。", true); return; }
      const workout = await fetchWorkout(id);
      if (!active()) return;
      const warning = acceptWorkout(workout);
      const added = workout.exercises.filter((item) => item.exercise_id === operation.exerciseId && !operation.beforeIds.includes(item.workout_exercise_id));
      if (added.length !== 1) {
        update(added.length > 1 ? "追加された種目の候補が複数あり、送信結果を特定できません。再送を停止しています。" : "追加された種目はまだ確認できません。処理中の可能性があるため再送を停止しています。時間をおいて再度確認してください。", true);
        return;
      }
      clearOperation("add:" + id);
      update(warning);
      openRecord(id, added[0], version);
    } catch (reason) { update(message(reason), true); }
    finally {
      locked.current = false;
      if (active()) setBusy(false);
    }
  }

  const entryWarning: unknown = location.state?.workoutWarning;
  return {
    select, busy, reconcile,
    error: state.error || pending.error || (typeof entryWarning === "string" ? entryWarning : ""),
    uncertain: state.uncertain || pending.uncertain,
  };
}
