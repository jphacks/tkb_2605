import { useEffect, useRef, useState } from "react";
import { createSearchParams, Link, useLocation, useNavigate, useParams } from "react-router";
import { completeWorkout, fetchWorkout, saveWorkoutSets, WorkoutApiError, type WorkoutDetail, type WorkoutExerciseDetail, type WorkoutSet } from "../api/workouts.ts";
import { blankSet, parseSets, type SetInput } from "../features/record/draft.ts";
import { recordReturnTo, type EntryState } from "../features/record/entry.ts";
import { acceptWorkout, workoutSessionVersion } from "../features/workouts/session.ts";
import { clearOperation, readOperation, writeOperation } from "../features/workouts/operationJournal.ts";
import { paths, workoutResultsPath } from "../routes.ts";
import "./WorkoutRecord.css";

function inputsFromSaved(sets: WorkoutSet[]): SetInput[] {
  return sets.map((set) => ({ id: set.workout_set_id, weight: set.weight, reps: String(set.reps) }));
}
function pendingOperation(key: string) {
  try { return { pending: readOperation(key) !== null, error: "" }; }
  catch (reason) { return { pending: true, error: reason instanceof Error ? reason.message : "送信状態を確認できません。" }; }
}

function RecordEditor({ workout, exercise, search, entry, storageWarning }: {
  workout: WorkoutDetail; exercise: WorkoutExerciseDetail; search: string; entry: EntryState | null; storageWarning: string;
}) {
  const navigate = useNavigate();
  const saveKey = "sets:" + exercise.workout_exercise_id;
  const finishKey = "finish:" + workout.workout_id;
  const [initialSave] = useState(() => pendingOperation(saveKey));
  const [initialFinish] = useState(() => pendingOperation(finishKey));
  const [sets, setSets] = useState<SetInput[]>(() => exercise.sets.length ? inputsFromSaved(exercise.sets) : [blankSet()]);
  const [savedSets, setSavedSets] = useState<WorkoutSet[] | null>(() => exercise.sets.length ? exercise.sets : null);
  const saved = useRef(savedSets);
  const [uncertain, setUncertain] = useState(initialSave.pending && !exercise.sets.length);
  const [finishUncertain, setFinishUncertain] = useState(initialFinish.pending);
  const [error, setError] = useState(initialSave.error || initialFinish.error);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  const sessionVersion = useRef(workoutSessionVersion());
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const returnTo = recordReturnTo(search, entry?.returnTo);
  const readOnly = savedSets !== null || uncertain || finishUncertain || busy;

  function isCurrent() { return mounted.current && sessionVersion.current === workoutSessionVersion(); }
  function replaceSaved(next: WorkoutSet[]) {
    // A confirmed server write clears its journal even after the user leaves.
    // Only the current editor may update the UI or continue to completion.
    clearOperation(saveKey);
    if (!isCurrent()) return false;
    const ordered = [...next].sort((a, b) => a.set_number - b.set_number);
    saved.current = ordered;
    setSavedSets(ordered);
    setSets(inputsFromSaved(ordered));
    setUncertain(false);
    return true;
  }
  function edit(change: (items: SetInput[]) => SetInput[]) {
    if (isCurrent() && !readOnly) { setSets(change); setError(""); }
  }
  function another() {
    if (!isCurrent()) return;
    void navigate({ pathname: paths[returnTo], search: "?" + createSearchParams({ workoutId: workout.workout_id }) });
  }

  async function prepare(next: "another" | "results") {
    if (!isCurrent() || lock.current || uncertain || finishUncertain) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!saved.current) {
        const input = parseSets(sets).map((set) => ({ ...set, weight: set.weight.toFixed(1) }));
        writeOperation(saveKey, { pending: true });
        try {
          const response = await saveWorkoutSets(exercise.workout_exercise_id, input);
          if (!replaceSaved(response.sets)) return;
        } catch (reason) {
          if (reason instanceof WorkoutApiError && reason.writeOutcome === "unknown") {
            if (isCurrent()) setUncertain(true);
          }
          else clearOperation(saveKey);
          throw reason;
        }
      }
      if (!isCurrent()) return;
      if (next === "another") { another(); return; }

      // Saved sets stay read-only even if completion fails. Retrying only PATCHes.
      writeOperation(finishKey, { pending: true });
      try {
        const completed = await completeWorkout(workout.workout_id);
        clearOperation(finishKey);
        if (!isCurrent()) return;
        acceptWorkout(completed);
        void navigate(workoutResultsPath(workout.workout_id));
      } catch (reason) {
        if (reason instanceof WorkoutApiError && reason.writeOutcome === "unknown") {
          if (isCurrent()) setFinishUncertain(true);
        }
        else clearOperation(finishKey);
        throw reason;
      }
    } catch (reason) {
      if (isCurrent()) setError(reason instanceof Error ? reason.message : "記録を保存できませんでした。");
    } finally { lock.current = false; if (isCurrent()) setBusy(false); }
  }

  async function reconcile() {
    if (!isCurrent() || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const current = await fetchWorkout(workout.workout_id);
      if (!isCurrent()) return;
      acceptWorkout(current);
      if (current.is_completed) {
        clearOperation(finishKey);
        void navigate(workoutResultsPath(current.workout_id), { replace: true });
        return;
      }
      const currentExercise = current.exercises.find((item) => item.workout_exercise_id === exercise.workout_exercise_id && item.exercise_id === exercise.exercise_id);
      if (!currentExercise) throw new Error("この種目の記録を確認できませんでした。");
      if (currentExercise.sets.length) replaceSaved(currentExercise.sets);
      else if (uncertain) setError("まだ保存結果を確認できません。しばらく待ってから、もう一度保存状態を確認してください。");
      // Completion is idempotent; after GET reports false, PATCH alone can retry.
      clearOperation(finishKey);
      setFinishUncertain(false);
    } catch (reason) { if (isCurrent()) setError(reason instanceof Error ? reason.message : "保存状態を確認できませんでした。"); }
    finally { lock.current = false; if (isCurrent()) setBusy(false); }
  }

  return <section className="record-screen" aria-labelledby="record-title" aria-busy={busy}>
    <h1 id="record-title">{exercise.display_name}</h1>
    <p className="record-context">{savedSets ? "保存済みの記録" : "セットごとに重量と回数を入力"}</p>
    <div className="record-sets">
      {sets.map((set, index) => {
        const number = savedSets?.[index].set_number ?? index + 1;
        return <div className="record-row" role="group" aria-label={`セット${number}`} key={set.id}>
          <span className="record-number" aria-hidden="true">セット{number}</span>
          <label className="record-weight"><span>重量</span><span className="record-weight-input"><input type="text" inputMode="decimal" value={set.weight} readOnly={readOnly} aria-label={`セット${number} 重量`} onChange={(event) => edit((items) => items.map((item) => item.id === set.id ? { ...item, weight: event.target.value } : item))} /><span>kg</span></span></label>
          <label className="record-reps"><span>回数</span><input type="text" inputMode="numeric" placeholder="回数" value={set.reps} readOnly={readOnly} aria-label={`セット${number} 回数`} onChange={(event) => edit((items) => items.map((item) => item.id === set.id ? { ...item, reps: event.target.value } : item))} /></label>
          {index > 0 && !savedSets ? <button type="button" className="record-delete" disabled={readOnly} aria-label={`セット${number}を削除`} onClick={() => edit((items) => items.filter((item) => item.id !== set.id))}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7" /></svg></button> : <span className="record-delete-space" />}
        </div>;
      })}
    </div>
    {!savedSets && <button type="button" className="record-add" disabled={readOnly} aria-label="セットを追加" onClick={() => edit((items) => [...items, blankSet()])}>+</button>}
    {error && <p className="record-error" role="alert">{error}</p>}
    {(uncertain || finishUncertain) && <div className="record-reconcile"><p>送信結果の確認が必要です。</p><button type="button" disabled={busy} onClick={() => void reconcile()}>保存状態を確認</button></div>}
    <div className="record-actions"><button type="button" className="record-another" disabled={busy || uncertain || finishUncertain} onClick={() => void prepare("another")}>別の種目</button><button type="button" className="record-finish" disabled={busy || uncertain || finishUncertain} onClick={() => void prepare("results")}>{busy ? "処理中…" : "終了"}</button></div>
    <p className="record-save-note">{savedSets ? "この種目は保存済みです。別の種目を選ぶか、トレーニングを終了できます。" : "「別の種目」「終了」で、この種目の全セットを保存します。保存前にページを離れると入力は失われます。"}</p>
    {storageWarning && <p className="record-save-note" role="status">{storageWarning}</p>}
  </section>;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; workout: WorkoutDetail; exercise: WorkoutExerciseDetail; storageWarning: string };
function RecordLoader({ workoutId, exerciseId, search, entry }: { workoutId: string; exerciseId: string; search: string; entry: EntryState | null }) {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const workoutExerciseId = new URLSearchParams(search).get("workoutExerciseId");
  useEffect(() => {
    const controller = new AbortController();
    const version = workoutSessionVersion();
    fetchWorkout(workoutId, { signal: controller.signal }).then((workout) => {
      if (controller.signal.aborted || version !== workoutSessionVersion()) return;
      const storageWarning = acceptWorkout(workout);
      if (workout.is_completed) { void navigate(workoutResultsPath(workoutId), { replace: true }); return; }
      const candidates = workout.exercises.filter((item) => item.exercise_id === exerciseId && (!workoutExerciseId || item.workout_exercise_id === workoutExerciseId));
      if (candidates.length !== 1) throw new Error("記録する種目を特定できません。種目選択画面から開き直してください。");
      const exercise = candidates[0];
      if (exercise.sets.length) clearOperation("sets:" + exercise.workout_exercise_id);
      setState({ status: "ready", workout, exercise, storageWarning });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted && version === workoutSessionVersion()) setState({ status: "error", message: reason instanceof Error ? reason.message : "記録を取得できませんでした。" });
    });
    return () => controller.abort();
  }, [workoutId, exerciseId, workoutExerciseId, attempt, navigate]);

  if (state.status === "ready") return <RecordEditor workout={state.workout} exercise={state.exercise} search={search} entry={entry} storageWarning={state.storageWarning} />;
  return <section className="record-screen"><h1>トレーニング記録</h1>{state.status === "loading" ? <p role="status">記録を読み込んでいます…</p> : <><p className="record-error" role="alert">{state.message}</p><button type="button" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>再試行</button></>}<p><Link to={{ pathname: paths.exercises, search: "?" + createSearchParams({ workoutId }) }}>種目選択へ</Link></p></section>;
}

export default function WorkoutRecord() {
  const { workoutId, exerciseId } = useParams<"workoutId" | "exerciseId">();
  const location = useLocation();
  if (!workoutId || !exerciseId) return null;
  return <RecordLoader key={workoutId + "/" + exerciseId + location.search} workoutId={workoutId} exerciseId={exerciseId} search={location.search} entry={location.state as EntryState | null} />;
}
