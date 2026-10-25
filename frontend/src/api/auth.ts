import { apiFetch, setCsrfToken } from "./http.ts";

export type AuthUser = { user_id: string; email: string; user_name: string };
export type Credentials = { email: string; password: string };
export type Registration = Credentials & { user_name: string };
export class AuthApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "AuthApiError"; this.status = status; }
}
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function user(value: unknown): AuthUser {
  if (!object(value) || typeof value.user_id !== "string" || !/^\d+$/.test(value.user_id) ||
    typeof value.email !== "string" || !value.email || typeof value.user_name !== "string" || !value.user_name.trim()) {
    throw new Error("ユーザー情報の応答を確認できませんでした。再試行してください。");
  }
  return { user_id: value.user_id, email: value.email, user_name: value.user_name };
}
async function checked(response: Response, expected: number): Promise<Response> {
  if (response.status === expected) return response;
  const body: unknown = await response.json().catch(() => null);
  const messages: string[] = [];
  const labels: Record<string, string> = { email: "メールアドレス", password: "パスワード", user_name: "名前" };
  if (object(body)) for (const key of ["email", "password", "user_name", "non_field_errors", "detail"]) {
    const value = body[key];
    const text = typeof value === "string" ? value : Array.isArray(value) ? value.filter((item) => typeof item === "string").join(" ") : "";
    if (text) messages.push((labels[key] ? labels[key] + ": " : "") + text);
  }
  throw new AuthApiError(messages.join("\n") || (response.status === 403 ? "認証を確認できませんでした。もう一度お試しください。" : "認証サーバーに接続できませんでした。時間をおいて再試行してください。"), response.status);
}
export async function refreshCsrf(): Promise<void> {
  const response = await checked(await apiFetch("/api/auth/csrf/", {}, false), 200);
  const body: unknown = await response.json();
  if (!object(body) || typeof body.csrf_token !== "string" || !body.csrf_token) throw new Error("通信の確認に失敗しました。再試行してください。");
  setCsrfToken(body.csrf_token);
}
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await apiFetch("/api/users/me/", {}, false);
  if (response.status === 401 || response.status === 403) return null;
  return user(await (await checked(response, 200)).json());
}
export async function loginUser(input: Credentials): Promise<AuthUser> {
  await refreshCsrf();
  const response = await checked(await apiFetch("/api/auth/login/", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  }, false), 200);
  return user(await response.json());
}
export async function registerUser(input: Registration): Promise<AuthUser> {
  await refreshCsrf();
  const response = await checked(await apiFetch("/api/auth/register/", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  }, false), 201);
  return user(await response.json());
}
export async function logoutUser(): Promise<void> {
  await refreshCsrf();
  await checked(await apiFetch("/api/auth/logout/", { method: "POST" }, false), 204);
}
