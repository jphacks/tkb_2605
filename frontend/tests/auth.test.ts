import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { fetchCurrentUser, registerUser, type AuthUser } from "../src/api/auth.ts";
import { apiFetch } from "../src/api/http.ts";
import { getAuthState, refreshSession, safeReturnPath, signIn, signOut } from "../src/features/auth/session.ts";
import { getPreviewProfile, savePreviewProfile } from "../src/features/profile/preview.ts";
import { arePreviewMasmates, becomePreviewMasmates } from "../src/features/profile/masmates.ts";
import { createPost } from "../src/api/posts.ts";
import { createWorkout } from "../src/api/workouts.ts";

const originalFetch = globalThis.fetch;
const first: AuthUser = { user_id: "11", user_name: "最初の利用者", email: "first@example.test" };
const second: AuthUser = { user_id: "22", user_name: "次の利用者", email: "second@example.test" };
let serverUser: AuthUser | null;
let token: string;
let calls: { url: string; init: RequestInit }[];
let handle: (url: string, init: RequestInit) => Response | Promise<Response>;
const json = (body: unknown, status = 200) => Response.json(body, { status });
function server(url: string, init: RequestInit): Response {
  if (url === "/api/auth/csrf/") return json({ csrf_token: token });
  if (url === "/api/users/me/") return serverUser ? json(serverUser) : json({}, 403);
  if (url === "/api/auth/login/") {
    assert.equal(new Headers(init.headers).get("X-CSRFToken"), token);
    serverUser = JSON.parse(String(init.body)).email === second.email ? second : first;
    token = "rotated-after-login";
    return json(serverUser);
  }
  if (url === "/api/auth/logout/") {
    assert.equal(new Headers(init.headers).get("X-CSRFToken"), token);
    serverUser = null;
    return new Response(null, { status: 204 });
  }
  throw new Error("Unexpected request: " + url);
}
beforeEach(async () => {
  serverUser = null; token = "before-login"; calls = []; handle = server;
  globalThis.fetch = async (input, init = {}) => { calls.push({ url: String(input), init }); return handle(String(input), init); };
  await signOut(); calls = [];
});
after(() => { globalThis.fetch = originalFetch; });

test("login rotates CSRF, sends credentials only to auth, and prepares every write", async () => {
  await signIn({ email: first.email, password: "test-only" });
  assert.equal(getAuthState().status, "authenticated");
  assert.deepEqual(getAuthState().user, first);
  handle = (url, init) => url === "/api/posts/" ? json({}, 201) : server(url, init);
  await apiFetch("/api/posts/", { method: "POST", body: "{}" });
  const write = calls.at(-1)!.init;
  assert.equal(new Headers(write.headers).get("X-CSRFToken"), "rotated-after-login");
  assert.equal(write.credentials, "same-origin");
  assert.equal(write.cache, "no-store");
  assert.equal(write.redirect, "error");
  assert.equal(write.body, "{}");
});

test("account switching clears profile edits, relationships, and old requests", async () => {
  await signIn({ email: first.email, password: "test-only" });
  savePreviewProfile({ name: first.user_name, bio: "Private draft", color: "#f3dfcc" });
  becomePreviewMasmates(first.user_id, second.user_id);
  let release!: (response: Response) => void;
  handle = (url, init) => url === "/api/slow/" ? new Promise((resolve) => { release = resolve; }) : server(url, init);
  const stale = apiFetch("/api/slow/");
  const rejected = assert.rejects(stale, { name: "AbortError" });
  await signOut();
  release(json({ private: "old response" }));
  await rejected;
  assert.equal(getAuthState().status, "anonymous");
  await signIn({ email: second.email, password: "test-only" });
  assert.equal(getPreviewProfile().id, second.user_id);
  assert.equal(getPreviewProfile().bio, "");
  assert.equal(arePreviewMasmates(first.user_id, second.user_id), false);
});

test("403 checks the session without replaying a write or logging out on CSRF failure", async () => {
  await signIn({ email: first.email, password: "test-only" });
  handle = (url, init) => url === "/api/write/" ? json({ detail: "CSRF Failed" }, 403) : server(url, init);
  assert.equal((await apiFetch("/api/write/", { method: "POST" })).status, 403);
  assert.equal(getAuthState().status, "authenticated");
  assert.equal(calls.filter((call) => call.url === "/api/write/").length, 1);
  serverUser = null;
  await assert.rejects(apiFetch("/api/write/", { method: "POST" }), { name: "AbortError" });
  assert.equal(getAuthState().status, "anonymous");
});

test("session restoration distinguishes network failure from logged out", async () => {
  handle = () => { throw new TypeError("offline"); };
  await refreshSession();
  assert.equal(getAuthState().status, "error");
  handle = server; serverUser = second;
  await refreshSession();
  assert.deepEqual(getAuthState().user, second);
  serverUser = null;
  await refreshSession();
  assert.equal(getAuthState().status, "anonymous");
});

test("logout failure keeps the authenticated state and reports failure", async () => {
  await signIn({ email: first.email, password: "test-only" });
  handle = (url, init) => url === "/api/auth/logout/" ? json({}, 500) : server(url, init);
  await signOut();
  assert.equal(getAuthState().status, "authenticated");
  assert.match(getAuthState().error, /ログアウトできません/);
});

test("registration preserves password whitespace and reports field errors", async () => {
  handle = (url, init) => {
    if (url !== "/api/auth/register/") return server(url, init);
    assert.equal(JSON.parse(String(init.body)).password, " password-with-spaces ");
    return json({ email: ["already registered"] }, 400);
  };
  await assert.rejects(registerUser({ ...first, password: " password-with-spaces " }), /メールアドレス: already registered/);
  assert.equal(getAuthState().status, "anonymous");
});

test("invalid identity and another user's mutation responses are rejected", async () => {
  handle = () => json({ ...first, user_id: 11 });
  await assert.rejects(fetchCurrentUser(), /ユーザー情報/);
  handle = server;
  await signIn({ email: first.email, password: "test-only" });
  handle = () => json({ workout_id: "id", user_id: 22, performed_at: "2026-10-25T00:00:00Z", is_completed: false }, 201);
  await assert.rejects(createWorkout(), /応答形式/);
  handle = () => json({ post_id: "p", user_id: "22", user_name: "other", post_type: 1, content: "x", posted_at: "2026-10-25T00:00:00Z", workout_id: null, like_count: 0, is_liked: false }, 201);
  await assert.rejects(createPost({ post_type: 1, content: "x" }), /応答形式/);
});

test("login return paths preserve local query/hash and reject external redirects", () => {
  assert.equal(safeReturnPath("/exercises?workoutId=a#choice"), "/exercises?workoutId=a#choice");
  for (const input of [null, "https://other.test", "//other.test", "/\\other.test", "/login?next=x", "/register", "/\nother"]) assert.equal(safeReturnPath(input), "/");
});
