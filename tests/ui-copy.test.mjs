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
  const turnNodeSource = await readFile(new URL("../src/side-panel/graph/TurnNode.tsx", import.meta.url), "utf8");

  assert.match(canvasSource, /schemaVersion:\s*4/);
  assert.match(canvasSource, /appearance/);
  assert.match(canvasSource, /loadExportAppearance/);
  assert.match(canvasSource, /normalizeImportedAppearance/);
  assert.match(canvasSource, /applyImportedAppearance/);
  assert.match(canvasSource, /SVG_THEME_COLORS/);
  assert.match(canvasSource, /nodeColorRendering/);
  assert.match(canvasSource, /node\.data\.collapsed/);
  assert.match(canvasSource, /node\.data\.important/);
  assert.match(canvasSource, /function renderMiniMapSvg/);
  assert.match(canvasSource, /calculateMiniMapLayout\(expansion\)/);
  assert.match(canvasSource, /mini-link/);
  assert.match(canvasSource, /mini-text/);
  assert.match(canvasSource, /isSummary && summaryTargets\.has\(link\.target\)/);
  assert.match(canvasSource, /targetEdge - direction \* Math\.min\(16, Math\.max\(8, gap \/ 2\)\)/);
  assert.match(turnNodeSource, /isSummary && summaryTargets\.has\(link\.target\)/);
  assert.match(turnNodeSource, /targetEdge - direction \* Math\.min\(16, Math\.max\(8, gap \/ 2\)\)/);
});

test("expanded answer mini maps keep node-sized coloring in live view and exports", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const turnNodeSource = await readFile(new URL("../src/side-panel/graph/TurnNode.tsx", import.meta.url), "utf8");
  const stylesSource = await readFile(new URL("../src/side-panel/styles.css", import.meta.url), "utf8");

  assert.match(turnNodeSource, /nodeData\.answerExpansion\?\.displayMode === "expanded" \? "is-expanded" : ""/);
  assert.doesNotMatch(stylesSource, /\.turn-node\.is-colored\.is-expanded\s*,[\s\S]*background:\s*var\(--cm-node-bg\);/);
  assert.match(stylesSource, /\.turn-node__mini-node\s*\{[\s\S]*linear-gradient\(135deg, color-mix\(in srgb, var\(--node-accent/);
  assert.match(stylesSource, /:root\[data-turnmap-node-color-render="solid"\]\s+\.turn-node__mini-node\s*\{[\s\S]*background:\s*color-mix\(in srgb, var\(--node-accent/);
  assert.match(turnNodeSource, /className=\{`turn-node__mini-node/);
  assert.match(turnNodeSource, /width:\s*item\.width/);
  assert.match(turnNodeSource, /height:\s*item\.height/);
  assert.match(turnNodeSource, /"--node-accent": colorValue\(miniNode\.color as NodeColorName\)/);
  assert.match(canvasSource, /const miniGradientId = `mini-node-accent-\$\{index\}-\$\{miniIndex\}`/);
  assert.match(canvasSource, /fill="\$\{miniFill\}"/);
  assert.match(canvasSource, /const importantGlow = node\.data\.important && !hasExpandedMiniMap/);
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

test("theme and language defaults follow the browser", async () => {
  const themeSource = await readFile(new URL("../src/side-panel/settings/theme-storage.ts", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");
  const settingsSource = await readFile(new URL("../src/settings-page/main.tsx", import.meta.url), "utf8");

  assert.match(themeSource, /DEFAULT_THEME:\s*ThemeMode\s*=\s*"browser"/);
  assert.match(i18nSource, /DEFAULT_LANGUAGE:\s*LanguageMode\s*=\s*"browser"/);
  assert.match(settingsSource, /settings\.theme\.browser/);
  assert.match(settingsSource, /settings\.language\.browser/);
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

test("edge weight and graph health copy are localized", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const taskLogSource = await readFile(new URL("../src/side-panel/task-log.ts", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  for (const key of ["action.edgeWeight", "task.graphHealthDone"]) {
    assert.match(i18nSource, new RegExp(`"${key}":`));
    assert.match(canvasSource, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.match(canvasSource, /type="range"/);
  assert.match(canvasSource, /updateSelectedEdges\(\{ weight:/);
  assert.match(canvasSource, /updateSelectedEdge\(\{ weight:/);
  assert.match(canvasSource, /healthyGraphSnapshot/);
  assert.match(taskLogSource, /"graph-health"/);
});

test("link connection style setting is localized and defaults to curved edges", async () => {
  const settingsSource = await readFile(new URL("../src/settings-page/main.tsx", import.meta.url), "utf8");
  const uiSettingsSource = await readFile(new URL("../src/side-panel/settings/ui-settings-storage.ts", import.meta.url), "utf8");
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  for (const key of [
    "settings.linkConnectionStyle",
    "settings.linkConnectionStyleCurved",
    "settings.linkConnectionStyleAngled"
  ]) {
    assert.match(i18nSource, new RegExp(`"${key}":`));
    assert.match(settingsSource, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.match(uiSettingsSource, /LinkConnectionStyle = "curved" \| "angled"/);
  assert.match(uiSettingsSource, /normalizeLinkConnectionStyle\(value: unknown\): LinkConnectionStyle/);
  assert.match(uiSettingsSource, /value === "angled" \? "angled" : "curved"/);
  assert.match(canvasSource, /edgeTypeForLinkConnectionStyle/);
  assert.match(canvasSource, /style === "angled" \? "smoothstep" : "default"/);
  assert.match(canvasSource, /loadUiSettings\(\)/);
  assert.match(canvasSource, /activeConnectionStyle = uiSettings\.linkConnectionStyle/);
  assert.match(canvasSource, /applyEdgeStyle\(edge, activeConnectionStyle\)/);
  assert.match(canvasSource, /applyEdgeStyle\([^;]+linkConnectionStyle\)/s);
  assert.match(canvasSource, /setEdges\(\(currentEdges\) => currentEdges\.map\(\(edge\) => applyEdgeStyle\(edge, style\)\)\)/);
});

test("reading and jumping settings are localized and wired to content scripts", async () => {
  const settingsSource = await readFile(new URL("../src/settings-page/main.tsx", import.meta.url), "utf8");
  const storageSource = await readFile(new URL("../src/shared/reading-settings.ts", import.meta.url), "utf8");
  const contentStorageSource = await readFile(new URL("../src/content/reading-settings.ts", import.meta.url), "utf8");
  const smartScrollSource = await readFile(new URL("../src/content/smart-scroll-harvest.ts", import.meta.url), "utf8");
  const jumpSource = await readFile(new URL("../src/content/jump-controller.ts", import.meta.url), "utf8");
  const webAdapterSource = await readFile(new URL("../src/content/web-adapter-core.ts", import.meta.url), "utf8");
  const debugReportSource = await readFile(new URL("../src/side-panel/debug-report.ts", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  for (const key of [
    "settings.readingJumping",
    "settings.scrollSpeedMultiplier",
    "settings.scrollSpeedMultiplierHint",
    "settings.edgeWaitSeconds",
    "settings.edgeWaitSecondsHint",
    "settings.jumpSearchStrength",
    "settings.jumpSearchStrengthHint",
    "settings.restoreReadingDefaults",
    "settings.readingDefaultsRestored",
    "settings.saveReadingJumping",
    "settings.loadingReadingJumping"
  ]) {
    assert.match(i18nSource, new RegExp(`"${key}":`));
    assert.match(settingsSource, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.match(settingsSource, /function edgeWaitSecondsToSliderValue/);
  assert.match(settingsSource, /function edgeWaitSliderValueToSeconds/);
  assert.match(settingsSource, /NumericSliderSetting/);
  assert.match(settingsSource, /READING_BEHAVIOR_DEFAULTS/);
  assert.match(storageSource, /scrollSpeedMultiplier:\s*1/);
  assert.match(storageSource, /edgeWaitSeconds:\s*0\.8/);
  assert.match(storageSource, /jumpSearchStrength:\s*1/);
  assert.match(contentStorageSource, /turnmap\.reading\.scrollSpeedMultiplier/);
  assert.doesNotMatch(smartScrollSource, /\.\.\/shared\/reading-settings/);
  assert.match(smartScrollSource, /settings\?\.scrollSpeedMultiplier/);
  assert.match(smartScrollSource, /settings\?\.edgeWaitSeconds/);
  assert.match(jumpSource, /loadReadingBehaviorSettings/);
  assert.match(jumpSource, /settings\.jumpSearchStrength/);
  assert.match(webAdapterSource, /loadReadingBehaviorSettings/);
  assert.match(debugReportSource, /Scroll speed multiplier/);
  assert.match(debugReportSource, /Edge wait time/);
  assert.match(debugReportSource, /Jump search strength/);
});

test("collapsed node action writes compact automatic dimensions", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");

  assert.match(canvasSource, /function originalContentDimensions/);
  assert.match(canvasSource, /function compactCollapsedDimensions/);
  assert.match(canvasSource, /function expandedContentDimensions/);
  assert.match(canvasSource, /function withContentFittingDimensions/);
  assert.match(canvasSource, /updateNodeExpansion\(nodeId, \(expansion\) => updateMiniNode/);
  assert.match(canvasSource, /withContentFittingDimensions\(node,\s*\{\s*[\s\S]*collapsed: shouldCollapse/);
  assert.match(canvasSource, /withContentFittingDimensions\(node,\s*\{\s*[\s\S]*displayMode/);
  assert.match(canvasSource, /collapsed: shouldCollapse/);
  assert.match(canvasSource, /dimensions/);
});

test("manual node text editing does not auto-resize nodes or leak editor events", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const turnNodeSource = await readFile(new URL("../src/side-panel/graph/TurnNode.tsx", import.meta.url), "utf8");
  const updateStart = canvasSource.indexOf("const updateNodeText = useCallback");
  const updateEnd = canvasSource.indexOf("const updateNodeDimensions = useCallback", updateStart);
  const updateBody = canvasSource.slice(updateStart, updateEnd);

  assert.doesNotMatch(updateBody, /withContentFittingDimensions/);
  assert.match(updateBody, /\.\.\.updates/);
  assert.match(turnNodeSource, /trimmed !== nodeData\[field\]\.trim\(\)/);
  assert.match(turnNodeSource, /const stopEditorEvent/);
  assert.match(turnNodeSource, /className="turn-node__editor turn-node__editor--title nodrag nopan nowheel"/);
  assert.match(turnNodeSource, /className="turn-node__editor nodrag nopan nowheel"/);
  assert.match(turnNodeSource, /onPointerDown=\{stopEditorEvent\}/);
  assert.match(turnNodeSource, /onDoubleClick=\{stopEditorEvent\}/);
});

test("debug panel and running task status use compact multi-row layout", async () => {
  const appSource = await readFile(new URL("../src/side-panel/App.tsx", import.meta.url), "utf8");
  const stylesSource = await readFile(new URL("../src/side-panel/styles.css", import.meta.url), "utf8");

  assert.match(appSource, /const runningTasks = useMemo/);
  assert.match(appSource, /\.filter\(\(entry\) => entry\.status === "running"\)/);
  assert.match(appSource, /\.slice\(0, 3\)/);
  assert.match(appSource, /status-bar--stacked/);
  assert.match(appSource, /debug-panel__grid/);
  assert.match(appSource, /debug-panel__actions/);

  assert.match(stylesSource, /\.status-bar--stacked/);
  assert.match(stylesSource, /\.status-bar__tasks/);
  assert.match(stylesSource, /\.status-bar__task/);
  assert.match(stylesSource, /\.debug-panel__grid/);
  assert.match(stylesSource, /\.debug-panel__item/);
  assert.match(stylesSource, /\.debug-panel__actions/);
});

test("node resize edge hit areas do not enlarge corner handles", async () => {
  const stylesSource = await readFile(new URL("../src/side-panel/styles.css", import.meta.url), "utf8");

  assert.match(
    stylesSource,
    /\.turn-node \.react-flow__resize-control\.line\.left,\s*\.turn-node \.react-flow__resize-control\.line\.right\s*\{\s*width:\s*14px;/s
  );
  assert.match(
    stylesSource,
    /\.turn-node \.react-flow__resize-control\.line\.bottom\s*\{\s*height:\s*22px;/s
  );
  assert.match(
    stylesSource,
    /\.turn-node \.react-flow__resize-control\s*\{[^}]*background:\s*transparent;[^}]*border-color:\s*transparent;[^}]*opacity:\s*0;/s
  );
  assert.match(
    stylesSource,
    /\.turn-node \.react-flow__resize-control\.handle\s*\{[^}]*height:\s*5px;[^}]*width:\s*5px;/s
  );
  assert.doesNotMatch(stylesSource, /\.turn-node:hover \.react-flow__resize-control/);
  assert.doesNotMatch(stylesSource, /\.turn-node\.is-selected \.react-flow__resize-control/);
  assert.doesNotMatch(stylesSource, /\.turn-node \.react-flow__resize-control\.left,\s*\.turn-node \.react-flow__resize-control\.right/s);
  assert.doesNotMatch(stylesSource, /\.turn-node \.react-flow__resize-control\.bottom\s*\{\s*(?:bottom|height):/s);
});

test("layout and color controls use themed menu and persistent swatches", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const stylesSource = await readFile(new URL("../src/side-panel/styles.css", import.meta.url), "utf8");
  const layoutStart = canvasSource.indexOf('<div className="layout-picker">');
  const layoutEnd = canvasSource.indexOf('<button className="button-with-icon" type="button" onClick={suggestLinks}', layoutStart);
  const layoutBody = canvasSource.slice(layoutStart, layoutEnd);

  assert.match(layoutBody, /layout-picker__panel/);
  assert.match(layoutBody, /layout-picker__current/);
  assert.doesNotMatch(layoutBody, /<select/);
  assert.match(canvasSource, /color-swatch-button__preview/);
  assert.match(stylesSource, /\.layout-picker__panel\s*\{[\s\S]*background:\s*var\(--cm-menu-bg\)/);
  assert.match(stylesSource, /\.color-swatch-button__preview\s*\{/);
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
