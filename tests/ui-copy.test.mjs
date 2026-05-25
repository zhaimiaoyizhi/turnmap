import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("empty map copy is site-neutral for multi-site adapters", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  assert.doesNotMatch(canvasSource, /Open a ChatGPT conversation/);
  assert.match(canvasSource, /app\.empty\.title/);
  assert.match(canvasSource, /app\.empty\.hint/);
  assert.doesNotMatch(canvasSource, />No map yet</);
  assert.doesNotMatch(canvasSource, /Open a supported AI conversation with at least one complete answer\./);
  assert.match(i18nSource, /"app\.empty\.title": "No map yet"/);
  assert.match(i18nSource, /"app\.empty\.hint": "Open a supported AI conversation with at least one complete answer\."/);
  assert.match(i18nSource, /Open a supported AI conversation tab, then refresh TurnMap\./);
});

test("TurnMap JSON and visual exports preserve appearance settings", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");

  assert.match(canvasSource, /schemaVersion:\s*2/);
  assert.match(canvasSource, /appearance/);
  assert.match(canvasSource, /loadExportAppearance/);
  assert.match(canvasSource, /normalizeImportedAppearance/);
  assert.match(canvasSource, /applyImportedAppearance/);
  assert.match(canvasSource, /SVG_THEME_COLORS/);
  assert.match(canvasSource, /nodeColorRendering/);
  assert.match(canvasSource, /node\.data\.collapsed/);
  assert.match(canvasSource, /node\.data\.important/);
});

test("rebuild action is localized and resets saved graph before regenerating", async () => {
  const appSource = await readFile(new URL("../src/side-panel/App.tsx", import.meta.url), "utf8");
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  assert.match(appSource, /app\.action\.rebuild/);
  assert.match(appSource, /app\.confirm\.rebuild/);
  assert.match(appSource, /setRebuildRequest/);
  assert.match(canvasSource, /rebuildRequest/);
  assert.match(canvasSource, /resetStoredGraph\(conversationId\)/);
  assert.match(i18nSource, /"app\.action\.rebuild": "Rebuild"/);
  assert.match(i18nSource, /"app\.action\.rebuild": "重建"/);
});

test("saved graph restore remaps turn ids through source anchors before falling back to raw layout", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");

  assert.match(canvasSource, /function buildStoredTurnIdMap/);
  assert.match(canvasSource, /sourceAnchorMatches\(anchor, turn\.sourceAnchor\)/);
  assert.match(canvasSource, /remapRecordKeys\(storedGraph\.positions, storedTurnIdMap\)/);
  assert.match(canvasSource, /remapStoredEdge\(edge, storedTurnIdMap\)/);
  assert.match(canvasSource, /remapCompoundId\(id, storedTurnIdMap\)/);
});

test("interface titles, hints, placeholders, and panel chrome are localized", async () => {
  const appSource = await readFile(new URL("../src/side-panel/App.tsx", import.meta.url), "utf8");
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const aiPanelSource = await readFile(new URL("../src/side-panel/settings/AiSettingsPanel.tsx", import.meta.url), "utf8");
  const aiFormSource = await readFile(new URL("../src/side-panel/settings/AiSettingsForm.tsx", import.meta.url), "utf8");
  const settingsSource = await readFile(new URL("../src/settings-page/main.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  assert.match(appSource, /app\.documentTitle/);
  assert.match(appSource, /debug\.exportReportDone/);
  assert.match(settingsSource, /settings\.documentTitle/);
  assert.match(aiPanelSource, /ai\.title/);
  assert.match(aiPanelSource, /settings\.close/);
  assert.doesNotMatch(aiPanelSource, />AI Provider</);
  assert.doesNotMatch(aiPanelSource, />Close</);
  assert.match(canvasSource, /app\.status\.layoutSet/);
  assert.doesNotMatch(canvasSource, /Layout set to \$\{/);
  assert.match(aiFormSource, /ai\.baseUrlPlaceholder/);
  assert.match(aiFormSource, /ai\.modelPlaceholder/);
  assert.match(aiFormSource, /ai\.maxTokensPlaceholder/);
  assert.match(settingsSource, /settings\.ignoredVersionPlaceholder/);

  for (const key of [
    "app.documentTitle",
    "app.documentTitle.fullPage",
    "settings.documentTitle",
    "app.status.layoutSet",
    "ai.baseUrlPlaceholder",
    "ai.modelPlaceholder",
    "ai.maxTokensPlaceholder",
    "settings.ignoredVersionPlaceholder"
  ]) {
    assert.match(i18nSource, new RegExp(`"${key}":`));
  }
});

test("system-adjacent file and status messages are localized", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const settingsSource = await readFile(new URL("../src/settings-page/main.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  for (const key of [
    "file.exported",
    "file.importedJson",
    "file.importJsonFailed",
    "file.markdownCopied",
    "file.markdownCopyFailed",
    "file.exportPngFailed",
    "file.resetConfirm",
    "file.resetDone",
    "file.undoDone",
    "file.redoDone",
    "settings.languagePackChooseFile",
    "settings.languagePackNoFile",
    "settings.languagePackSelected"
  ]) {
    assert.match(i18nSource, new RegExp(`"${key}":`));
  }

  assert.match(canvasSource, /file\.resetConfirm/);
  assert.match(canvasSource, /file\.importedJson/);
  assert.match(canvasSource, /file\.markdownCopied/);
  assert.match(canvasSource, /file\.undoDone/);
  assert.doesNotMatch(canvasSource, /Reset this TurnMap\?/);
  assert.doesNotMatch(canvasSource, /Markdown copied to clipboard/);
  assert.doesNotMatch(canvasSource, /Imported TurnMap JSON:/);
  assert.doesNotMatch(canvasSource, /onStatus\?\(`Exported \$\{filename\}`\)/);

  assert.match(settingsSource, /languagePackInputRef/);
  assert.match(settingsSource, /settings\.languagePackChooseFile/);
  assert.match(settingsSource, /settings\.languagePackNoFile/);
  assert.match(settingsSource, /settings\.languagePackSelected/);
  assert.doesNotMatch(settingsSource, /<label>\s*\{t\("settings\.importLanguagePack"\)\}\s*<input type="file"/);
});

test("topic analysis action and status copy are localized", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  for (const key of [
    "toolbar.analyzeTopics",
    "toolbar.analyzingTopics",
    "task.analyzeTopics",
    "task.analyzeTopicsDone",
    "task.analyzeTopicsNone",
    "task.analyzeTopicsFailed"
  ]) {
    assert.match(i18nSource, new RegExp(`"${key}":`));
  }

  assert.match(canvasSource, /analyzeTopics/);
  assert.match(canvasSource, /toolbar\.analyzeTopics/);
  assert.match(canvasSource, /task\.analyzeTopicsDone/);
  assert.doesNotMatch(canvasSource, />Analyze Topics</);
  assert.match(i18nSource, /"toolbar\.analyzeTopics": "Analyze Topics"/);
  assert.match(i18nSource, /"toolbar\.analyzeTopics": "分析主题"/);
});

test("link suggestion review panel keeps overflow candidates scrollable", async () => {
  const stylesSource = await readFile(new URL("../src/side-panel/styles.css", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  assert.match(stylesSource, /\.suggestion-panel\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/s);
  assert.match(stylesSource, /\.suggestion-list\s*\{[^}]*min-height:\s*0/s);
  assert.match(stylesSource, /\.suggestion-list\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(i18nSource, /"suggestions\.title": "Link Suggestions"/);
  assert.match(i18nSource, /"suggestions\.title": "链接建议"/);
  assert.doesNotMatch(i18nSource, /"suggestions\.title": "AI Link Suggestions"/);
});

test("link suggestion progress and review actions are visible in the status bar", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  for (const key of [
    "task.suggestLinksRequesting",
    "task.suggestLinksFiltering",
    "suggestions.acceptedStatus",
    "suggestions.acceptedAllStatus",
    "suggestions.rejectedStatus",
    "suggestions.clearedStatus"
  ]) {
    assert.match(i18nSource, new RegExp(`"${key}":`));
    assert.match(canvasSource, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.match(canvasSource, /progress:\s*45/);
  assert.match(canvasSource, /progress:\s*85/);
  assert.doesNotMatch(canvasSource, /pendingSuggestedEdges\.forEach\(\(edge\) => acceptPendingSuggestion/);
});
