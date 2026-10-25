import { currentUser } from "../social/seed.ts";

export type PreviewProfile = typeof currentUser & { color: string };
let profile: PreviewProfile = { ...currentUser, color: "var(--brand-subtle)" };
const listeners = new Set<() => void>();
export const getPreviewProfile = () => profile;
export function subscribePreviewProfile(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const profileColors = ["var(--brand-subtle)", "#f3dfcc", "#e7dff0", "#dce9ee"] as const;
export function savePreviewProfile(value: { name: string; bio: string; color: string }) {
  const name = value.name.trim(), bio = value.bio.trim();
  if (!name || [...name].length > 40) throw new Error("名前は1〜40文字で入力してください。");
  if ([...bio].length > 160) throw new Error("自己紹介は160文字以内で入力してください。");
  if (!(profileColors as readonly string[]).includes(value.color)) throw new Error("アイコンの色を選択してください。");
  profile = { ...currentUser, name, bio, color: value.color };
  listeners.forEach((listener) => listener());
}
export function profileNameFromState(userId: string, state: unknown): string | null {
  if (!state || typeof state !== "object" || !("profile" in state)) return null;
  const person = state.profile;
  if (!person || typeof person !== "object" || !("id" in person) || !("name" in person)) return null;
  return person.id === userId && typeof person.name === "string" && person.name.trim() ? person.name : null;
}
