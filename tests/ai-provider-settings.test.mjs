import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("AI settings form renders provider options from metadata and clears API key on provider switch", async () => {
  const source = await readFile(new URL("../src/side-panel/settings/AiSettingsForm.tsx", import.meta.url), "utf8");

  assert.match(source, /aiProviderOptions\.map/);
  assert.doesNotMatch(source, /<option value="deepseek">DeepSeek<\/option>/);
  assert.match(source, /apiKey:\s*""/);
  assert.match(source, /maxTokens:\s*current\.maxTokens/);
  assert.match(source, /autoSummarize:\s*current\.autoSummarize/);
  assert.match(source, /providerNoteKey/);
});

test("AI provider i18n explains raw API key, preset limits, and endpoint ids", async () => {
  const source = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  for (const key of [
    "ai.apiKeyRawHint",
    "ai.providerNote.openai",
    "ai.providerNote.doubao",
    "ai.providerNote.geminiCompatible",
    "ai.providerPresetLimit"
  ]) {
    assert.match(source, new RegExp(`"${key}":`), `${key} should exist`);
  }
  assert.match(source, /raw API key/);
  assert.match(source, /endpoint ID/);
  assert.match(source, /Bearer/);
  assert.match(source, /API Key 原文/);
});
