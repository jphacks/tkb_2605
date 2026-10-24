export type ProfileSample = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  color: string;
  following: boolean;
};

export type ProfilePostSample = {
  id: string;
  userId: string;
  text: string;
  date: string;
  image?: string;
};

export const profileSamples: ProfileSample[] = [
  { id: "me", name: "ユウ", handle: "you_workout", bio: "昨日の自分より、少しだけ強く。自分のペースで続けています。", color: "#d9e9d4", following: false },
  { id: "haru", name: "ハル", handle: "haru_lifts", bio: "筋トレとコーヒーが日課。小さな成長を記録しています。", color: "#f3dfcc", following: true },
  { id: "mio", name: "ミオ", handle: "mio_moves", bio: "ランニングとストレッチ。気持ちよく体を動かそう。", color: "#e7dff0", following: true },
  { id: "ren", name: "レン", handle: "ren_training", bio: "トレーニング初心者。続けることから始めています！", color: "#dce9ee", following: false },
];

export const profilePosts: ProfilePostSample[] = [
  { id: "me-training", userId: "me", date: "2026-10-24T07:30:00+09:00", text: "今日も自分のペースでトレーニング。\n少しずつ続けられているのがうれしい。\n\n#今日の積み上げ", image: "/images/profile-training.svg" },
  { id: "me-start", userId: "me", date: "2026-10-23T19:00:00+09:00", text: "仕事のあとにひと運動。\n昨日より一歩、前へ。" },
  { id: "haru-bench", userId: "haru", date: "2026-10-24T08:00:00+09:00", text: "朝トレ完了！ベンチプレス、先週より1回多くできた。\n小さな積み重ねが、いちばんうれしい。", image: "/images/profile-training.svg" },
  { id: "haru-rest", userId: "haru", date: "2026-10-23T17:15:00+09:00", text: "今日はゆっくりストレッチ。\nまた明日も自分のペースで。" },
  { id: "mio-run", userId: "mio", date: "2026-10-24T06:40:00+09:00", text: "朝のランニングからスタート。\n体を動かすと気分もすっきり！" },
  { id: "ren-start", userId: "ren", date: "2026-10-24T09:00:00+09:00", text: "今日からトレーニングを記録します。\nまずは無理せず、続けてみよう。" },
];
