import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("empty map copy is site-neutral for multi-site adapters", async () => {
  const canvasSource = await readFile(new URL("../src/side-panel/graph/TurnMapCanvas.tsx", import.meta.url), "utf8");
  const i18nSource = await readFile(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");

  assert.doesNotMatch(canvasSource, /Open a ChatGPT conversation/);
  assert.match(canvasSource, /Open a supported AI conversation with at least one complete answer\./);
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
