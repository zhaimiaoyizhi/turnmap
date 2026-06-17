import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_PROMPT_WORKBENCH_SETTINGS,
  createDefaultPromptWorkbenchLibrary,
  exportPromptWorkbenchBackup,
  importPromptWorkbenchBackup
} from "../src/shared/prompt-workbench-storage.ts";
import {
  applySelectionWrapFallback,
  extractPromptTemplateVariables,
  renderPromptTemplate
} from "../src/shared/prompt-template.ts";
import {
  DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT,
  DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT,
  buildPromptOptimizationMessages
} from "../src/side-panel/ai/prompt-optimizer.ts";

function idFactory() {
  let next = 0;
  return (prefix = "id") => `${prefix}-${(next += 1)}`;
}

test("prompt workbench seeds editable local examples without storing API secrets", () => {
  const library = createDefaultPromptWorkbenchLibrary({ now: 1000, idFactory: idFactory() });

  assert.equal(library.schemaVersion, 1);
  assert.deepEqual(library.settings, DEFAULT_PROMPT_WORKBENCH_SETTINGS);
  assert.equal(library.settings.enabled, true);
  assert.equal(library.settings.aiOptimizePreview, true);
  assert.equal(library.settings.aiOptimizeFormat, "simple-polish");

  const examplesFolder = library.folders.find((folder) => folder.name === "Examples");
  assert.ok(examplesFolder);
  assert.deepEqual(
    library.prompts.map((prompt) => prompt.title),
    ["Translation", "Project planning", "Literature search", "Document formatting", "Bug reproduction"]
  );
  assert.ok(library.prompts.every((prompt) => prompt.folderId === examplesFolder.id));
  assert.ok(library.prompts.every((prompt) => prompt.enabled && prompt.createdAt === 1000 && prompt.updatedAt === 1000));

  const backup = exportPromptWorkbenchBackup(library, { now: 2000 });
  const serialized = JSON.stringify(backup);
  assert.equal(backup.app, "TurnMap");
  assert.equal(backup.kind, "prompt-workbench");
  assert.equal(backup.exportedAt, 2000);
  assert.doesNotMatch(serialized, /apiKey|sk-|currentInput|conversationText/i);
});

test("prompt workbench import matches prompts by title and keeps local ids on overwrite", () => {
  const makeId = idFactory();
  const current = createDefaultPromptWorkbenchLibrary({ now: 1000, idFactory: makeId });
  const translation = current.prompts.find((prompt) => prompt.title === "Translation");
  assert.ok(translation);

  const backup = exportPromptWorkbenchBackup(
    {
      ...current,
      prompts: [
        {
          ...translation,
          id: "foreign-id",
          content: "Updated imported translation prompt",
          tags: ["imported"],
          updatedAt: 3000
        },
        {
          ...translation,
          id: "new-foreign-id",
          title: "New imported prompt",
          content: "A new prompt from a backup.",
          updatedAt: 3000
        }
      ]
    },
    { now: 4000 }
  );

  const merged = importPromptWorkbenchBackup(current, backup, {
    mode: "merge",
    titleConflict: "overwrite",
    importOptimizerPrompts: false,
    now: 5000,
    idFactory: makeId
  });

  const overwritten = merged.library.prompts.find((prompt) => prompt.title === "Translation");
  const added = merged.library.prompts.find((prompt) => prompt.title === "New imported prompt");

  assert.equal(overwritten?.id, translation.id);
  assert.equal(overwritten?.content, "Updated imported translation prompt");
  assert.equal(added?.id.startsWith("prm-"), true);
  assert.notEqual(added?.id, "new-foreign-id");
  assert.deepEqual(merged.summary, { added: 1, updated: 1, skipped: 0 });
});

test("prompt template variables support defaults, required values, input, and selection", () => {
  const variables = extractPromptTemplateVariables(
    "Act as {{role=senior engineer}}. Finish {{task}} for {{audience}}. Use {{input}} and {{selection}}. Repeat {{task}}."
  );

  assert.deepEqual(variables, [
    { name: "role", defaultValue: "senior engineer", required: false },
    { name: "task", defaultValue: "", required: true },
    { name: "audience", defaultValue: "", required: true }
  ]);

  const rendered = renderPromptTemplate(
    "Act as {{role=senior engineer}}. Finish {{task}} for {{audience}}. Draft: {{input}}. Selected: {{selection}}.",
    { task: "the feature", audience: "developers" },
    { input: "rough input", selection: "selected text" }
  );

  assert.equal(rendered.ok, true);
  assert.equal(
    rendered.text,
    "Act as senior engineer. Finish the feature for developers. Draft: rough input. Selected: selected text."
  );

  const missing = renderPromptTemplate("Finish {{task}} for {{audience}}.", { task: "the feature" });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.missingVariables, ["audience"]);

  assert.equal(
    applySelectionWrapFallback("Improve this request.", "Fix the jump bug", "Selected text"),
    "Improve this request.\n\nSelected text:\nFix the jump bug"
  );
});

test("prompt optimizer builds current-input-only requests for both formats", () => {
  assert.match(DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT, /experienced prompt engineer/i);
  assert.match(DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT, /Markdown table/i);
  assert.match(DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT, /Provided|Suggested|Missing|Confirm/i);

  const simple = buildPromptOptimizationMessages({
    input: "make this clearer",
    format: "simple-polish",
    optimizerPrompts: {
      simplePolish: DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT,
      strictPlanning: DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT
    }
  });
  assert.equal(simple.options.temperature, 0.2);
  assert.equal(simple.options.maxTokens, 1200);
  assert.equal(simple.messages.at(-1)?.content, "make this clearer");
  assert.doesNotMatch(JSON.stringify(simple), /conversation|assistant answer|turns/i);

  const strict = buildPromptOptimizationMessages({
    input: "plan a prompt workbench",
    format: "strict-planning",
    optimizerPrompts: {
      simplePolish: DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT,
      strictPlanning: DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT
    }
  });
  assert.match(strict.messages[0].content, /目标|输入|输出|边界|技术路线|验收标准/);
  assert.match(strict.messages[0].content, /\| 项目 \| 当前判断 \| 需要你补充\/修改 \|/);
});

test("ChatGPT prompt workbench adapter follows the my-prompt style boundary strategy", () => {
  const source = readFileSync(new URL("../src/content/prompt-workbench/chatgpt-adapter.ts", import.meta.url), "utf8");

  assert.match(source, /class ChatGPTPromptWorkbenchAdapter/);
  assert.match(source, /#prompt-textarea/);
  assert.match(source, /composer-plus-btn/);
  assert.match(source, /data-testid="composer-plus-btn"/);
  assert.match(source, /findMountPoint/);
  assert.match(source, /isComposerEditor/);
  assert.match(source, /data-testid", "turnmap-prompt-workbench-launcher"/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /InputEvent\("beforeinput"/);
  assert.match(source, /InputEvent\("input"/);
  assert.doesNotMatch(source, /send-button|composer-submit-button|autoExecute/);
});

test("prompt workbench is wired into content and settings surfaces with i18n", () => {
  const contentSource = readFileSync(new URL("../src/content/index.ts", import.meta.url), "utf8");
  const settingsSource = readFileSync(new URL("../src/settings-page/main.tsx", import.meta.url), "utf8");
  const i18nSource = readFileSync(new URL("../src/side-panel/i18n/i18n-storage.ts", import.meta.url), "utf8");
  const packageSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");

  assert.match(contentSource, /startPromptWorkbench/);
  assert.match(settingsSource, /PromptWorkbenchSettingsPanel/);
  assert.match(i18nSource, /promptWorkbench\.title/);
  assert.match(i18nSource, /promptWorkbench\.action\.optimize/);
  assert.match(i18nSource, /promptWorkbench\.aria\.launcher/);
  assert.match(packageSource, /"version": "0\.8\.1"/);
});
