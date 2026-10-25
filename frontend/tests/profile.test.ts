import assert from "node:assert/strict";
import { test } from "node:test";
import { getPreviewProfile, profileNameFromState, savePreviewProfile } from "../src/features/profile/preview.ts";
import { fetchPosts } from "../src/api/posts.ts";
test("dummy edits preserve identity and reject invalid fields without modifying the saved profile", () => {
  savePreviewProfile({ name: "試験ユーザー", bio: "週3回", color: "#f3dfcc" });
  assert.equal(getPreviewProfile().id, "me"); assert.equal(getPreviewProfile().name, "試験ユーザー");
  const previous = getPreviewProfile();
  for (const value of [{ name: " ", bio: "", color: "#f3dfcc" }, {name:"長".repeat(41),bio:"",color:"#f3dfcc"}, {name:"名前",bio:"長".repeat(161),color:"#f3dfcc"}]) assert.throws(() => savePreviewProfile(value));
  assert.equal(getPreviewProfile(), previous);
});
test("navigation identity must match the target route and is never used for authentication", () => {
  assert.equal(profileNameFromState("3", {profile:{id:"3",name:"たろう"}}), "たろう");
  for (const state of [null, {profile:{id:"4",name:"別人"}}, {profile:{id:"3",name:42}}]) assert.equal(profileNameFromState("3",state),null);
});
test("user timeline uses the user endpoint, pagination, and rejects another user's posts", async () => {
  const original = globalThis.fetch;
  const post = {post_id:"p",user_id:"3",user_name:"たろう",post_type:1,content:"本文",posted_at:"2026-10-25T12:00:00+09:00",workout_id:null,like_count:0,is_liked:false};
  try {
    globalThis.fetch=async(url)=>{assert.equal(url,"/api/users/3/posts/?limit=20&offset=0");return Response.json({results:[post],next_offset:null});};
    assert.equal((await fetchPosts({userId:"3"})).results[0].user_name,"たろう");
    globalThis.fetch=async()=>Response.json({results:[post],next_offset:null});
    await assert.rejects(fetchPosts({userId:"4"}),/対象ユーザー/);
  } finally { globalThis.fetch=original; }
});
