import { useState } from "react";
import { createSearchParams, Link, useSearchParams } from "react-router";
import Page from "../components/Page.tsx";
import { equipmentOptions, exercises, muscles } from "../features/training/catalog.ts";
import { paths, workoutExercisePath } from "../routes.ts";

const recommendedIds = ["push-up", "squat", "plank", "dumbbell-row", "shoulder-press", "lat-pulldown"];
const suggestions = recommendedIds.map((id) => exercises.find((exercise) => exercise.id === id)!);

export default function Recommendations() {
  const [searchParams] = useSearchParams();
  const [newWorkoutId] = useState(() => crypto.randomUUID());
  const workoutId = searchParams.get("workoutId") || newWorkoutId;
  const [equipment, setEquipment] = useState<string>("すべて");
  const [muscle, setMuscle] = useState<string>("すべて");
  const filtered = suggestions.filter((exercise) =>
    (equipment === "すべて" || exercise.equipment === equipment) &&
    (muscle === "すべて" || exercise.muscle === muscle),
  );

  return (
    <>
      <Link to={paths.home} className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 hover:underline">← ホーム</Link>
      <Page title="初心者向けおすすめ" description="使える道具と、今日動かしたい部位から選ぼう。">
        <section className="relative overflow-hidden rounded-3xl bg-emerald-900 px-6 py-7 text-white">
          <span className="text-xs font-semibold tracking-widest text-emerald-200">YOUR FIRST STEP</span>
          <h2 className="mt-3 text-2xl font-bold leading-relaxed">まずは、ひとつの種目から。</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-emerald-100">気になる種目を選んで、自分のペースで。器具がなくても取り組める種目を用意しました。</p>
        </section>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">使える器具</span>
          <select value={equipment} onChange={(event) => setEquipment(event.target.value)} className="min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base focus:border-emerald-700">
            {equipmentOptions.map((item) => <option key={item} value={item}>{item === "自重" ? "自重（器具なし）" : item}</option>)}
          </select>
        </label>
        <div className="space-y-2"><p className="text-sm font-semibold">動かしたい部位</p><div className="flex flex-wrap gap-2" role="group" aria-label="動かしたい部位">{muscles.map((item) => <button key={item} type="button" aria-pressed={muscle === item} onClick={() => setMuscle(item)} className={["min-h-11 rounded-full border px-4 text-sm font-medium", muscle === item ? "border-emerald-800 bg-emerald-800 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-emerald-500"].join(" ")}>{item}</button>)}</div></div>
        <p role="status" className="text-sm text-gray-500">{filtered.length} 件のおすすめ</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((exercise) => <article key={exercise.id} className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between"><span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{exercise.muscle}</span><span className="text-xs text-gray-500">{exercise.equipment}</span></div>
            <div><h2 className="text-lg font-bold text-gray-900">{exercise.name}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{exercise.description}</p></div>
            <p className="rounded-xl bg-stone-50 p-3 text-xs leading-6 text-gray-600">{exercise.equipment === "自重" ? "器具を用意せず、自分のペースで始められます。" : "使える器具に合わせて選べる基本種目です。"}</p>
            <Link to={workoutExercisePath(workoutId, exercise.id)} aria-label={exercise.name + "で始める"} className="mt-auto flex min-h-11 items-center justify-between rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900"><span>この種目で始める</span><span aria-hidden="true">→</span></Link>
          </article>)}
        </div>
        {!filtered.length && <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center"><h2 className="font-bold">条件に合うおすすめがありません</h2><p className="mt-2 text-sm text-gray-500">器具や部位を変更するか、種目一覧から探してみてください。</p><button type="button" onClick={() => { setEquipment("すべて"); setMuscle("すべて"); }} className="mt-5 min-h-11 rounded-xl border border-emerald-800 px-5 text-sm font-semibold text-emerald-800">条件をリセット</button></div>}
        <Link to={{ pathname: paths.exercises, search: "?" + createSearchParams({ workoutId }) }} className="flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-emerald-800">種目一覧から探す →</Link>
      </Page>
    </>
  );
}
