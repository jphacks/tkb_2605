import { useState } from "react";
import { createSearchParams, useLocation, useNavigate, useParams } from "react-router";
import { paths, workoutResultsPath } from "../routes.ts";
import { blankSet, parseSets, readDraft, saveDraft, type SetInput } from "../features/record/draft.ts";
import { recordExerciseName, recordReturnTo, type EntryState } from "../features/record/entry.ts";
import "./WorkoutRecord.css";

function initialDraft(workoutId: string, exerciseId: string) {
  try {
    const exercise = readDraft(localStorage, workoutId)?.exercises.find((item) => item.exercise_id === exerciseId);
    return { name: exercise?.display_name, sets: exercise?.sets.map((set) => ({ id: crypto.randomUUID(), weight: String(set.weight), reps: String(set.reps) })) ?? [blankSet()], error: "" };
  } catch (reason) {
    return { name: undefined, sets: [blankSet()], error: reason instanceof Error ? reason.message : "下書きを読み込めませんでした。" };
  }
}

function RecordEditor({ workoutId, exerciseId, search, entry }: { workoutId: string; exerciseId: string; search: string; entry: EntryState | null }) {
  const navigate = useNavigate();
  const [initial] = useState(() => initialDraft(workoutId, exerciseId));
  const [sets, setSets] = useState(initial.sets);
  const [error, setError] = useState(initial.error);
  const exerciseName = recordExerciseName(exerciseId, entry?.exerciseName, initial.name);
  const returnTo = recordReturnTo(search, entry?.returnTo);

  function edit(change: (items: SetInput[]) => SetInput[]) {
    setSets(change); setError("");
  }
  function prepare(next: "another" | "results") {
    try {
      const recordedSets = parseSets(sets);
      saveDraft(localStorage, workoutId, { exercise_id: exerciseId, display_name: exerciseName, sets: recordedSets });
      setError("");
      if (next === "results") void navigate(workoutResultsPath(workoutId));
      else void navigate({ pathname: paths[returnTo], search: "?" + createSearchParams({ workoutId }) });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "記録を保存できませんでした。"); }
  }

  return <section className="record-screen" aria-labelledby="record-title">
    <h1 id="record-title">{exerciseName}</h1>
    <p className="record-context">セットごとに重量と回数を入力</p>
    <div className="record-sets">
      {sets.map((set, index) => <div className="record-row" role="group" aria-label={`セット${index + 1}`} key={set.id}>
        <span className="record-number" aria-hidden="true">セット{index + 1}</span>
        <label className="record-weight"><span>重量</span><span className="record-weight-input"><input type="text" inputMode="decimal" value={set.weight} aria-label={`セット${index + 1} 重量`} onChange={(event) => edit((items) => items.map((item) => item.id === set.id ? { ...item, weight: event.target.value } : item))} /><span>kg</span></span></label>
        <label className="record-reps"><span>回数</span><input type="text" inputMode="numeric" placeholder="回数" value={set.reps} aria-label={`セット${index + 1} 回数`} onChange={(event) => edit((items) => items.map((item) => item.id === set.id ? { ...item, reps: event.target.value } : item))} /></label>
        {index > 0 ? <button type="button" className="record-delete" aria-label={`セット${index + 1}を削除`} onClick={() => edit((items) => items.filter((item) => item.id !== set.id))}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7" /></svg></button> : <span className="record-delete-space" />}
      </div>)}
    </div>
    <button type="button" className="record-add" aria-label="セットを追加" onClick={() => edit((items) => [...items, blankSet()])}>+</button>
    {error && <p className="record-error" role="alert">{error}</p>}
    <div className="record-actions"><button type="button" className="record-another" onClick={() => prepare("another")}>別の種目</button><button type="button" className="record-finish" onClick={() => prepare("results")}>終了</button></div>
    <p className="record-save-note">ボタンを押すと、この端末に下書きを保存して移動します。サーバー保存は準備中です。</p>
  </section>;
}

export default function WorkoutRecord() {
  const { workoutId, exerciseId } = useParams<"workoutId" | "exerciseId">();
  const location = useLocation();
  if (!workoutId || !exerciseId) return null;
  return <RecordEditor key={workoutId + "/" + exerciseId} workoutId={workoutId} exerciseId={exerciseId} search={location.search} entry={location.state as EntryState | null} />;
}
