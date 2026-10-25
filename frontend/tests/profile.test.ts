import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPosts } from "../src/api/posts.ts";

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
