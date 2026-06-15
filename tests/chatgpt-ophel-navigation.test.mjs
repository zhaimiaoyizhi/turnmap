import assert from "node:assert/strict";
import test from "node:test";

import { hashText } from "../src/shared/hash.ts";

async function loadNavigationModule() {
  try {
    return await import("../src/content/chatgpt-ophel-navigation.ts");
  } catch (error) {
    assert.fail(`missing clean-room ChatGPT ophel_notSourceAnchor navigation module: ${error.message}`);
  }
}

function turn(id, index, userText, assistantText = `assistant ${index}`, navigation) {
  return {
    id,
    turnIndex: index,
    userText,
    assistantText,
    extractedAt: 1,
    navigation,
    sourceAnchor: {
      turnIndex: index,
      userMessageId: `legacy-user-${index}`,
      assistantMessageId: `legacy-assistant-${index}`,
      userHash: hashText(userText),
      assistantHash: hashText(assistantText),
      userPreview: userText.slice(0, 120),
      assistantPreview: assistantText.slice(0, 120)
    }
  };
}

test("ChatGPT native user seeds create ophel_notSourceAnchor navigation ids without scrolling", async () => {
  const { turnsFromOphelNavigationSeeds } = await loadNavigationModule();

  const turns = turnsFromOphelNavigationSeeds([
    { index: 0, text: "First prompt", messageId: "aaa" },
    { index: 1, text: "Repeat prompt" },
    { index: 2, text: "Repeat prompt" }
  ]);

  assert.equal(turns.length, 3);
  assert.equal(turns[0].navigation?.kind, "ophel_notSourceAnchor");
  assert.equal(turns[0].navigation?.navigationId, "chatgpt-message:aaa");
  assert.match(turns[1].navigation?.navigationId ?? "", /^chatgpt-native-user-query:1:/);
  assert.match(turns[2].navigation?.navigationId ?? "", /^chatgpt-native-user-query:2:/);
  assert.notEqual(turns[1].navigation?.navigationId, turns[2].navigation?.navigationId);
});

test("ChatGPT native user index extends partial extraction by navigation identity, not SourceAnchor", async () => {
  const { mergeOphelNavigationTurns, turnsFromOphelNavigationSeeds } = await loadNavigationModule();
  const existing = [
    turn("turn-0", 0, "Old visible text", "Full assistant answer", {
      kind: "ophel_notSourceAnchor",
      navigationId: "chatgpt-message:user-42",
      messageId: "user-42",
      turnIndex: 0
    })
  ];
  const nativeTurns = turnsFromOphelNavigationSeeds([
    { index: 0, text: "Updated native text for the same message", messageId: "user-42" },
    { index: 1, text: "Prompt outside DOM", messageId: "user-43" }
  ]);

  const merged = mergeOphelNavigationTurns(existing, nativeTurns);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].assistantText, "Full assistant answer");
  assert.equal(merged[0].userText, "Updated native text for the same message");
  assert.equal(merged[0].navigation?.navigationId, "chatgpt-message:user-42");
  assert.equal(merged[1].userText, "Prompt outside DOM");
});

test("ChatGPT native TOC can recover hidden Prompt labels from sibling title text", async () => {
  const { resolveNativeTocText } = await loadNavigationModule();

  assert.equal(
    resolveNativeTocText(
      { ariaLabel: "Prompt 2", text: "", title: "" },
      ["First user question", "Second user question"],
      1
    ),
    "Second user question"
  );
  assert.equal(
    resolveNativeTocText({ ariaLabel: "Ask about TurnMap", text: "", title: "" }, [], 0),
    "Ask about TurnMap"
  );
});
