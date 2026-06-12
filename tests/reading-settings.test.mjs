import assert from "node:assert/strict";
import test from "node:test";

import {
  READING_BEHAVIOR_DEFAULTS,
  normalizeEdgeWaitSeconds,
  normalizeJumpSearchStrength,
  normalizeReadingBehaviorSettings,
  normalizeScrollSpeedMultiplier
} from "../src/shared/reading-settings.ts";

test("reading behavior settings normalize to safe bounded defaults", () => {
  assert.deepEqual(normalizeReadingBehaviorSettings({}), READING_BEHAVIOR_DEFAULTS);
  assert.equal(normalizeScrollSpeedMultiplier(3), 2);
  assert.equal(normalizeScrollSpeedMultiplier(0.1), 0.5);
  assert.equal(normalizeJumpSearchStrength(3), 2);
  assert.equal(normalizeJumpSearchStrength(0.1), 0.5);
  assert.equal(normalizeEdgeWaitSeconds(30), 20);
  assert.equal(normalizeEdgeWaitSeconds(-1), 0);
  assert.equal(normalizeEdgeWaitSeconds("0.84"), 0.8);
});
