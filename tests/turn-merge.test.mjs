import assert from "node:assert/strict";
import test from "node:test";

import { mergeTurnUpdates } from "../src/side-panel/turn-merge.ts";

function turn(id, index, assistantText = `assistant ${index}`) {
  return {
    id,
    turnIndex: index,
    userText: `user ${index}`,
    assistantText,
    extractedAt: 1,
    sourceAnchor: {
      turnIndex: index,
      userHash: `u${index}`,
      assistantHash: `a${index}`,
      userPreview: `user ${index}`,
      assistantPreview: assistantText
    }
  };
}

test("refresh appends only tail turns and preserves existing turn objects", () => {
  const first = turn("turn-1", 0, "old text");
  const second = turn("turn-2", 1);
  const changedFirst = turn("turn-1", 0, "new scan should not overwrite");
  const third = turn("turn-3", 2);

  const result = mergeTurnUpdates([first, second], [changedFirst, second, third], "refresh");

  assert.equal(result.added, 1);
  assert.deepEqual(result.turns.map((entry) => entry.id), ["turn-1", "turn-2", "turn-3"]);
  assert.equal(result.turns[0], first);
  assert.equal(result.turns[0].assistantText, "old text");
});

test("refresh ignores missing middle turns", () => {
  const first = turn("turn-1", 0);
  const third = turn("turn-3", 2);
  const second = turn("turn-2", 1);

  const result = mergeTurnUpdates([first, third], [first, second, third], "refresh");

  assert.equal(result.added, 0);
  assert.deepEqual(result.turns.map((entry) => entry.id), ["turn-1", "turn-3"]);
});

test("deep scan inserts missing middle turns without replacing existing text", () => {
  const first = turn("turn-1", 0, "old text");
  const fourth = turn("turn-4", 3);
  const changedFirst = turn("turn-1", 0, "new scan should not overwrite");
  const second = turn("turn-2", 1);
  const third = turn("turn-3", 2);

  const result = mergeTurnUpdates([first, fourth], [changedFirst, second, third, fourth], "deep-scan");

  assert.equal(result.added, 2);
  assert.deepEqual(result.turns.map((entry) => entry.id), ["turn-1", "turn-2", "turn-3", "turn-4"]);
  assert.equal(result.turns[0], first);
  assert.equal(result.turns[0].assistantText, "old text");
});

test("deep scan preserves old turns that are absent from the scan", () => {
  const first = turn("turn-1", 0);
  const second = turn("turn-2", 1);
  const third = turn("turn-3", 2);

  const result = mergeTurnUpdates([first, third], [first, second], "deep-scan");

  assert.equal(result.added, 1);
  assert.deepEqual(result.turns.map((entry) => entry.id), ["turn-1", "turn-2", "turn-3"]);
});
