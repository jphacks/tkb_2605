import { useState, type FormEvent } from "react";
import { createSearchParams, Link, useNavigate, useParams } from "react-router";
import Page from "../components/Page.tsx";
import { exercises } from "../features/training/catalog.ts";
import { readWorkout, saveExercise } from "../features/workouts/storage.ts";
import { paths, workoutResultsPath } from "../routes.ts";

type DraftSet = { id: string; weight: string; value: string; completed: boolean };

export default function WorkoutRecord() {
  const { workoutId, exerciseId } = useParams<"workoutId" | "exerciseId">();
  const exercise = exercises.find((item) => item.id === exerciseId || (exerciseId === "preview" && item.id === "push-up"));
  if (!workoutId || !exercise) return <Page title="種目が見つかりません" description="種目一覧から選び直してください。"><Link to={{ pathname: paths.exercises, search: workoutId ? "?" + createSearchParams({ workoutId }) : "" }} className="text-emerald-800 underline">種目を選ぶ</Link></Page>;
  return <RecordEditor key={workoutId + "/" + exercise.id} workoutId={workoutId} exercise={exercise} />;
}

function RecordEditor({ workoutId, exercise }: { workoutId: string; exercise: (typeof exercises)[number] }) {
  const navigate = useNavigate();
  const [initial] = useState(() => readWorkout(workoutId));
  const [sets, setSets] = useState<DraftSet[]>(() => {
    const saved = initial.workout?.exercises.find((item) => item.exerciseId === exercise.id);
    return saved ? saved.sets.map((set) => ({ ...set, weight: String(set.weight), value: String(set.value) })) :
      [{ id: crypto.randomUUID(), weight: "0", value: exercise.mode === "seconds" ? "30" : "10", completed: false }];
  });
  const [error, setError] = useState(initial.error ?? "");
  const [saved, setSaved] = useState(() => Boolean(initial.workout?.exercises.some((item) => item.exerciseId === exercise.id)));
  const unit = exercise.mode === "seconds" ? "秒" : "回";
  const maxValue = exercise.mode === "seconds" ? 3600 : 999;
  const doneCount = sets.filter((set) => set.completed).length;

  function updateSet(id: string, changes: Partial<DraftSet>) {
    setSets((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));
    setSaved(false);
    setError("");
  }

  function save(): boolean {
    if (sets.some((set) => !set.weight.trim() || !set.value.trim() || !Number.isFinite(Number(set.weight)) ||
      Number(set.weight) < 0 || Number(set.weight) > 1000 || !Number.isInteger(Number(set.value)) ||
      Number(set.value) < 1 || Number(set.value) > maxValue)) {
      setError("重量は0〜1000kg、" + (exercise.mode === "seconds" ? "秒数は1〜3600秒" : "回数は1〜999回") + "で入力してください。");
      return false;
    }
    const result = saveExercise(workoutId, { exerciseId: exercise.id, name: exercise.name, mode: exercise.mode,
      sets: sets.map((set) => ({ ...set, weight: Number(set.weight), value: Number(set.value) })) });
    setError(result.error ?? "");
    setSaved(result.ok);
    return result.ok;
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); save(); }
  function leave(destination: string) { if (save()) void navigate(destination); }

  return (
    <>
      <button type="button" onClick={() => leave(paths.exercises + "?" + createSearchParams({ workoutId }))} className="min-h-11 text-sm font-medium text-emerald-800">← 種目を選ぶ</button>
      <Page title={exercise.name} description="セットごとの記録を残して、積み重ねを見える形に。">
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-5 py-4"><div><span className="text-xs font-bold tracking-widest text-emerald-700">WORKOUT RECORD</span><p className="mt-1 text-sm text-emerald-900">{exercise.muscle} · {exercise.equipment}</p></div><p className="text-sm text-emerald-900"><strong className="text-2xl">{doneCount}</strong> / {sets.length} 完了</p></div>
        <p className="text-xs leading-6 text-gray-500">この端末に記録を保存します。実施したセットは「完了」にチェックしてください。自重の種目は重量0kgで記録できます。</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">セット記録</h2><span className="text-xs text-gray-500">{saved ? "保存済み" : "保存前"}</span></div>
          <div className="space-y-3">
            {sets.map((set, index) => <fieldset key={set.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <legend className="px-2 text-sm font-bold text-gray-700">セット {index + 1}</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-semibold text-gray-600">重量（kg）<input aria-label={"セット" + (index + 1) + " 重量（kg）"} type="number" inputMode="decimal" min="0" max="1000" step="any" required value={set.weight} onChange={(event) => updateSet(set.id, { weight: event.target.value })} className="min-h-12 w-full min-w-0 rounded-xl border border-gray-300 px-3 text-base font-normal" /></label>
                <label className="space-y-1 text-xs font-semibold text-gray-600">{exercise.mode === "seconds" ? "時間（秒）" : "回数"}<input aria-label={"セット" + (index + 1) + (exercise.mode === "seconds" ? " 時間（秒）" : " 回数")} type="number" inputMode="numeric" min="1" max={maxValue} step="1" required value={set.value} onChange={(event) => updateSet(set.id, { value: event.target.value })} className="min-h-12 w-full min-w-0 rounded-xl border border-gray-300 px-3 text-base font-normal" /></label>
              </div>
              <div className="mt-3 flex items-center justify-between"><label className="flex min-h-11 items-center gap-2 text-sm font-medium text-emerald-800"><input type="checkbox" checked={set.completed} onChange={(event) => updateSet(set.id, { completed: event.target.checked })} aria-label={"セット" + (index + 1) + " 完了"} className="size-5 accent-emerald-700" />完了</label><button type="button" onClick={() => { setSets((items) => items.filter((item) => item.id !== set.id)); setSaved(false); }} aria-label={"セット" + (index + 1) + "を削除"} className="min-h-11 px-2 text-xs text-gray-500 hover:text-red-700">削除</button></div>
            </fieldset>)}
          </div>
          {!sets.length && <p className="rounded-xl bg-stone-50 p-5 text-sm text-gray-600">セットがありません。保存すると、この種目の記録を削除します。</p>}
          <button type="button" disabled={sets.length >= 100} onClick={() => { const last = sets.at(-1); setSets((items) => [...items, { id: crypto.randomUUID(), weight: last?.weight ?? "0", value: last?.value ?? (unit === "秒" ? "30" : "10"), completed: false }]); setSaved(false); }} className="min-h-12 w-full rounded-xl border border-dashed border-emerald-500 text-sm font-semibold text-emerald-800 disabled:opacity-40">＋ セットを追加</button>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">この端末に記録を保存しました。</p>}
          <button type="submit" className="min-h-12 w-full rounded-xl bg-emerald-800 px-5 font-semibold text-white hover:bg-emerald-900">記録を保存</button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => leave(paths.exercises + "?" + createSearchParams({ workoutId }))} className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-emerald-800">保存して別の種目へ</button>
          <button type="button" onClick={() => leave(workoutResultsPath(workoutId))} className="min-h-12 rounded-xl border border-emerald-800 px-4 text-sm font-semibold text-emerald-800">保存して結果を見る →</button>
        </div>
      </Page>
    </>
  );
}
