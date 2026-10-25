import { apiFetch, authenticatedUserId } from "./http.ts";
export const avatarColors = ["#f0d9d1", "#f3dfcc", "#e7dff0", "#dce9ee"] as const;
export type Profile = { user_id: string; user_name: string; bio: string; avatar_color: string; is_masmate: boolean };
export type ProfileInput = Pick<Profile, "user_name" | "bio" | "avatar_color">;
export type PeoplePage = { results: Profile[]; next_offset: number | null };
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function valid(value: unknown): value is Profile {
  return object(value) && typeof value.user_id === "string" && /^[1-9]\d*$/.test(value.user_id)
    && typeof value.user_name === "string" && !!value.user_name.trim() && typeof value.bio === "string"
    && typeof value.avatar_color === "string" && (avatarColors as readonly string[]).includes(value.avatar_color)
    && typeof value.is_masmate === "boolean";
}
async function request(url: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try { response = await apiFetch(url, init); }
  catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(init.method ? "保存結果を確認できませんでした。再読み込みして確認してください。" : "読み込めませんでした。接続を確認して再試行してください。", { cause: error });
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    if (response.status === 400 && object(body)) {
      const text = Object.values(body).flat().filter((value) => typeof value === "string").join(" ");
      if (text) throw new Error(text);
    }
    throw new Error(response.status === 404 ? "ユーザーが見つからないか、この機能はまだ利用できません。" : response.status === 401 || response.status === 403 ? "ログイン状態と通信を確認し、もう一度お試しください。" : "ユーザー情報を確認できませんでした。再試行してください。");
  }
  if (response.status !== 200) throw new Error("ユーザーAPIの応答を確認できませんでした。");
  return response.json();
}
function checked(value: unknown, id?: string): Profile {
  if (!valid(value) || (id && value.user_id !== id)) throw new Error("対象ユーザーの情報を確認できませんでした。");
  return value;
}
function target(id: string) { if (!/^[1-9]\d*$/.test(id)) throw new Error("ユーザーIDを確認してください。"); return id; }
export async function getProfile(id: string, signal?: AbortSignal): Promise<Profile> {
  return checked(await request("/api/users/" + target(id) + "/profile/", { signal }), id);
}
export async function getOwnProfile(signal?: AbortSignal): Promise<Profile> {
  const id = authenticatedUserId();
  return checked(await request("/api/users/me/profile/", { signal }), id ?? undefined);
}
export async function updateProfile(input: ProfileInput): Promise<Profile> {
  const id = authenticatedUserId();
  const values = { user_name: input.user_name.trim(), bio: input.bio.trim(), avatar_color: input.avatar_color };
  if (!values.user_name || [...values.user_name].length > 50 || [...values.bio].length > 160 || !(avatarColors as readonly string[]).includes(values.avatar_color)) throw new Error("名前は1〜50文字、自己紹介は160文字以内で入力し、アイコンの色を選択してください。");
  return checked(await request("/api/users/me/profile/", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }), id ?? undefined);
}
export async function becomeMasmates(id: string): Promise<Profile> {
  const profile = checked(await request("/api/users/" + target(id) + "/masmate/", { method: "PUT" }), id);
  if (!profile.is_masmate) throw new Error("マスメイトの保存結果を確認できませんでした。");
  return profile;
}
export async function findPeople({ query = "", masmates = false, offset = 0, signal }: { query?: string; masmates?: boolean; offset?: number; signal?: AbortSignal } = {}): Promise<PeoplePage> {
  if ([...query.trim()].length > 50 || !Number.isSafeInteger(offset) || offset < 0) throw new Error("検索条件を確認してください。");
  const params = new URLSearchParams({ q: query.trim(), masmates: String(masmates), limit: "20", offset: String(offset) });
  const value = await request("/api/users/?" + params, { signal });
  if (!object(value) || !Array.isArray(value.results) || !value.results.every(valid) ||
    (value.next_offset !== null && (typeof value.next_offset !== "number" || !Number.isSafeInteger(value.next_offset) || value.next_offset <= offset))) throw new Error("検索結果を確認できませんでした。");
  if (masmates && value.results.some((item) => !item.is_masmate)) throw new Error("マスメイト一覧を確認できませんでした。");
  return value as PeoplePage;
}
