import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createPost, fetchPosts, fetchPost, addPostLike, type ApiPost } from "../src/api/posts.ts";

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
  const controller = new AbortController();
  const signal = controller.signal;
  const result = await fetchPosts({ limit: 20, offset: 20, signal });
  assert.equal(result.next_offset, 40);
  assert.equal(requests[0].url, "/api/posts/?limit=20&offset=20");
  assert.equal(requests[0].init?.method, "GET");
  assert.equal(requests[0].init?.signal?.aborted, false);
  controller.abort();
  assert.equal(requests[0].init?.signal?.aborted, true);
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
  respond({ post_id: "a/b", like_count: 6, is_liked: true });
  assert.deepEqual(await addPostLike("a/b"), { post_id: "a/b", like_count: 6, is_liked: true });
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
  respond({ post_id: fixture.post_id, like_count: 6, is_liked: true });
  await addPostLike(fixture.post_id);
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
  await assert.rejects(fetchPosts(), /見つかりません/);
  respond({ results: [{ ...fixture, is_liked: "true" }], next_offset: null });
  await assert.rejects(fetchPosts(), /応答形式/);
  respond({ results: [fixture], next_offset: 0 });
  await assert.rejects(fetchPosts(), /応答形式/);
  respond({ post_id: "other", like_count: 1, is_liked: true });
  await assert.rejects(addPostLike("12"), /応答形式/);
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

test("compose forwards its abort signal and preserves cancellation", async () => {
  respond(fixture, 201);
  const controller = new AbortController();
  await createPost({ post_type: 1, content: "記録" }, controller.signal);
  assert.equal(requests[0].init?.signal?.aborted, false);

  const aborted = new DOMException("Aborted", "AbortError");
  globalThis.fetch = async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(aborted), { once: true });
  });
  const pending = createPost({ post_type: 1, content: "記録" }, controller.signal);
  controller.abort();
  await assert.rejects(pending, (error) => error === aborted);
});

test("compose receives field errors and keeps a fallback for invalid error bodies", async () => {
  for (const body of [{ content: ["本文を確認してください。"] }, { workout_id: "記録を確認してください。" }, { detail: "入力を確認してください。" }]) {
    respond(body, 400);
    await assert.rejects(createPost({ post_type: 1, content: "記録" }), /確認してください。/);
  }
  for (const body of [null, { content: [123] }, {}]) {
    respond(body, 400);
    await assert.rejects(createPost({ post_type: 1, content: "記録" }), /投稿APIでエラーが発生しました（400）/);
  }
});

test("UUID post IDs survive paged reads, creation and the bodyless like request unchanged", async () => {
  // Posts.post_id is a UUIDField; Like.post_id references that same post.
  const firstId = "c8683daa-b897-407d-b276-9d48a105de68";
  const secondId = "a2f08b16-950d-44b3-81c8-757837f78edb";
  const first: ApiPost = { ...fixture, post_id: firstId, user_id: "user-3", like_count: 0, is_liked: false };
  const second: ApiPost = { ...first, post_id: secondId };
  respond({ results: [first], next_offset: 37 });
  const page = await fetchPosts({ limit: 1 });
  assert.equal(page.results[0].post_id, firstId);
  assert.equal(page.results[0].user_id, "user-3");
  respond({ results: [second], next_offset: null });
  assert.deepEqual((await fetchPosts({ limit: 1, offset: page.next_offset! })).results, [second]);
  assert.equal(requests.at(-1)!.url, "/api/posts/?limit=1&offset=37");

  respond({ ...second, like_count: 0, is_liked: false }, 201);
  assert.equal((await createPost({ post_type: 1, content: "記録" })).post_id, secondId);
  assert.deepEqual(JSON.parse(String(requests.at(-1)!.init?.body)), { post_type: 1, content: "記録" });

  for (const result of [{ post_id: firstId, like_count: 1, is_liked: true }, { post_id: firstId, like_count: 1, is_liked: true }]) {
    respond(result);
    assert.deepEqual(await addPostLike(firstId), result);
    assert.equal(requests.at(-1)!.url, "/api/posts/" + firstId + "/like/");
    assert.equal(requests.at(-1)!.init?.method, "PUT");
    assert.equal(requests.at(-1)!.init?.body, undefined);
  }
});

test("database rows do not replace the enriched post API or aggregate like response", async () => {
  const postId = "c8683daa-b897-407d-b276-9d48a105de68";
  // user_name and the two like fields are API data, not columns of Posts.
  const row = { post_id: postId, user_id: "user-3", post_type: 1, content: "記録", posted_at: fixture.posted_at, workout_id: null };
  respond({ results: [row], next_offset: null });
  await assert.rejects(fetchPosts(), /応答形式/);
  respond(row, 201);
  await assert.rejects(createPost({ post_type: 1, content: "記録" }), /応答形式/);
  // Like's own auto-increment ID is not the post ID or a like count.
  respond({ id: 8, post_id: postId, user_id: "user-3" });
  await assert.rejects(addPostLike(postId), /応答形式/);
  respond({ post_id: "another-post", like_count: 1, is_liked: true });
  await assert.rejects(addPostLike(postId), /応答形式/);
});

test("notification detail fetch uses the exact post ID and rejects another post", async () => {
  respond(fixture);
  assert.deepEqual(await fetchPost("12"), fixture);
  assert.equal(requests[0].url, "/api/posts/12/");
  assert.equal(requests[0].init?.method, "GET");
  respond({ ...fixture, post_id: "other" });
  await assert.rejects(fetchPost("12"), /対象の投稿/);
  respond({}, 404); await assert.rejects(fetchPost("12"), /見つかりません/);
});

test("liking only writes the like endpoint and never sends a broadcast start notice", async () => {
  respond({ post_id: "12", like_count: 1, is_liked: true });
  await addPostLike("12");
  assert.deepEqual(requests.map((request) => request.url), ["/api/posts/12/like/"]);
});

 test("add-only likes reject an unlike response", async () => {
 respond({ post_id: "12", like_count: 0, is_liked: false });
 await assert.rejects(addPostLike("12"), /応答形式/);
});
test("500 Unicode code points are allowed and longer content is not sent", async () => {
 const content = "💪".repeat(500);
 respond({ ...fixture, content }, 201);
 await createPost({ post_type: 1, content });
 assert.equal(requests.length, 1);
 await assert.rejects(createPost({ post_type: 1, content: content + "あ" }), /500文字/);
 assert.equal(requests.length, 1);
});
test("workout sharing allows an empty caption", async () => {
 respond({ ...fixture, post_type: 2, content: "", workout_id: "42" }, 201);
 await createPost({ post_type: 2, content: "", workout_id: "42" });
 assert.deepEqual(JSON.parse(String(requests[0].init?.body)), { post_type: 2, content: "", workout_id: "42" });
});
