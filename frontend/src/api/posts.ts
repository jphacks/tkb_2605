export type Post = {
  post_id: string;
  user_id: string;
  user_name: string;
  post_type: 1 | 2 | 3;
  content: string;
  posted_at: string;
  workout_id: string | null;
  like_count: number;
  is_liked: boolean;
};

export type CreatePostInput =
  | { post_type: 1; content: string }
  | { post_type: 2; content: string; workout_id: string }
  | { post_type: 3 };

function errorMessage(body: unknown, status: number): string {
  if (status === 401) return "投稿するにはログインが必要です。";
  if (status === 403) return "投稿する権限を確認できませんでした。ログインし直してお試しください。";
  if (status === 400 && body && typeof body === "object") {
    const errors = body as Record<string, unknown>;
    for (const key of ["content", "workout_id", "non_field_errors", "detail"]) {
      const value = errors[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string")) return value.join(" ");
    }
  }
  return "投稿できませんでした。時間をおいて、もう一度お試しください。";
}

export async function createPost(input: CreatePostInput, signal?: AbortSignal): Promise<Post> {
  const csrfCookie = document.cookie.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith("csrftoken="));
  const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.slice("csrftoken=".length)) : null;
  const response = await fetch("/api/posts/", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(input),
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(body, response.status));
  if (!body || typeof body !== "object" || !("post_id" in body) || typeof body.post_id !== "string") {
    throw new Error("投稿結果を確認できませんでした。再投稿する前にタイムラインをご確認ください。");
  }
  return body as Post;
}
