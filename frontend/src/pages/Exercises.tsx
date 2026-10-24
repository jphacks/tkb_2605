import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { sampleExercises } from "../features/exercises/sampleExercises.ts";
import { paths, workoutExercisePath } from "../routes.ts";

export default function Exercises() {
  const [searchParams] = useSearchParams();
  const [newWorkoutId] = useState(() => crypto.randomUUID());
  const workoutId = searchParams.get("workoutId") || newWorkoutId;
  const [query, setQuery] = useState("");
  const normalizedQuery = query.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
  const exercises = sampleExercises.filter((exercise) => exercise.name.normalize("NFKC").toLocaleLowerCase("ja-JP").includes(normalizedQuery));

  return (
    <section className="mx-auto max-w-xl" aria-labelledby="exercise-heading">
      <div role="search" className="relative">
        <label className="block">
          <span className="sr-only">種目名を検索</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-3 size-5 text-gray-400" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="種目名を検索" autoComplete="off" className="min-h-11 w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-base outline-emerald-700" />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3" aria-describedby="exercise-sample-note">
        <label className="block min-w-0"><span className="sr-only">部位</span><select disabled aria-label="部位" className="min-h-11 w-full rounded-xl border border-gray-200 bg-stone-50 px-3 text-sm text-gray-500 disabled:cursor-not-allowed"><option>部位（準備中）</option></select></label>
        <label className="block min-w-0"><span className="sr-only">器具</span><select disabled aria-label="器具" className="min-h-11 w-full rounded-xl border border-gray-200 bg-stone-50 px-3 text-sm text-gray-500 disabled:cursor-not-allowed"><option>器具（準備中）</option></select></label>
      </div>
      <p id="exercise-sample-note" className="mt-2 text-[11px] leading-5 text-gray-500">種目・部位はサンプルです。画像と絞り込みは準備中です。</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 id="exercise-heading" className="text-sm font-semibold text-gray-800">種目を選ぶ</h1>
        <p role="status" aria-live="polite" className="text-xs text-gray-500">{exercises.length}種目</p>
      </div>
      <ul className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {exercises.map((exercise) => <li key={exercise.id} className="border-b border-gray-100 last:border-b-0">
          <Link to={workoutExercisePath(workoutId, exercise.id)} state={{ exerciseName: exercise.name, returnTo: "exercises" }} aria-label={exercise.name + "を選んで記録へ"} className="flex min-h-16 items-center gap-3 px-3 py-2 transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700">
            <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-stone-100 text-stone-400" aria-hidden="true">
              <svg viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-8"><path d="M10 12h12M3 9v6m26-6v6" /><rect x="5" y="5" width="5" height="14" rx="1.5" /><rect x="22" y="5" width="5" height="14" rx="1.5" /></svg>
              <span className="text-[8px] leading-3">画像準備中</span>
            </span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] leading-4 text-emerald-700">{exercise.bodyPart}</span><span className="block break-words text-sm font-medium leading-6 text-gray-800">{exercise.name}</span></span>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4 shrink-0 text-gray-400" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
          </Link>
        </li>)}
      </ul>
      {!exercises.length && <div className="rounded-xl bg-stone-50 px-4 py-8 text-center"><p className="text-sm text-gray-600">該当する種目はありません。</p><p className="mt-2 text-xs text-gray-500">種目名で検索してください。</p><button type="button" onClick={() => setQuery("")} className="mt-3 min-h-11 rounded-lg px-4 text-sm font-medium text-emerald-800 underline underline-offset-4">検索をクリア</button></div>}
      <Link to={paths.home} className="mt-3 inline-flex min-h-11 items-center text-sm text-emerald-800 hover:underline">← ホームに戻る</Link>
    </section>
  );
}
