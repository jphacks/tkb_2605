import assert from "node:assert/strict";
import { test } from "node:test";
import { arePreviewMasmates, becomePreviewMasmates, subscribePreviewMasmates } from "../src/features/profile/masmates.ts";

test("one person's action establishes the same relationship from either side without confirmation", () => {
  assert.equal(arePreviewMasmates("alice", "bob"), false);
  becomePreviewMasmates("alice", "bob");
  assert.equal(arePreviewMasmates("alice", "bob"), true);
  assert.equal(arePreviewMasmates("bob", "alice"), true);
  assert.equal(arePreviewMasmates("alice", "charlie"), false);
});

test("relationships survive unsubscribing and reopening; repeated actions never remove them", () => {
  let updates = 0;
  const unsubscribe = subscribePreviewMasmates(() => { updates += 1; });
  becomePreviewMasmates("viewer", "person");
  becomePreviewMasmates("person", "viewer");
  assert.equal(updates, 1);
  unsubscribe();
  assert.equal(arePreviewMasmates("viewer", "person"), true);
  becomePreviewMasmates("viewer", "person");
  assert.equal(arePreviewMasmates("person", "viewer"), true);
});

test("empty identities and self relationships cannot become masmates", () => {
  for (const [first, second] of [["", "other"], [" ", "other"], ["same", "same"]]) {
    becomePreviewMasmates(first, second);
    assert.equal(arePreviewMasmates(first, second), false);
  }
});
