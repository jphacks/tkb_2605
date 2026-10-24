import type { SocialData } from "./types.ts";

export const CURRENT_USER_ID = "me";

export function createSeedData(): SocialData {
  return {
    version: 1,
    users: [
      {
        id: CURRENT_USER_ID,
        name: "ユウ",
        handle: "you_workout",
        bio: "昨日の自分より、少しだけ強く。\n週3回のトレーニングを楽しんでいます。",
        avatar: "mint",
        followingIds: ["haru", "mio"],
        followerIds: ["haru", "mio", "ren"],
      },
      {
        id: "haru",
        name: "ハル",
        handle: "haru_lifts",
        bio: "筋トレとコーヒーが日課。小さな成長を記録しています。",
        avatar: "peach",
        followingIds: [CURRENT_USER_ID, "mio"],
        followerIds: [CURRENT_USER_ID, "mio"],
      },
      {
        id: "mio",
        name: "ミオ",
        handle: "mio_moves",
        bio: "自分のペースで、気持ちよく。ランニングとストレッチが好きです。",
        avatar: "lavender",
        followingIds: [CURRENT_USER_ID, "haru"],
        followerIds: [CURRENT_USER_ID, "haru"],
      },
      {
        id: "ren",
        name: "レン",
        handle: "ren_training",
        bio: "トレーニング初心者。続けることから始めています！",
        avatar: "blue",
        followingIds: [CURRENT_USER_ID],
        followerIds: [],
      },
    ],
    posts: [
      {
        id: "haru-bench",
        authorId: "haru",
        text: "朝トレ完了！ベンチプレス、先週より1回多くできた。\n小さな積み重ねが、いちばんうれしい。\n\n#胸トレ #今日の積み上げ",
        image: "/images/training-room.svg",
        createdAt: "2026-10-24T00:20:00.000Z",
        likedBy: ["mio", "ren"],
      },
      {
        id: "mio-run",
        authorId: "mio",
        text: "少し早起きして、いつものコースを5km。\n涼しい風が気持ちよかった！みんなもよい一日を ☀️",
        image: "/images/running-track.svg",
        createdAt: "2026-10-24T00:00:00.000Z",
        likedBy: [CURRENT_USER_ID, "haru"],
      },
      {
        id: "ren-first",
        authorId: "ren",
        text: "今日はスクワットを3セット。まずは続けることを目標に！\n一緒に頑張れる仲間がいると、やる気が出ますね。",
        createdAt: "2026-10-23T23:30:00.000Z",
        likedBy: ["haru"],
      },
      {
        id: "my-start",
        authorId: CURRENT_USER_ID,
        text: "今週もトレーニングを続けられた！\n週末はしっかり休んで、また少しずつ。",
        createdAt: "2026-10-23T10:00:00.000Z",
        likedBy: ["haru", "mio"],
      },
      {
        id: "haru-reply",
        authorId: "haru",
        text: "おつかれさま！休むのも大事ですね。来週も一緒に頑張ろう！",
        createdAt: "2026-10-23T10:20:00.000Z",
        likedBy: [CURRENT_USER_ID],
        parentId: "my-start",
      },
    ],
    notifications: [
      { id: "notice-follow", actorId: "ren", type: "follow", createdAt: "2026-10-24T00:10:00.000Z", read: false },
      { id: "notice-like", actorId: "mio", type: "like", postId: "my-start", createdAt: "2026-10-23T11:00:00.000Z", read: false },
      { id: "notice-reply", actorId: "haru", type: "reply", postId: "my-start", createdAt: "2026-10-23T10:20:00.000Z", read: true },
    ],
  };
}
