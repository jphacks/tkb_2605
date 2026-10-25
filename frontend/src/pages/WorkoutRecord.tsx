import { useEffect, useRef, useState } from "react";
import { createSearchParams, Link, useLocation, useNavigate, useParams } from "react-router";
import { completeWorkout, fetchWorkout, saveWorkoutSets, WORKOUT_MOCK_NOTICE, type WorkoutDetail, type WorkoutExerciseDetail, type WorkoutSet } from "../api/workouts.ts";
import { blankSet, parseSets, type SetInput } from "../features/record/draft.ts";
import { recordReturnTo, type EntryState } from "../features/record/entry.ts";
import { workoutSessionVersion } from "../features/workouts/session.ts";
import { paths, workoutResultsPath } from "../routes.ts";
import "./WorkoutRecord.css";

function inputsFromResponse(sets: WorkoutSet[]): SetInput[] {
  return sets.map((set) => ({ id: set.workout_set_id, weight: set.weight, reps: String(set.reps) }));
}

function RecordEditor({ workout, exercise, search, entry }: {
  workout: WorkoutDetail; exercise: WorkoutExerciseDetail; search: string; entry: EntryState | null;
}) {
  const navigate = useNavigate();
  const [sets, setSets] = useState<SetInput[]>(() => exercise.sets.length ? inputsFromResponse(exercise.sets) : [blankSet()]);
  // GET returns fixed samples, not proof that these inputs were already saved.
  const [responseSets, setResponseSets] = useState<WorkoutSet[] | null>(null);
  const sent = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  const sessionVersion = useRef(workoutSessionVersion());
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const returnTo = recordReturnTo(search, entry?.returnTo);
  const readOnly = responseSets !== null || busy;
  function isCurrent() { return mounted.current && sessionVersion.current === workoutSessionVersion(); }
  function edit(change: (items: SetInput[]) => SetInput[]) {
    if (isCurrent() && !readOnly) { setSets(change); setError(""); }
  }

  async function prepare(next: "another" | "results") {
    if (!isCurrent() || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (!sent.current) {
        const input = parseSets(sets).map((set) => ({ ...set, weight: set.weight.toFixed(1) }));
        const response = await saveWorkoutSets(exercise.workout_exercise_id, input);
        if (!isCurrent()) return;
        const ordered = [...response.sets].sort((a, b) => a.set_number - b.set_number);
        sent.current = true;
        setResponseSets(ordered);
        setSets(inputsFromResponse(ordered));
      }
      if (!isCurrent()) return;
      if (next === "another") {
        void navigate({ pathname: paths[returnTo], search: "?" + createSearchParams({ workoutId: workout.workout_id }) });
        return;
      }
      // A failed PATCH retries PATCH only. Neither response proves persistence.
      await completeWorkout(workout.workout_id);
      if (isCurrent()) void navigate(workoutResultsPath(workout.workout_id));
    } catch (reason) {
      if (isCurrent()) setError(reason instanceof Error ? reason.message : "応答を確認できませんでした。");
    } finally { lock.current = false; if (isCurrent()) setBusy(false); }
  }

  return <section className="record-screen" aria-labelledby="record-title" aria-busy={busy}>
    <h1 id="record-title">{exercise.display_name}</h1>
    <p className="record-context">動作確認用のサンプル</p>
    <p className="record-save-note">{WORKOUT_MOCK_NOTICE}</p>
    <div className="record-sets">
      {sets.map((set, index) => {
        const number = responseSets?.[index].set_number ?? index + 1;
        return <div className="record-row" role="group" aria-label={"セット" + number} key={set.id}>
          <span className="record-number" aria-hidden="true">セット{number}</span>
          <label className="record-weight"><span>重量</span><span className="record-weight-input"><input type="text" inputMode="decimal" value={set.weight} readOnly={readOnly} aria-label={"セット" + number + " 重量"} onChange={(event) => edit((items) => items.map((item) => item.id === set.id ? { ...item, weight: event.target.value } : item))} /><span>kg</span></span></label>
          <label className="record-reps"><span>回数</span><input type="text" inputMode="numeric" placeholder="回数" value={set.reps} readOnly={readOnly} aria-label={"セット" + number + " 回数"} onChange={(event) => edit((items) => items.map((item) => item.id === set.id ? { ...item, reps: event.target.value } : item))} /></label>
          {index > 0 && !responseSets ? <button type="button" className="record-delete" disabled={readOnly} aria-label={"セット" + number + "を削除"} onClick={() => edit((items) => items.filter((item) => item.id !== set.id))}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7" /></svg></button> : <span className="record-delete-space" />}
        </div>;
      })}
    </div>
    {!responseSets && <button type="button" className="record-add" disabled={readOnly} aria-label="セットを追加" onClick={() => edit((items) => [...items, blankSet()])}>+</button>}
    {error && <p className="record-error" role="alert">{error}</p>}
    <div className="record-actions"><button type="button" className="record-another" disabled={busy} onClick={() => void prepare("another")}>別の種目</button><button type="button" className="record-finish" disabled={busy} onClick={() => void prepare("results")}>{busy ? "処理中…" : "終了"}</button></div>
    <p className="record-save-note">{responseSets ? "送信への応答を表示しています。記録は保存されていません。" : "「別の種目」「終了」で入力内容を送信します。応答には固定のサンプルが返ります。"}</p>
  </section>;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; workout: WorkoutDetail; exercise: WorkoutExerciseDetail };
function RecordLoader({ workoutId, exerciseId, search, entry }: { workoutId: string; exerciseId: string; search: string; entry: EntryState | null }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const workoutExerciseId = new URLSearchParams(search).get("workoutExerciseId");
  useEffect(() => {
    const controller = new AbortController();
    const version = workoutSessionVersion();
    fetchWorkout(workoutId, { signal: controller.signal }).then((workout) => {
      if (controller.signal.aborted || version !== workoutSessionVersion()) return;
      const candidates = workout.exercises.filter((item) => item.exercise_id === exerciseId && (!workoutExerciseId || item.workout_exercise_id === workoutExerciseId));
      if (candidates.length !== 1) throw new Error("応答の種目を特定できません。種目選択画面から開き直してください。");
      setState({ status: "ready", workout, exercise: candidates[0] });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted && version === workoutSessionVersion()) setState({ status: "error", message: reason instanceof Error ? reason.message : "記録を取得できませんでした。" });
    });
    return () => controller.abort();
  }, [workoutId, exerciseId, workoutExerciseId, attempt]);

  if (state.status === "ready") return <RecordEditor workout={state.workout} exercise={state.exercise} search={search} entry={entry} />;
  return <section className="record-screen"><h1>トレーニング記録</h1>{state.status === "loading" ? <p role="status">読み込んでいます…</p> : <><p className="record-error" role="alert">{state.message}</p><button type="button" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>再試行</button></>}<p><Link to={{ pathname: paths.exercises, search: "?" + createSearchParams({ workoutId }) }}>種目選択へ</Link></p></section>;
}

export default function WorkoutRecord() {
  const { workoutId, exerciseId } = useParams<"workoutId" | "exerciseId">();
  const location = useLocation();
  if (!workoutId || !exerciseId) return null;
  return <RecordLoader key={workoutId + "/" + exerciseId + location.search} workoutId={workoutId} exerciseId={exerciseId} search={location.search} entry={location.state as EntryState | null} />;
}
