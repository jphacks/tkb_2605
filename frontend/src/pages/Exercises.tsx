import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import Page from "../components/Page.tsx";
import { exercises, muscles } from "../features/training/catalog.ts";
import { paths, workoutExercisePath } from "../routes.ts";

export default function Exercises() {
  const [searchParams] = useSearchParams();
  const [newWorkoutId] = useState(() => crypto.randomUUID());
  const workoutId = searchParams.get("workoutId") || newWorkoutId;
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string>("すべて");
  const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");
  const filtered = exercises.filter((exercise) =>
    (muscle === "すべて" || exercise.muscle === muscle) &&
    [exercise.name, exercise.muscle, exercise.equipment].join(" ").toLocaleLowerCase("ja-JP").includes(normalizedQuery),
  );

  return (
    <>
      <Link to={paths.home} className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 hover:underline">← ホーム</Link>
      <Page title="種目を選ぶ" description="今日取り組みたい種目を見つけよう。">
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <span>{searchParams.get("workoutId") ? "今のトレーニングに種目を追加" : "新しいトレーニングを始めよう"}</span>
          <span className="text-xs font-bold tracking-widest">LET’S MOVE</span>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">種目を検索</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="種目名・部位・器具名で検索" className="min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base outline-offset-4 focus:border-emerald-700" />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="鍛える部位">
          {muscles.map((item) => <button key={item} type="button" aria-pressed={muscle === item} onClick={() => setMuscle(item)} className={["min-h-11 rounded-full border px-4 text-sm font-medium", muscle === item ? "border-emerald-800 bg-emerald-800 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-emerald-500"].join(" ")}>{item}</button>)}
        </div>
        <p className="text-sm text-gray-500" role="status">{filtered.length} 種目が見つかりました</p>
        {filtered.length ? <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((exercise) => <Link key={exercise.id} to={workoutExercisePath(workoutId, exercise.id)} className="group flex min-w-0 flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" aria-label={exercise.name + "を選んで記録へ"}>
            <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">{exercise.muscle}</span><span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">{exercise.equipment}</span></div>
            <div><h2 className="text-lg font-bold text-gray-900">{exercise.name}</h2><p className="mt-1 text-sm leading-6 text-gray-500">{exercise.description}</p></div>
            <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-emerald-800"><span>この種目を記録する</span><span aria-hidden="true">→</span></div>
          </Link>)}
        </div> : <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center"><h2 className="font-bold text-gray-800">該当する種目がありません</h2><p className="mt-2 text-sm text-gray-500">キーワードや部位を変えて探してみてください。</p><button type="button" onClick={() => { setQuery(""); setMuscle("すべて"); }} className="mt-5 min-h-11 rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white">条件をリセット</button></div>}
      </Page>
    </>
  );
}
