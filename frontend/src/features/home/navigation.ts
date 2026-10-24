import { createContext } from "react";

export const PendingNavigationContext = createContext<(message: string) => void>(() => {});

export function pendingDestination(path: string): string {
  if (path === "/training/recommended") return "おすすめトレーニング選択画面";
  if (path === "/training") return "種目選択画面";
  if (path === "/compose") return "投稿画面";
  if (path === "/notifications") return "通知画面";
  if (path === "/settings") return "設定画面";
  if (path.startsWith("/profile/")) return "プロフィール画面";
  return "投稿詳細・返信画面";
}
