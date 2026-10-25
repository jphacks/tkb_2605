import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { becomeMasmates, findPeople, getProfile, getOwnProfile, updateProfile, type Profile } from "../src/api/profiles.ts";
import { resetApiSession, setAuthenticatedUserId, setCsrfToken } from "../src/api/http.ts";
import { acceptProfile, getCurrentProfile, refreshCurrentProfile, resetCurrentProfile } from "../src/features/profile/currentProfile.ts";
const originalFetch = globalThis.fetch;
const person: Profile = { user_id: "1", user_name: "名前", bio: "紹介", avatar_color: "#f0d9d1", is_masmate: false };
let calls: { url: string; init: RequestInit }[];
function respond(body: unknown, status = 200) { globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), init }); return Response.json(body, { status }); }; }
beforeEach(() => { calls = []; resetApiSession(); resetCurrentProfile(); setAuthenticatedUserId("1"); setCsrfToken("csrf-test"); });
afterEach(() => { globalThis.fetch = originalFetch; resetApiSession(); resetCurrentProfile(); });

test("public and own profiles use the correct endpoint and validate identity", async () => {
  respond(person);
  assert.deepEqual(await getProfile("1"), person);
  assert.equal(calls[0].url, "/api/users/1/profile/");
  assert.deepEqual(await getOwnProfile(), person);
  assert.equal(calls[1].url, "/api/users/me/profile/");
  await assert.rejects(getProfile("2"), /対象ユーザー/);
  const count = calls.length;
  await assert.rejects(getProfile("../me"));
  assert.equal(calls.length, count);
});
test("profile PATCH sends only editable fields with current CSRF and rejects mismatched success", async () => {
  respond(person);
  await updateProfile({ user_name: " 名前 ", bio: " 紹介 ", avatar_color: "#f0d9d1" });
  assert.equal(calls[0].init.method, "PATCH");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(new Headers(calls[0].init.headers).get("X-CSRFToken"), "csrf-test");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { user_name: "名前", bio: "紹介", avatar_color: "#f0d9d1" });
  respond({ ...person, user_id: "2" });
  await assert.rejects(updateProfile(person), /対象ユーザー/);
});
test("invalid edits never send a request", async () => {
  respond(person);
  for (const input of [{ ...person, user_name: " " }, { ...person, user_name: "長".repeat(51) }, { ...person, bio: "長".repeat(161) }, { ...person, avatar_color: "url(bad)" }]) await assert.rejects(updateProfile(input));
  assert.equal(calls.length, 0);
});
test("search encodes name and uses server pagination without inventing relationships", async () => {
  respond({ results: [{ ...person, is_masmate: true }], next_offset: 40 });
  const page = await findPeople({ query: " A&B ", masmates: true, offset: 20 });
  const url = new URL(calls[0].url, "https://local.test");
  assert.equal(url.searchParams.get("q"), "A&B");
  assert.equal(url.searchParams.get("masmates"), "true");
  assert.equal(url.searchParams.get("offset"), "20");
  assert.equal(page.next_offset, 40);
  respond({ results: [person], next_offset: null });
  await assert.rejects(findPeople({ masmates: true }), /マスメイト一覧/);
  respond({ results: [], next_offset: 20 });
  await assert.rejects(findPeople({ offset: 20 }), /検索結果/);
});
test("becoming masmates is bodyless PUT and requires confirmed server relationship", async () => {
  respond({ ...person, user_id: "2", is_masmate: true });
  assert.equal((await becomeMasmates("2")).is_masmate, true);
  assert.equal(calls[0].url, "/api/users/2/masmate/");
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[0].init.body, undefined);
  respond({ ...person, user_id: "2" });
  await assert.rejects(becomeMasmates("2"), /保存結果/);
});
test("failed mutations are not automatically retried or reported as saved", async () => {
  respond({ user_name: ["Invalid name"] }, 400);
  await assert.rejects(updateProfile(person), /Invalid name/);
  assert.equal(calls.length, 1);
  respond({}, 500);
  await assert.rejects(becomeMasmates("2"));
  assert.equal(calls.length, 2);
});
test("saved profile updates shared display and stale load cannot replace a save", async () => {
  resetCurrentProfile({ id: "1", name: "Before" });
  let finish!: (response: Response) => void;
  globalThis.fetch = async () => new Promise((resolve) => { finish = resolve; });
  const pending = refreshCurrentProfile();
  acceptProfile({ ...person, user_name: "Saved" });
  finish(Response.json(person));
  await pending;
  assert.equal(getCurrentProfile().name, "Saved");
  resetCurrentProfile({ id: "2", name: "Second" });
  assert.equal(getCurrentProfile().bio, "");
  acceptProfile(person);
  assert.equal(getCurrentProfile().id, "2");
  assert.equal(getCurrentProfile().name, "Second");
});
