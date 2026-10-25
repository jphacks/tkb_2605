import { useState } from "react";
import { Link } from "react-router";
import { filterServerExercises } from "../features/exercises/serverCatalog.ts";
import { useExerciseCatalog } from "../features/exercises/useExerciseCatalog.ts";
import { useWorkoutSelection } from "../features/workouts/useWorkoutSelection.ts";
import { paths } from "../routes.ts";

export default function Exercises() {
  const { catalog, error: catalogError } = useExerciseCatalog();
  const { select, busy, error } = useWorkoutSelection("exercises");
  const [query, setQuery] = useState("");
  const [bodyPartId, setBodyPartId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const exercises = filterServerExercises(catalog?.exercises ?? [], query, bodyPartId, equipmentId);

  return (
    <section className="mx-auto max-w-xl" aria-labelledby="exercise-heading">
      <div role="search" className="relative">
        <label className="block">
          <span className="sr-only">種目名を検索</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-3 size-5 text-muted" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="種目名を検索" autoComplete="off" className="min-h-11 w-full rounded-xl border border-brand-border bg-white py-2 pl-10 pr-3 text-base outline-focus" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block min-w-0"><span className="sr-only">部位</span><select value={bodyPartId} onChange={(event) => setBodyPartId(event.target.value)} disabled={!catalog} aria-label="部位" className="min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink disabled:cursor-not-allowed"><option value="">部位（すべて）</option>{catalog?.body_parts.map((part) => <option key={part.body_part_id} value={part.body_part_id}>{part.name}</option>)}</select></label>
        <label className="block min-w-0"><span className="sr-only">器具</span><select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)} disabled={!catalog} aria-label="器具" className="min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink disabled:cursor-not-allowed"><option value="">器具（すべて）</option>{catalog?.equipment.map((item) => <option key={item.equipment_id} value={item.equipment_id}>{item.name}</option>)}</select></label>
      </div>
      {catalogError && <p role="alert" className="mt-3 text-sm text-error">{catalogError}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
      {busy && <p role="status" className="mt-3 text-sm text-muted">トレーニングを確認しています…</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 id="exercise-heading" className="text-sm font-semibold text-ink">種目を選ぶ</h1>
        <p role="status" aria-live="polite" className="text-xs text-muted">{catalog && `${exercises.length}種目`}</p>
      </div>
      <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-white">
        {exercises.map((exercise) => <li key={exercise.exercise_id} className="border-b border-line last:border-b-0">
          <button type="button" onClick={() => void select(exercise.exercise_id)} disabled={busy} aria-label={exercise.display_name + "を選んで記録へ"} className="flex min-h-16 w-full items-center gap-3 bg-white px-3 py-2 text-left transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus">
            <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-muted" aria-hidden="true">
              <svg viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-8"><path d="M10 12h12M3 9v6m26-6v6" /><rect x="5" y="5" width="5" height="14" rx="1.5" /><rect x="22" y="5" width="5" height="14" rx="1.5" /></svg>
              <span className="text-[8px] leading-3">画像準備中</span>
            </span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] leading-4 text-brand">{exercise.body_parts.map((part) => part.name).join("・")}</span><span className="block break-words text-sm font-medium leading-6 text-ink">{exercise.display_name}</span></span>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 shrink-0 text-muted" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
          </button>
        </li>)}
      </ul>
      {catalog && !exercises.length && <div className="rounded-xl bg-canvas px-4 py-8 text-center"><p className="text-sm text-muted">{catalog.exercises.length ? "該当する種目はありません。" : "種目データの準備中です。"}</p>{catalog.exercises.length > 0 && <button type="button" onClick={() => { setQuery(""); setBodyPartId(""); setEquipmentId(""); }} className="mt-3 min-h-11 rounded-lg px-4 text-sm font-medium text-brand underline underline-offset-4">検索条件をクリア</button>}</div>}
      <Link to={paths.home} className="mt-3 inline-flex min-h-11 items-center text-sm text-brand hover:underline">← ホームに戻る</Link>
    </section>
  );
}
