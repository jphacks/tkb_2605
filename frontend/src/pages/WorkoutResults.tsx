import { useRef, useState, type FormEvent } from "react";
import { createSearchParams, Link, useParams } from "react-router";
import Page from "../components/Page.tsx";
import { createPost } from "../api/posts.ts";
import { readWorkout, summarizeWorkout, type WorkoutRecord } from "../features/workouts/storage.ts";
import { paths, workoutExercisePath } from "../routes.ts";

function summaryText(workout: WorkoutRecord) {
  const lines = workout.exercises.flatMap((exercise) => {
    const done = exercise.sets.filter((set) => set.completed);
    return done.length ? [exercise.name + "：" + done.length + "セット / " + done.reduce((total, set) => total + set.value, 0) + (exercise.mode === "seconds" ? "秒" : "回")] : [];
  });
  return ["今日のトレーニング完了！", ...lines, "#WORKOUT"].join("\n");
}

export default function WorkoutResults() {
  const { workoutId } = useParams<"workoutId">();
  return <Results key={workoutId} workoutId={workoutId ?? ""} />;
}

function Results({ workoutId }: { workoutId: string }) {
  const [loaded] = useState(() => readWorkout(workoutId));
  const workout = loaded.workout;
  const totals = workout ? summarizeWorkout(workout) : null;
  const [shareText, setShareText] = useState(() => workout ? summaryText(workout) : "");
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const posting = useRef(false);

  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (posting.current || shared || !shareText.trim() || !totals?.sets) return;
    posting.current = true; setSharing(true); setError("");
    try {
      // Local workouts have no server-issued workout_id yet: share their summary as type 1.
      await createPost({ post_type: 1, content: shareText.trim() });
      setShared(true); setFeedback("タイムラインに共有しました。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "共有できませんでした。"); }
    finally { posting.current = false; setSharing(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(shareText); setFeedback("記録のテキストをコピーしました。"); setError(""); }
    catch { setError("コピーできませんでした。下のテキストを選択してコピーしてください。"); }
  }

  if (loaded.error) return <Page title="記録を読み込めません" description={loaded.error}><Link to={paths.home} className="text-emerald-800 underline">ホームへ戻る</Link></Page>;
  if (!workout || !workout.exercises.length || !totals) return <Page title="記録はまだありません" description="種目を選んでセットを記録すると、ここに結果が表示されます。"><Link to={{ pathname: paths.exercises, search: workoutId ? "?" + createSearchParams({ workoutId }) : "" }} className="inline-flex min-h-12 items-center rounded-xl bg-emerald-800 px-5 font-semibold text-white">トレーニングを記録する →</Link></Page>;

  return (
    <Page title={totals.sets ? "おつかれさまでした！" : "記録を確認しよう"} description="今日の積み重ねを、次の一歩につなげよう。">
      <section className="rounded-3xl bg-emerald-900 p-6 text-white">
        <p className="text-xs font-bold tracking-widest text-emerald-200">YOUR WORKOUT SUMMARY</p>
        <p className="mt-3 text-3xl font-bold">{totals.sets}<span className="ml-2 text-base font-normal">セット完了</span></p>
        <p className="mt-2 text-sm leading-6 text-emerald-100">完了にチェックしたセットの合計です。</p>
      </section>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["種目", totals.exercises, "種目"], ["合計回数", totals.reps, "回"], ["時間種目", totals.seconds, "秒"], ["総負荷", new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(totals.volume), "kg"]].map(([label, value, unit]) => <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-2 break-words text-2xl font-bold text-emerald-900">{value}<span className="ml-1 text-xs font-normal text-gray-500">{unit}</span></dd></div>)}
      </dl>
      <p className="text-xs leading-6 text-gray-500">総負荷は、完了した回数種目の「重量×回数」の合計です。秒数は回数や総負荷に含めません。記録はこの端末に保存されています。</p>
      {totals.pendingSets > 0 && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">未完了のセットが{totals.pendingSets}件あります。結果の合計には含めていません。</p>}
      <section className="space-y-3" aria-labelledby="results-exercises"><h2 id="results-exercises" className="text-lg font-bold">今回のメニュー</h2>
        {workout.exercises.map((exercise) => <article key={exercise.exerciseId} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3"><h3 className="min-w-0 break-words font-bold">{exercise.name}</h3><Link to={workoutExercisePath(workoutId, exercise.exerciseId)} className="shrink-0 rounded-lg px-2 py-3 text-xs font-semibold text-emerald-800 underline" aria-label={exercise.name + "の記録を編集"}>編集</Link></div>
          <ul className="divide-y divide-gray-100">{exercise.sets.map((set, index) => <li key={set.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="text-gray-500">セット {index + 1}</span><span>{set.weight} kg × {set.value} {exercise.mode === "seconds" ? "秒" : "回"}</span><span className={set.completed ? "text-xs font-semibold text-emerald-700" : "text-xs text-gray-500"}>{set.completed ? "完了" : "未完了"}</span></li>)}</ul>
        </article>)}
      </section>
      {totals.sets > 0 && <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5" aria-labelledby="share-heading">
        <h2 id="share-heading" className="text-lg font-bold">頑張りをシェア</h2><p className="mt-2 text-sm leading-6 text-gray-600">端末内の記録を、テキストの投稿としてタイムラインに共有できます。</p>
        <form onSubmit={(event) => { void share(event); }} className="mt-4 space-y-4">
          <label className="block space-y-2 text-sm font-semibold">共有する内容<textarea rows={6} value={shareText} required disabled={sharing || shared} onChange={(event) => setShareText(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base font-normal leading-7 disabled:opacity-70" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {feedback && <p role="status" className="text-sm text-emerald-800">{feedback}</p>}
          <div className="flex flex-wrap gap-3"><button type="submit" disabled={sharing || shared || !shareText.trim()} className="min-h-12 rounded-xl bg-emerald-800 px-5 text-sm font-semibold text-white disabled:opacity-50">{shared ? "共有済み" : sharing ? "共有中…" : "テキストで共有"}</button><button type="button" onClick={() => { void copy(); }} className="min-h-12 rounded-xl border border-emerald-800 bg-white px-5 text-sm font-semibold text-emerald-800">テキストをコピー</button></div>
        </form>
      </section>}
      <Link to={paths.home} className="flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-emerald-800">ホームに戻る</Link>
    </Page>
  );
}
