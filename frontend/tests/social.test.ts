import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { createSeedData } from "../src/features/social/seed.ts";
import { createSocialStore, CURRENT_USER_ID } from "../src/features/social/useSocial.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let saved: string | null;
let writesBlocked: boolean;

beforeEach(() => {
  saved = null;
  writesBlocked = false;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => saved,
        setItem: (_key: string, value: string) => {
          if (writesBlocked) throw new Error("Storage quota exceeded");
          saved = value;
        },
      },
    },
  });
});

after(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

test("posts, nested replies, profile edits, likes and read notifications survive a reload", () => {
  const { getSnapshot } = createSocialStore();
  const postId = getSnapshot().addPost("  今日もトレーニング完了  ", "/images/training-room.svg");
  const replyId = getSnapshot().addPost("おつかれさま！", undefined, postId);
  const nestedId = getSnapshot().addPost("ありがとう！", undefined, replyId);
  assert.ok(postId && replyId && nestedId);

  getSnapshot().updateProfile({ name: "  新しい名前  ", bio: "継続を大切にしています。" });
  getSnapshot().toggleLike(postId);
  getSnapshot().markNotificationsRead();

  const restored = createSocialStore().getSnapshot();
  assert.equal(restored.storageError, null);
  assert.equal(restored.currentUser.name, "新しい名前");
  assert.equal(restored.currentUser.bio, "継続を大切にしています。");
  const restoredPost = restored.posts.find((post) => post.id === postId);
  assert.equal(restoredPost?.text, "今日もトレーニング完了");
  assert.equal(restoredPost?.image, "/images/training-room.svg");
  assert.ok(restoredPost?.likedBy.includes(CURRENT_USER_ID));
  assert.equal(restored.posts.find((post) => post.id === replyId)?.parentId, postId);
  assert.equal(restored.posts.find((post) => post.id === nestedId)?.parentId, replyId);
  assert.ok(restored.notifications.every((notification) => notification.read));
});

test("invalid posts and profile edits do not replace valid user content", () => {
  const { getSnapshot } = createSocialStore();
  const original = getSnapshot();
  assert.equal(getSnapshot().addPost("   "), "");
  assert.equal(getSnapshot().addPost("あ".repeat(501)), "");
  assert.equal(getSnapshot().addPost("画像", "javascript:alert(1)"), "");
  assert.equal(getSnapshot().addPost("返信", undefined, "missing-post"), "");
  getSnapshot().updateProfile({ name: "   ", bio: "空の名前には変更できません" });
  getSnapshot().updateProfile({ name: "ユーザー", bio: "あ".repeat(161) });
  assert.deepEqual(getSnapshot().posts, original.posts);
  assert.deepEqual(getSnapshot().currentUser, original.currentUser);

  const imageOnlyId = getSnapshot().addPost("", "/images/running-track.svg");
  assert.ok(imageOnlyId, "An image-only post should be accepted");
  assert.ok(getSnapshot().addPost("あ".repeat(500)), "The 500-character boundary should be accepted");
});

test("following and unfollowing update both profiles consistently and persist", () => {
  const { getSnapshot } = createSocialStore();
  getSnapshot().toggleFollow("ren");
  let restored = createSocialStore().getSnapshot();
  assert.ok(restored.currentUser.followingIds.includes("ren"));
  assert.ok(restored.users.find((user) => user.id === "ren")?.followerIds.includes(CURRENT_USER_ID));

  getSnapshot().toggleFollow("ren");
  getSnapshot().toggleFollow(CURRENT_USER_ID);
  getSnapshot().toggleFollow("missing-user");
  restored = createSocialStore().getSnapshot();
  assert.ok(!restored.currentUser.followingIds.includes("ren"));
  assert.ok(!restored.currentUser.followingIds.includes(CURRENT_USER_ID));
  assert.ok(!restored.currentUser.followingIds.includes("missing-user"));
  assert.ok(!restored.users.find((user) => user.id === "ren")?.followerIds.includes(CURRENT_USER_ID));
});

test("corrupt or inconsistent saved data falls back to usable samples with an error", () => {
  const cyclic = createSeedData();
  cyclic.posts[0].parentId = cyclic.posts[1].id;
  cyclic.posts[1].parentId = cyclic.posts[0].id;
  const missingAuthor = createSeedData();
  missingAuthor.posts[0].authorId = "missing-user";

  for (const corrupt of ["{invalid-json", '{"version":1}', JSON.stringify(cyclic), JSON.stringify(missingAuthor)]) {
    saved = corrupt;
    const { getSnapshot } = createSocialStore();
    assert.ok(getSnapshot().storageError);
    assert.equal(getSnapshot().currentUser.id, CURRENT_USER_ID);
    assert.ok(getSnapshot().posts.length > 0);
    assert.ok(getSnapshot().addPost("読み込みエラー後も投稿できます"));
  }
});

test("a storage quota failure keeps edits in memory and reports they could not be saved", () => {
  const { getSnapshot } = createSocialStore();
  getSnapshot().addPost("保存済みの投稿");
  const previousSave = saved;
  writesBlocked = true;
  const unsavedId = getSnapshot().addPost("保存容量を超えた投稿");
  assert.ok(getSnapshot().posts.some((post) => post.id === unsavedId));
  assert.ok(getSnapshot().storageError);
  assert.equal(saved, previousSave, "The previous saved data remains intact");

  writesBlocked = false;
  getSnapshot().toggleLike(unsavedId);
  assert.equal(getSnapshot().storageError, null);
  assert.ok(createSocialStore().getSnapshot().posts.some((post) => post.id === unsavedId));
});

test("unavailable browser storage still permits an in-memory session", () => {
  Object.defineProperty(window, "localStorage", {
    get: () => { throw new Error("Storage unavailable"); },
  });
  const { getSnapshot } = createSocialStore();
  assert.ok(getSnapshot().storageError);
  const postId = getSnapshot().addPost("この画面を閉じるまでは使えます");
  assert.ok(postId);
  assert.ok(getSnapshot().posts.some((post) => post.id === postId));
  assert.ok(getSnapshot().storageError);
});
