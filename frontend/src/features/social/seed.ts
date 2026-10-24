import type { User } from "./types.ts";

// Profile placeholder until authentication and user-information APIs are defined.
// This is display-only data, not an authenticated session or a server user ID.
export const currentUser: User = {
  id: "me",
  name: "ユウ",
  bio: "昨日の自分より、少しだけ強く。\n週3回のトレーニングを楽しんでいます。",
  avatar: "mint",
};
