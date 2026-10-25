import { apiFetch, authenticatedUserId } from "./http.ts";
// Contract: https://github.com/jphacks/tkb_2605/issues/10
export type ApiPost = {
  post_id: string; user_id: string; user_name: string; post_type: 1 | 2 | 3;
  content: string; posted_at: string; workout_id: string | null; like_count: number; is_liked: boolean;
};
export type PostsPage = { results: ApiPost[]; next_offset: number | null };
export type LikeResult = Pick<ApiPost, "post_id" | "like_count" | "is_liked">;
export type CreatePost = { post_type: 1; content: string } | { post_type: 2; content: string; workout_id: string } | { post_type: 3 };

function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown): value is string { return typeof value === "string"; }
function nonNegativeInt(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function validLike(value: unknown): value is LikeResult {
  return object(value) && text(value.post_id) && !!value.post_id && nonNegativeInt(value.like_count) && typeof value.is_liked === "boolean";
}
function validPost(value: unknown): value is ApiPost {
  return object(value) && text(value.user_id) && !!value.user_id && text(value.user_name) &&
    [1, 2, 3].includes(Number(value.post_type)) && typeof value.post_type === "number" && text(value.content) &&
    text(value.posted_at) && Number.isFinite(Date.parse(value.posted_at)) &&
    (value.workout_id === null || text(value.workout_id)) && validLike(value);
}

function headers(write: boolean, json = false): Headers {
  const result = new Headers({ Accept: "application/json" });
  if (json) result.set("Content-Type", "application/json");
  if (write && typeof document !== "undefined") {
    const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrftoken="));
    if (cookie) {
      try { result.set("X-CSRFToken", decodeURIComponent(cookie.slice("csrftoken=".length))); } catch { /* Let the server report an invalid session. */ }
    }
  }
  return result;
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try { response = await apiFetch(url, { ...init, credentials: "same-origin" }); }
  catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(init.method === "POST" ? "送信結果を確認できません。タイムラインを確認してから再試行してください。" : "通信できませんでした。接続を確認して再試行してください。", { cause: error });
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("投稿機能を利用するにはログイン状態の確認が必要です。");
    if (response.status === 404 || response.status === 501) throw new Error("投稿機能にまだ接続できません。時間をおいて再試行してください。");
    if (response.status === 400) {
      const body: unknown = await response.json().catch(() => null);
      if (object(body)) {
        for (const key of ["content", "workout_id", "non_field_errors", "detail"]) {
          const value = body[key];
          if (text(value)) throw new Error(value);
          if (Array.isArray(value) && value.length > 0 && value.every(text)) throw new Error(value.join(" "));
        }
      }
    }
    throw new Error("投稿APIでエラーが発生しました（" + response.status + "）。内容を確認して再試行してください。");
  }
  try { return await response.json(); } catch { throw new Error("投稿APIの応答形式を確認できませんでした。"); }
}

export async function fetchPosts({ limit = 20, offset = 0, signal, userId }: { limit?: number; offset?: number; signal?: AbortSignal; userId?: string } = {}): Promise<PostsPage> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !nonNegativeInt(offset)) throw new Error("投稿の取得範囲が不正です。");
  if (userId !== undefined && !userId.trim()) throw new Error("ユーザーを選択してください。");
  const endpoint = userId === undefined ? "/api/posts/" : "/api/users/" + encodeURIComponent(userId) + "/posts/";
  const value = await request(endpoint + "?" + new URLSearchParams({ limit: String(limit), offset: String(offset) }), { method: "GET", headers: headers(false), signal });
  if (!object(value) || !Array.isArray(value.results) || !value.results.every(validPost) ||
    !(value.next_offset === null || (nonNegativeInt(value.next_offset) && value.next_offset > offset))) {
    throw new Error("投稿一覧の応答形式を確認できませんでした。");
  }
  if (userId !== undefined && value.results.some((post) => post.user_id !== userId)) throw new Error("対象ユーザーの投稿を確認できませんでした。");
  return value as PostsPage;
}

export async function togglePostLike(postId: string): Promise<LikeResult> {
  if (!postId) throw new Error("投稿を選択してください。");
  const value = await request("/api/posts/" + encodeURIComponent(postId) + "/like/", { method: "PUT", headers: headers(true) });
  if (!validLike(value) || value.post_id !== postId) throw new Error("いいねの応答形式を確認できませんでした。");
  return value;
}

export async function createPost(input: CreatePost, signal?: AbortSignal): Promise<ApiPost> {
  if (input.post_type !== 3 && !input.content.trim()) throw new Error("投稿内容を入力してください。");
  if (input.post_type === 2 && !input.workout_id.trim()) throw new Error("ワークアウトを選択してください。");
  const value = await request("/api/posts/", { method: "POST", headers: headers(true, true), body: JSON.stringify(input), signal });
  if (!validPost(value) || (authenticatedUserId() !== null && value.user_id !== authenticatedUserId()) || value.post_type !== input.post_type) throw new Error("作成した投稿の応答形式を確認できませんでした。");
  return value;
}
