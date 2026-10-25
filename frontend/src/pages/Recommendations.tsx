import { useState } from "react";
import { resolveRecommendation, type RecommendationKey } from "../features/exercises/serverCatalog.ts";
import { useExerciseCatalog } from "../features/exercises/useExerciseCatalog.ts";
import { useWorkoutSelection } from "../features/workouts/useWorkoutSelection.ts";
import "./Recommendations.css";

type Recommendation = { key: RecommendationKey; reason: string; comment: string };
type Menu = { part: string; exercises: Recommendation[] };

// Keys identify recommendation slots. Only the master file's explicit mapping supplies exercise IDs.
// Reasons and comments remain examples until the recommendation content is finalized.
const menus: Menu[] = [
  { part: "腕", exercises: [
    { key: "dumbbell-curl", reason: "腕の動きに集中しやすい種目です。", comment: "軽い重さで、ゆっくり曲げ伸ばし。" },
    { key: "hammer-curl", reason: "ダンベルだけで取り組めます。", comment: "手のひらを内側に向けて持ちます。" },
    { key: "kickback", reason: "腕の裏側を意識する練習に。", comment: "ひじの位置を保って伸ばします。" },
  ] },
  { part: "足", exercises: [
    { key: "squat", reason: "自分の体重で始められます。", comment: "無理のない深さでしゃがみます。" },
    { key: "lunge", reason: "片足ずつ動きを確かめられます。", comment: "小さな歩幅から試してみましょう。" },
    { key: "calf-raise", reason: "器具なしで取り組めます。", comment: "支えを使い、かかとを上げ下げ。" },
  ] },
  { part: "腹", exercises: [
    { key: "crunch", reason: "小さな動きで腹部を意識できます。", comment: "首を引かず、上体を少し起こします。" },
    { key: "leg-raise", reason: "寝た姿勢で取り組めます。", comment: "腰を反らさず、足をゆっくり上下。" },
    { key: "bicycle-crunch", reason: "左右交互に腹部を動かせます。", comment: "速さより、ゆっくりした動きを意識。" },
  ] },
  { part: "胸", exercises: [
    { key: "push-up", reason: "器具なしで胸を動かせます。", comment: "難しければ、ひざをついて試します。" },
    { key: "bench-press", reason: "重さを調整して取り組めます。", comment: "軽い重さで動きを確かめましょう。" },
    { key: "chest-press", reason: "マシンで押す動きを練習できます。", comment: "座面を合わせ、ゆっくり押します。" },
  ] },
  { part: "背中", exercises: [
    { key: "dumbbell-row", reason: "片側ずつ背中を意識できます。", comment: "体を支え、ひじを後ろへ引きます。" },
    { key: "lat-pulldown", reason: "引く動きを練習しやすい種目です。", comment: "反動をつけず、胸の前へ引きます。" },
    { key: "reverse-fly", reason: "背中の上部を意識する練習に。", comment: "軽い重さで腕をゆっくり開きます。" },
  ] },
];

export default function Recommendations() {
  const { catalog, error: catalogError } = useExerciseCatalog();
  const { select, busy, error } = useWorkoutSelection("recommendations");
  const [selectedMenu, setSelectedMenu] = useState("");
  const menu = menus.find((_, index) => String(index + 1) === selectedMenu);

  return (
    <section className="recommendations-screen" aria-labelledby="recommendations-title">
      <h1 id="recommendations-title" className="recommendations-title">おすすめメニュー</h1>
      <label htmlFor="recommendations-menu" className="recommendations-sr-only">おすすめメニューを選択</label>
      <select id="recommendations-menu" className="recommendations-select" value={selectedMenu} onChange={(event) => setSelectedMenu(event.target.value)}>
        <option value="" disabled>おすすめメニューを選択</option>
        {menus.map((item, index) => <option key={item.part} value={index + 1}>おすすめメニュー{index + 1} {item.part}メニュー</option>)}
      </select>
      <p className="recommendations-note">説明はサンプルです。画像は準備中です。</p>
      {catalogError && <p className="recommendations-error" role="alert">{catalogError}</p>}
      {error && <p className="recommendations-error" role="alert">{error}</p>}
      {busy && <p className="recommendations-note" role="status">トレーニングを確認しています…</p>}
      {menu && catalog && <ul className="recommendations-list" aria-label={`${menu.part}メニューの種目候補`}>
        {menu.exercises.map((recommendation) => {
          const exercise = resolveRecommendation(catalog, recommendation.key);
          if (!exercise) return <li key={recommendation.key} className="recommendations-unavailable">種目データの準備中です。</li>;
          return (
            <li key={recommendation.key}>
              <button className="recommendations-exercise" type="button" onClick={() => void select(exercise.exercise_id)} disabled={busy} aria-label={exercise.display_name + "を選んで記録へ"}>
                <span className="recommendations-image" aria-hidden="true">
                  <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="24" height="22" rx="3" /><circle cx="12" cy="12" r="2" /><path d="m5 23 7-7 5 5 4-4 7 7" /></svg>
                  <span>画像準備中</span>
                </span>
                <span className="recommendations-detail">
                  <span className="recommendations-exercise-heading"><strong>{exercise.display_name}</strong><span className="recommendations-part">{exercise.body_parts.map((part) => part.name).join("・")}</span></span>
                  <span className="recommendations-reason">{recommendation.reason}</span>
                  <span className="recommendations-comment">{recommendation.comment}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>}
    </section>
  );
}
