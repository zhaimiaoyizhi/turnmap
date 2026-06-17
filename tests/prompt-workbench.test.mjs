import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_PROMPT_WORKBENCH_SETTINGS,
  createDefaultPromptWorkbenchLibrary,
  exportPromptWorkbenchBackup,
  importPromptWorkbenchBackup,
  normalizePromptWorkbenchLibrary
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
  assert.ok(library.prompts.every((prompt) => /harness|acceptance|reproducible|checks/i.test(prompt.content)));

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

test("prompt workbench migrates untouched old built-in prompts to English harness defaults", () => {
  const oldTranslation =
    "Translate the following content into {{language=English}}. Preserve terminology, formatting, code blocks, and proper nouns. If a phrase is ambiguous, keep the original in parentheses.\n\n{{input}}";
  const oldSimpleOptimizer =
    "You are an experienced prompt engineer. Rewrite the user's current input into a clearer prompt while preserving their intent, language, constraints, and tone. Return only the final improved prompt. Clarify the goal, input materials, expected output, boundaries, priorities, and acceptance criteria when they are implied. Do not invent unrelated requirements.";
  const oldStrictOptimizer =
    "You are an experienced prompt engineer and product-minded technical planner. Analyze only the user's current input. Return a Markdown table with columns: | 项目 | 当前判断 | 需要你补充/修改 |. Cover 目标, 输入材料, 期望输出, 边界限制, 技术路线, 验收标准, 风险点, 仍需确认. Mark each judgment as Provided, Suggested, Missing, or Confirm. You may suggest a direction, but never present inferred requirements as user-provided facts.";
  const library = createDefaultPromptWorkbenchLibrary({ now: 1000, idFactory: idFactory() });
  const oldLibrary = {
    ...library,
    optimizerPrompts: {
      simplePolish: oldSimpleOptimizer,
      strictPlanning: oldStrictOptimizer
    },
    prompts: library.prompts.map((prompt) =>
      prompt.title === "Translation" ? { ...prompt, content: oldTranslation, tags: ["translation"] } : prompt
    )
  };

  const migrated = normalizePromptWorkbenchLibrary(oldLibrary, { now: 2000 });
  const translation = migrated.prompts.find((prompt) => prompt.title === "Translation");

  assert.match(translation?.content ?? "", /translation harness engineer/i);
  assert.deepEqual(translation?.tags, ["translation", "harness"]);
  assert.match(migrated.optimizerPrompts.simplePolish, /harness engineer/i);
  assert.match(migrated.optimizerPrompts.strictPlanning, /Harness \/ acceptance check/i);
});

test("prompt workbench migration preserves user-edited built-in prompts", () => {
  const library = createDefaultPromptWorkbenchLibrary({ now: 1000, idFactory: idFactory() });
  const edited = {
    ...library,
    optimizerPrompts: {
      simplePolish: "My custom optimizer prompt.",
      strictPlanning: "My custom strict planner."
    },
    prompts: library.prompts.map((prompt) =>
      prompt.title === "Translation" ? { ...prompt, content: "My custom translation prompt.", tags: ["mine"] } : prompt
    )
  };

  const normalized = normalizePromptWorkbenchLibrary(edited, { now: 2000 });
  const translation = normalized.prompts.find((prompt) => prompt.title === "Translation");

  assert.equal(translation?.content, "My custom translation prompt.");
  assert.deepEqual(translation?.tags, ["mine"]);
  assert.equal(normalized.optimizerPrompts.simplePolish, "My custom optimizer prompt.");
  assert.equal(normalized.optimizerPrompts.strictPlanning, "My custom strict planner.");
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
  assert.match(DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT, /harness engineer/i);
  assert.match(DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT, /Markdown table/i);
  assert.match(DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT, /Harness \/ acceptance check/i);
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
  assert.match(strict.messages[0].content, /goal|input materials|desired output|boundaries|technical route|verification harness/i);
  assert.match(
    strict.messages[0].content,
    /\| Area \| Current interpretation \| User needs to fill or confirm \| Harness \/ acceptance check \|/
  );
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

test("ChatGPT prompt workbench can anchor to the current compact plus button", () => {
  const source = readFileSync(new URL("../src/content/prompt-workbench/chatgpt-adapter.ts", import.meta.url), "utf8");

  assert.match(source, /findFallbackComposerButton/);
  assert.match(source, /isRejectedComposerButton/);
  assert.match(source, /text\.trim\(\) === "\+"/);
  assert.match(source, /add|attach|upload|file|添加|上传|附件/i);
  assert.match(source, /send|submit|voice|microphone|dictation|model/i);
});

test("prompt workbench keeps watching when the ChatGPT composer mounts after document idle", () => {
  const source = readFileSync(new URL("../src/content/prompt-workbench/index.ts", import.meta.url), "utf8");

  assert.match(source, /ensurePromptWorkbenchObserver/);
  assert.match(source, /observer = adapter\.createObserver\(scheduleInitialize\)/);
  assert.match(source, /ensurePromptWorkbenchObserver\(\);\s+const mountPoint = adapter\.findMountPoint\(\);/);
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

test("prompt workbench keeps the content script self-contained for classic Chrome injection", () => {
  const viteSource = readFileSync(new URL("../vite.content.config.ts", import.meta.url), "utf8");
  const packageScript = readFileSync(new URL("../scripts/package-extension.mjs", import.meta.url), "utf8");

  assert.match(viteSource, /inlineDynamicImports:\s*true/);
  assert.match(viteSource, /src\/content\/index\.ts/);
  assert.match(packageScript, /Content script bundle must be self-contained/);
});
