import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Icon } from "../components/Icon.tsx";
import { PageHeader } from "../components/PageHeader.tsx";

const exercises = [
  { id: "pushup", name: "プッシュアップ", category: "胸", description: "自重で取り組む、胸の基本種目", equipment: "自重" },
  { id: "bench", name: "ベンチプレス", category: "胸", description: "バーベルを使った胸のトレーニング", equipment: "バーベル" },
  { id: "row", name: "ダンベルロー", category: "背中", description: "ダンベルを引いて背中を動かす", equipment: "ダンベル" },
  { id: "pulldown", name: "ラットプルダウン", category: "背中", description: "マシンを使った背中のトレーニング", equipment: "マシン" },
  { id: "squat", name: "スクワット", category: "脚", description: "下半身を大きく動かす基本種目", equipment: "自重" },
  { id: "lunge", name: "ランジ", category: "脚", description: "前後に足を開いて下半身を動かす", equipment: "自重" },
  { id: "plank", name: "プランク", category: "体幹", description: "姿勢をキープする体幹トレーニング", equipment: "自重" },
];
const categories = ["すべて", "胸", "背中", "脚", "体幹"];
const plans = [
  { id: "home", name: "おうちで、はじめの一歩", description: "道具を使わず、全身をバランスよく。", tag: "自重トレーニング", exerciseIds: ["pushup", "squat", "plank"] },
  { id: "upper", name: "上半身をじっくり", description: "胸と背中を中心に取り組むメニュー。", tag: "ジムトレーニング", exerciseIds: ["bench", "row", "pulldown"] },
  { id: "lower", name: "足元から、強くなる", description: "下半身と体幹に集中したい日に。", tag: "自重トレーニング", exerciseIds: ["squat", "lunge", "plank"] },
];

export default function Training() {
  const recommended = useLocation().pathname === "/training/recommended";
  return <TrainingContent key={recommended ? "recommended" : "custom"} recommended={recommended} />;
}

function TrainingContent({ recommended }: { recommended: boolean }) {
  const [category, setCategory] = useState("すべて");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [started, setStarted] = useState<string[]>([]);
  const selectedIds = recommended ? plans.find((plan) => plan.id === selectedPlan)?.exerciseIds ?? [] : selected;

  function toggleExercise(id: string) {
    setSelected((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  }

  return (
    <>
      <PageHeader title={recommended ? "おすすめトレーニング" : "種目を選ぶ"} subtitle={recommended ? "今日の気分に合うメニューを見つけよう。" : "今日取り組みたい種目を選んでください。"} />
      <div className="page-content training-page">
        {started.length ? (
          <section className="training-session" aria-labelledby="session-title">
            <span className="session-icon"><Icon name="check" size={32} /></span>
            <p className="eyebrow">LET’S GET STARTED</p>
            <h2 id="session-title">今日のメニューが決まりました</h2>
            <p className="muted">自分のペースで、ひとつずつ取り組もう。</p>
            <ol className="session-exercises">{started.map((id) => <li key={id}>{exercises.find((exercise) => exercise.id === id)?.name}</li>)}</ol>
            <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setStarted([])}>メニューを選び直す</button><Link className="primary-button" to="/compose">トレーニングをシェア<Icon name="arrow-right" size={16} /></Link></div>
          </section>
        ) : (
          <>
            {recommended ? (
              <div className="training-grid plan-grid" role="radiogroup" aria-label="トレーニングメニュー">
                {plans.map((plan, index) => <label key={plan.id} className={`training-card plan-card${selectedPlan === plan.id ? " selected" : ""}`}><input type="radio" name="training-plan" value={plan.id} checked={selectedPlan === plan.id} onChange={() => setSelectedPlan(plan.id)} /><span className="plan-number">0{index + 1}</span><span className="chip">{plan.tag}</span><strong>{plan.name}</strong><span className="muted">{plan.description}</span><span className="plan-exercises">{plan.exerciseIds.map((id) => exercises.find((exercise) => exercise.id === id)?.name).join(" · ")}</span><span className="training-card-footer">{plan.exerciseIds.length} 種目<Icon name={selectedPlan === plan.id ? "check" : "plus"} size={18} /></span></label>)}
              </div>
            ) : (
              <>
                <div className="segmented-control exercise-filters" aria-label="鍛える部位">{categories.map((item) => <button type="button" className={`chip${category === item ? " active" : ""}`} aria-pressed={category === item} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
                <div className="training-grid">{exercises.filter((exercise) => category === "すべて" || exercise.category === category).map((exercise) => <label key={exercise.id} className={`training-card${selected.includes(exercise.id) ? " selected" : ""}`}><input type="checkbox" checked={selected.includes(exercise.id)} onChange={() => toggleExercise(exercise.id)} /><span className="exercise-icon"><Icon name="dumbbell" size={26} /></span><span className="chip">{exercise.category}</span><strong>{exercise.name}</strong><span className="muted">{exercise.description}</span><span className="training-card-footer">{exercise.equipment}<Icon name={selected.includes(exercise.id) ? "check" : "plus"} size={18} /></span></label>)}</div>
              </>
            )}
            <div className="training-selection"><span><strong>{selectedIds.length}</strong> 種目を選択中</span><button type="button" className="primary-button" disabled={!selectedIds.length} onClick={() => setStarted(selectedIds)}>このメニューで始める<Icon name="arrow-right" size={18} /></button></div>
          </>
        )}
      </div>
    </>
  );
}
