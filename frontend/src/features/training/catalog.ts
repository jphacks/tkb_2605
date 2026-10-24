export type Exercise = {
  id: string;
  name: string;
  muscle: "胸" | "背中" | "脚" | "肩" | "体幹";
  equipment: "自重" | "ダンベル" | "バーベル" | "マシン";
  description: string;
  mode: "reps" | "seconds";
};

export const exercises: Exercise[] = [
  { id: "push-up", name: "プッシュアップ", muscle: "胸", equipment: "自重", description: "道具を使わない胸の基本種目", mode: "reps" },
  { id: "bench-press", name: "ベンチプレス", muscle: "胸", equipment: "バーベル", description: "バーベルを使った胸のトレーニング", mode: "reps" },
  { id: "dumbbell-row", name: "ダンベルロー", muscle: "背中", equipment: "ダンベル", description: "ダンベルを引く背中のトレーニング", mode: "reps" },
  { id: "lat-pulldown", name: "ラットプルダウン", muscle: "背中", equipment: "マシン", description: "マシンを使った背中の種目", mode: "reps" },
  { id: "squat", name: "スクワット", muscle: "脚", equipment: "自重", description: "下半身を動かす基本種目", mode: "reps" },
  { id: "lunge", name: "ランジ", muscle: "脚", equipment: "自重", description: "足を前後に開く下半身の種目", mode: "reps" },
  { id: "shoulder-press", name: "ショルダープレス", muscle: "肩", equipment: "ダンベル", description: "ダンベルを使った肩の種目", mode: "reps" },
  { id: "plank", name: "プランク", muscle: "体幹", equipment: "自重", description: "時間を記録する体幹トレーニング", mode: "seconds" },
];

export const muscles = ["すべて", "胸", "背中", "脚", "肩", "体幹"] as const;
export const equipmentOptions = ["すべて", "自重", "ダンベル", "バーベル", "マシン"] as const;
