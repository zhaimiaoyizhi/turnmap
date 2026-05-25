import test from "node:test";
import assert from "node:assert/strict";

import { loadStoredGraph, resetStoredGraph, saveStoredGraph } from "../src/side-panel/graph/graph-storage.ts";

const SOURCE_ANCHOR = {
  turnIndex: 1,
  userMessageId: "u-1",
  assistantMessageId: "a-1",
  userHash: "user-hash",
  assistantHash: "assistant-hash",
  userPreview: "What should the release note say?",
  assistantPreview: "Keep it short and specific."
};

function withChromeStorage() {
  const store = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          if (typeof key === "string") return { [key]: store[key] };
          return {};
        },
        async set(value) {
          Object.assign(store, value);
        },
        async remove(key) {
          delete store[key];
        }
      }
    }
  };
}

test("graph storage preserves sourceAnchors for custom nodes", async () => {
  withChromeStorage();

  await saveStoredGraph(
    "conversation-1",
    [
      {
        id: "custom-note-1",
        position: { x: 10, y: 20 },
        data: {
          title: "AI note",
          summary: "Pending summary",
          isCustomNode: true,
          tags: ["AI"],
          sourceAnchors: [SOURCE_ANCHOR]
        }
      }
    ],
    []
  );

  const stored = await loadStoredGraph("conversation-1");

  assert.deepEqual(stored.customNodes?.[0]?.sourceAnchors, [SOURCE_ANCHOR]);

  await resetStoredGraph("conversation-1");
});

test("graph storage preserves sourceAnchors for turn node overrides", async () => {
  withChromeStorage();

  await saveStoredGraph(
    "conversation-2",
    [
      {
        id: "turn-old-user-hash-assistant-hash",
        position: { x: 30, y: 40 },
        data: {
          title: "Edited title",
          summary: "Edited summary",
          turn: {
            id: "turn-old-user-hash-assistant-hash",
            turnIndex: 1,
            userText: "What should the release note say?",
            assistantText: "Keep it short and specific.",
            extractedAt: 1,
            sourceAnchor: SOURCE_ANCHOR
          }
        }
      }
    ],
    []
  );

  const stored = await loadStoredGraph("conversation-2");

  assert.deepEqual(stored.nodeOverrides["turn-old-user-hash-assistant-hash"].sourceAnchors, [SOURCE_ANCHOR]);

  await resetStoredGraph("conversation-2");
});
