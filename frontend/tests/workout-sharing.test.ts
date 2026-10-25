import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createPost, type ApiPost } from "../src/api/posts.ts";
import { fetchWorkout, type WorkoutDetail } from "../src/api/workouts.ts";
import { workoutShareContent } from "../src/features/workouts/sharing.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const workout: WorkoutDetail = {
  workout_id: "workout-1", user_id: 1, performed_at: "2026-10-25T12:00:00+09:00", is_completed: true,
  exercises: [
    { workout_exercise_id: "bench", exercise_id: "master-bench", display_name: "ベンチプレス", position: 1,
      sets: [
        { workout_set_id: "set-1", set_number: 1, reps: 8, weight: "55.5" },
        { workout_set_id: "set-2", set_number: 3, reps: 10, weight: "50.0" },
      ] },
    { workout_exercise_id: "unrecorded", exercise_id: "master-curl", display_name: "未記録の種目", position: 2, sets: [] },
    { workout_exercise_id: "pushup", exercise_id: "master-pushup", display_name: "プッシュアップ", position: 3,
      sets: [{ workout_set_id: "set-3", set_number: 1, reps: 15, weight: "0.0" }] },
  ],
};

const expectedContent = "トレーニング記録\n\nベンチプレス（2セット）\nセット1：55.5 kg × 8 回\nセット3：50.0 kg × 10 回\n\nプッシュアップ（1セット）\nセット1：0.0 kg × 15 回";

test("share text contains every saved menu, set number, weight and rep count, omitting unsaved exercises", () => {
  const original = structuredClone(workout);
  assert.equal(workoutShareContent(workout), expectedContent);
  assert.deepEqual(workout, original);
});

test("an existing caption precedes the workout text without losing line breaks or Unicode", () => {
  assert.equal(workoutShareContent(workout, "  自己ベスト💪\n次回も頑張る  "), "自己ベスト💪\n次回も頑張る\n\n" + expectedContent);
});

test("incomplete workouts and workouts without saved sets cannot produce a share draft", () => {
  assert.throws(() => workoutShareContent({ ...workout, is_completed: false }), /終了済み/);
  assert.throws(() => workoutShareContent({ ...workout, exercises: [] }), /記録がありません/);
  assert.throws(() => workoutShareContent({ ...workout, exercises: [workout.exercises[1]] }), /記録がありません/);
});

test("API-loaded workout text is sent as the post content along with its workout ID", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === "/api/workouts/workout-1/") return Response.json(workout);
    assert.equal(String(url), "/api/posts/");
    const body = JSON.parse(String(init?.body));
    const post: ApiPost = { ...body, post_id: "post-1", user_id: "1", user_name: "利用者", posted_at: workout.performed_at, like_count: 0, is_liked: false };
    return Response.json(post, { status: 201 });
  };

  const saved = await fetchWorkout(workout.workout_id);
  const content = workoutShareContent(saved, "自己ベスト💪");
  const post = await createPost({ post_type: 2, workout_id: saved.workout_id, content });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init?.method, "GET");
  assert.equal(calls[1].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
    post_type: 2, workout_id: workout.workout_id, content: "自己ベスト💪\n\n" + expectedContent,
  });
  assert.equal(post.content, "自己ベスト💪\n\n" + expectedContent);
});

test("long workout text is preserved for editing and the complete content is checked against the post limit", async () => {
  const longWorkout = { ...workout, exercises: Array.from({ length: 20 }, () => workout.exercises[0]) };
  const content = workoutShareContent(longWorkout);
  assert.ok([...content].length > 500);
  assert.equal(content.split("セット3：50.0 kg × 10 回").length - 1, 20);
  globalThis.fetch = async () => { assert.fail("overlong content must not be sent"); };
  await assert.rejects(createPost({ post_type: 2, workout_id: workout.workout_id, content }), /500文字/);
});
