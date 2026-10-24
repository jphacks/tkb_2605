import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createPost, fetchPosts, togglePostLike, type ApiPost } from "../src/api/posts.ts";

const originalFetch = globalThis.fetch;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const fixture: ApiPost = { post_id: "12", user_id: "3", user_name: "たろう", post_type: 1, content: "記録", posted_at: "2026-10-24T15:00:00+09:00", workout_id: null, like_count: 5, is_liked: true };
let requests: { url: string; init?: RequestInit }[];
function respond(body: unknown, status = 200) {
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
}
beforeEach(() => { requests = []; });
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

for (const status of [200, 201]) test(`list accepts HTTP ${status} and forwards pagination and abort signal`, async () => {
  respond({ results: [fixture], next_offset: 40 }, status);
  const signal = new AbortController().signal;
  const result = await fetchPosts({ limit: 20, offset: 20, signal });
  assert.equal(result.next_offset, 40);
  assert.equal(requests[0].url, "/api/posts/?limit=20&offset=20");
  assert.equal(requests[0].init?.method, "GET");
  assert.equal(requests[0].init?.signal, signal);
  assert.equal(requests[0].init?.credentials, "same-origin");
});

test("end of history is null and invalid paging is rejected before a request", async () => {
  respond({ results: [], next_offset: null });
  assert.equal((await fetchPosts()).next_offset, null);
  await assert.rejects(fetchPosts({ limit: 101 }));
  await assert.rejects(fetchPosts({ offset: -1 }));
  assert.equal(requests.length, 1);
});

test("an empty page can continue at the exact offset returned by the API", async () => {
  respond({ results: [], next_offset: 37 });
  const first = await fetchPosts();
  assert.deepEqual(first, { results: [], next_offset: 37 });
  assert.equal(requests[0].url, "/api/posts/?limit=20&offset=0");
  respond({ results: [fixture], next_offset: null });
  const last = await fetchPosts({ offset: first.next_offset! });
  assert.equal(requests[1].url, "/api/posts/?limit=20&offset=37");
  assert.equal(last.next_offset, null);
});

test("invalid or non-advancing next offsets are rejected rather than repeating a page", async () => {
  for (const next_offset of [-1, 19, 20, 20.5, "40"]) {
    respond({ results: [fixture], next_offset });
    await assert.rejects(fetchPosts({ offset: 20 }), /応答形式/);
  }
});

test("like sends a bodyless PUT and uses the returned authoritative state", async () => {
  respond({ post_id: "a/b", like_count: 6, is_liked: false });
  assert.deepEqual(await togglePostLike("a/b"), { post_id: "a/b", like_count: 6, is_liked: false });
  assert.equal(requests[0].url, "/api/posts/a%2Fb/like/");
  assert.equal(requests[0].init?.method, "PUT");
  assert.equal(requests[0].init?.body, undefined);
  assert.equal(requests[0].init?.credentials, "same-origin");
  assert.equal(new Headers(requests[0].init?.headers).has("Content-Type"), false);
});

for (const status of [200, 201]) test(`text, workout, and start-notification requests accept HTTP ${status} and follow the issue contract`, async () => {
  respond(fixture, status);
  await createPost({ post_type: 1, content: "記録" });
  assert.equal(requests[0].url, "/api/posts/");
  assert.equal(requests[0].init?.method, "POST");
  assert.equal(requests[0].init?.credentials, "same-origin");
  assert.equal(new Headers(requests[0].init?.headers).get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(String(requests.at(-1)!.init?.body)), { post_type: 1, content: "記録" });
  respond({ ...fixture, post_type: 2, workout_id: "42" }, status);
  await createPost({ post_type: 2, content: "自己ベスト", workout_id: "42" });
  assert.deepEqual(JSON.parse(String(requests.at(-1)!.init?.body)), { post_type: 2, content: "自己ベスト", workout_id: "42" });
  respond({ ...fixture, post_type: 3, content: "" }, status);
  await createPost({ post_type: 3 });
  assert.deepEqual(JSON.parse(String(requests.at(-1)!.init?.body)), { post_type: 3 });
});

test("writes forward the Django CSRF cookie while list requests do not", async () => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "other=value; csrftoken=csrf%2Dtoken" } });
  respond({ post_id: fixture.post_id, like_count: 6, is_liked: false });
  await togglePostLike(fixture.post_id);
  assert.equal(new Headers(requests.at(-1)!.init?.headers).get("X-CSRFToken"), "csrf-token");
  respond(fixture, 201);
  await createPost({ post_type: 1, content: "記録" });
  assert.equal(new Headers(requests.at(-1)!.init?.headers).get("X-CSRFToken"), "csrf-token");
  respond({ results: [fixture], next_offset: null });
  await fetchPosts();
  assert.equal(new Headers(requests.at(-1)!.init?.headers).has("X-CSRFToken"), false);
});

test("server errors and malformed payloads never masquerade as success", async () => {
  respond({}, 404);
  await assert.rejects(fetchPosts(), /接続できません/);
  respond({ results: [{ ...fixture, is_liked: "true" }], next_offset: null });
  await assert.rejects(fetchPosts(), /応答形式/);
  respond({ results: [fixture], next_offset: 0 });
  await assert.rejects(fetchPosts(), /応答形式/);
  respond({ post_id: "other", like_count: 1, is_liked: true });
  await assert.rejects(togglePostLike("12"), /応答形式/);
  respond(fixture, 201);
  await assert.rejects(createPost({ post_type: 2, content: "記録", workout_id: "42" }), /応答形式/);
});

test("empty post inputs are rejected without transmitting a request", async () => {
  respond(fixture);
  await assert.rejects(createPost({ post_type: 1, content: "  " }));
  await assert.rejects(createPost({ post_type: 2, content: "記録", workout_id: "" }));
  assert.equal(requests.length, 0);
});

test("abort is preserved and an uncertain POST result is reported distinctly", async () => {
  const aborted = new DOMException("Aborted", "AbortError");
  globalThis.fetch = async () => { throw aborted; };
  await assert.rejects(fetchPosts(), (error) => error === aborted);
  globalThis.fetch = async () => { throw new TypeError("Offline"); };
  await assert.rejects(createPost({ post_type: 1, content: "記録" }), /送信結果を確認できません/);
});
