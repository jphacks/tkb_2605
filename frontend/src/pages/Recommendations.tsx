import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { findSampleExercise } from "../features/exercises/catalog.ts";
import { workoutExercisePath } from "../routes.ts";
import "./Recommendations.css";

type Recommendation = { exercise_id: string; reason: string; comment: string };
type Menu = { part: string; exercises: Recommendation[] };

// The menu contents are samples until the recommended exercises are decided.
const menus: Menu[] = [
  { part: "腕", exercises: [
    { exercise_id: "dumbbell-curl", reason: "腕の動きに集中しやすい種目です。", comment: "軽い重さで、ゆっくり曲げ伸ばし。" },
    { exercise_id: "hammer-curl", reason: "ダンベルだけで取り組めます。", comment: "手のひらを内側に向けて持ちます。" },
    { exercise_id: "kickback", reason: "腕の裏側を意識する練習に。", comment: "ひじの位置を保って伸ばします。" },
  ] },
  { part: "足", exercises: [
    { exercise_id: "squat", reason: "自分の体重で始められます。", comment: "無理のない深さでしゃがみます。" },
    { exercise_id: "lunge", reason: "片足ずつ動きを確かめられます。", comment: "小さな歩幅から試してみましょう。" },
    { exercise_id: "calf-raise", reason: "器具なしで取り組めます。", comment: "支えを使い、かかとを上げ下げ。" },
  ] },
  { part: "腹", exercises: [
    { exercise_id: "crunch", reason: "小さな動きで腹部を意識できます。", comment: "首を引かず、上体を少し起こします。" },
    { exercise_id: "leg-raise", reason: "寝た姿勢で取り組めます。", comment: "腰を反らさず、足をゆっくり上下。" },
    { exercise_id: "bicycle-crunch", reason: "左右交互に腹部を動かせます。", comment: "速さより、ゆっくりした動きを意識。" },
  ] },
  { part: "胸", exercises: [
    { exercise_id: "push-up", reason: "器具なしで胸を動かせます。", comment: "難しければ、ひざをついて試します。" },
    { exercise_id: "bench-press", reason: "重さを調整して取り組めます。", comment: "軽い重さで動きを確かめましょう。" },
    { exercise_id: "chest-press", reason: "マシンで押す動きを練習できます。", comment: "座面を合わせ、ゆっくり押します。" },
  ] },
  { part: "背中", exercises: [
    { exercise_id: "dumbbell-row", reason: "片側ずつ背中を意識できます。", comment: "体を支え、ひじを後ろへ引きます。" },
    { exercise_id: "lat-pulldown", reason: "引く動きを練習しやすい種目です。", comment: "反動をつけず、胸の前へ引きます。" },
    { exercise_id: "reverse-fly", reason: "背中の上部を意識する練習に。", comment: "軽い重さで腕をゆっくり開きます。" },
  ] },
];

export default function Recommendations() {
  const [searchParams] = useSearchParams();
  // This UUID identifies a local draft until a workout creation API is defined.
  const [newWorkoutId] = useState(() => crypto.randomUUID());
  const [selectedMenu, setSelectedMenu] = useState("");
  const workoutId = searchParams.get("workoutId") || newWorkoutId;
  const menu = menus.find((_, index) => String(index + 1) === selectedMenu);

  return (
    <section className="recommendations-screen" aria-labelledby="recommendations-title">
      <h1 id="recommendations-title" className="recommendations-sr-only">おすすめメニュー</h1>
      <label htmlFor="recommendations-menu" className="recommendations-sr-only">おすすめメニューを選択</label>
      <select id="recommendations-menu" className="recommendations-select" value={selectedMenu} onChange={(event) => setSelectedMenu(event.target.value)}>
        <option value="" disabled>おすすめメニューを選択</option>
        {menus.map((item, index) => <option key={item.part} value={index + 1}>おすすめメニュー{index + 1} {item.part}メニュー</option>)}
      </select>
      <p className="recommendations-note">種目・説明はサンプルです。画像は準備中です。</p>
      {menu && <ul className="recommendations-list" aria-label={`${menu.part}メニューの種目候補`}>
        {menu.exercises.map((recommendation) => {
          const exercise = findSampleExercise(recommendation.exercise_id);
          if (!exercise) return null;
          return (
            <li key={exercise.exercise_id}>
              <Link className="recommendations-exercise" to={{ pathname: workoutExercisePath(workoutId, exercise.exercise_id), search: "?from=recommendations" }} state={{ exerciseName: exercise.display_name, returnTo: "recommendations" }}>
                <span className="recommendations-image" aria-hidden="true">
                  <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="5" width="24" height="22" rx="3" /><circle cx="12" cy="12" r="2" /><path d="m5 23 7-7 5 5 4-4 7 7" /></svg>
                  <span>画像準備中</span>
                </span>
                <div className="recommendations-detail">
                  <div className="recommendations-exercise-heading"><h2>{exercise.display_name}</h2><span className="recommendations-part">{exercise.body_parts.map((part) => part.name).join("・")}</span></div>
                  <p className="recommendations-reason">{recommendation.reason}</p>
                  <p className="recommendations-comment">{recommendation.comment}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>}
    </section>
  );
}
