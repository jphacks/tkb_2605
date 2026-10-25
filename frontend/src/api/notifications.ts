import { apiFetch } from "./http.ts";
// Contract: https://github.com/jphacks/tkb_2605/issues/42
export type WorkoutNotification = {
  notification_id: number;
  notifier_id: number;
  notifier_name: string;
  notified_at: string;
  notification_type?: "workout_started" | "post_liked";
  post_id?: string;
  post_excerpt?: string;
};

function validNotification(value: unknown): value is WorkoutNotification {
  if (value === null || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.notification_id) && Number(item.notification_id) > 0
    && Number.isSafeInteger(item.notifier_id) && Number(item.notifier_id) > 0
    && typeof item.notifier_name === "string" && !!item.notifier_name.trim()
    && typeof item.notified_at === "string"
    && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(item.notified_at)
    && Number.isFinite(Date.parse(item.notified_at))
    && (item.notification_type === undefined || item.notification_type === "workout_started" || item.notification_type === "post_liked")
    && (item.notification_type !== "post_liked" || (typeof item.post_id === "string" && !!item.post_id.trim()))
    && (item.post_excerpt === undefined || typeof item.post_excerpt === "string");
}

async function request(method: "GET" | "POST", signal?: AbortSignal, limit = 20): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  if (method === "POST" && typeof document !== "undefined") {
    const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("csrftoken="));
    if (cookie) {
      try { headers.set("X-CSRFToken", decodeURIComponent(cookie.slice("csrftoken=".length))); } catch { /* The server validates the session. */ }
    }
  }
  const timeout = AbortSignal.timeout(10_000);
  let response: Response;
  try {
    response = await apiFetch(method === "GET" ? `/api/notify/?limit=${limit}` : "/api/notify/", {
      method, headers, credentials: "same-origin", cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(method === "POST"
      ? "送信結果を確認できません。届いている可能性があるため、確認してから再送信してください。"
      : "通知を取得できませんでした。接続を確認して再試行してください。", { cause: error });
  }
  if (response.status === 200) return response;
  if (response.status === 401 || response.status === 403) throw new Error("通知を利用するにはログイン状態の確認が必要です。");
  if (response.status === 404 || response.status === 501) throw new Error("通知機能にまだ接続できません。時間をおいて再試行してください。");
  if (method === "POST" && response.status >= 500) throw new Error("送信結果を確認できません。届いている可能性があるため、確認してから再送信してください。");
  throw new Error(`通知APIでエラーが発生しました（${response.status}）。時間をおいて再試行してください。`);
}

export async function fetchNotifications({ limit = 20, signal }: { limit?: number; signal?: AbortSignal } = {}): Promise<WorkoutNotification[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("通知の取得件数が不正です。");
  const response = await request("GET", signal, limit);
  const value: unknown = await response.json().catch(() => null);
  if (!Array.isArray(value) || !value.every(validNotification)) throw new Error("通知一覧の応答形式を確認できませんでした。");
  const unique = new Map<number, WorkoutNotification>();
  for (const item of value) if (!unique.has(item.notification_id)) unique.set(item.notification_id, item);
  return [...unique.values()].sort((a, b) => Date.parse(b.notified_at) - Date.parse(a.notified_at) || b.notification_id - a.notification_id);
}

export async function sendWorkoutNotification(signal?: AbortSignal): Promise<void> {
  // Issue #42 defines HTTP 200, but no POST response body. Never require JSON here.
  await request("POST", signal);
}
