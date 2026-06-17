import { optimizePromptInput, sanitizePromptOptimizerError } from "../../side-panel/ai/prompt-optimizer";
import {
  loadPromptWorkbenchLibrary,
  savePromptWorkbenchLibrary,
  type PromptApplyMode,
  type PromptItem,
  type PromptWorkbenchLibrary
} from "../../shared/prompt-workbench-storage";
import {
  applySelectionWrapFallback,
  extractPromptTemplateVariables,
  hasPromptTemplateVariables,
  renderPromptTemplate,
  templateUsesSelection,
  type PromptTemplateVariable
} from "../../shared/prompt-template";
import {
  ChatGPTPromptWorkbenchAdapter,
  type PromptEditorTarget,
  type PromptInputState
} from "./chatgpt-adapter";

type WorkbenchView = "actions" | "library" | "variables" | "optimize" | "apply";

const adapter = new ChatGPTPromptWorkbenchAdapter();
const labels = {
  launcher: "Prompt Workbench",
  library: "Prompt library",
  optimize: "Optimize prompt",
  variables: "Variables",
  manage: "Manage prompts",
  selectedText: "Selected text"
};

let launcher: HTMLButtonElement | null = null;
let toolbar: HTMLDivElement | null = null;
let panel: HTMLDivElement | null = null;
let observer: MutationObserver | null = null;
let libraryCache: PromptWorkbenchLibrary | null = null;
let activePrompt: PromptItem | null = null;
let activeVariables: PromptTemplateVariable[] = [];
let pendingRenderedPrompt = "";
let initializationScheduled = false;

function icon(name: "library" | "sparkles" | "braces" | "settings" | "launcher" | "copy" | "insert" | "replace"): string {
  const icons = {
    launcher:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z"/></svg>',
    library: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5Z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
    sparkles:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z"/></svg>',
    braces: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H7a3 3 0 0 0-3 3v2a2 2 0 0 1-2 2 2 2 0 0 1 2 2v2a3 3 0 0 0 3 3h1"/><path d="M16 4h1a3 3 0 0 1 3 3v2a2 2 0 0 0 2 2 2 2 0 0 0-2 2v2a3 3 0 0 1-3 3h-1"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.1 7.1 0 0 0-1.8-1L14.4 3h-4.8l-.4 3.1a7.1 7.1 0 0 0-1.8 1l-2.4-1-2 3.4L5 11a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.1 7.1 0 0 0 1.8 1l.4 3.1h4.8l.4-3.1a7.1 7.1 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>',
    insert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    replace: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10a4 4 0 0 1 0 8H8"/><path d="M8 11l-4 4 4 4"/></svg>'
  };
  return icons[name];
}

function ensureStyle(): void {
  if (document.getElementById("turnmap-prompt-workbench-style")) return;
  const style = document.createElement("style");
  style.id = "turnmap-prompt-workbench-style";
  style.textContent = `
    .turnmap-prompt-workbench-button,
    .turnmap-prompt-workbench-toolbar button,
    .turnmap-prompt-panel button {
      box-sizing: border-box;
      color: inherit;
      font: 500 12px Inter, ui-sans-serif, system-ui, sans-serif;
    }
    .turnmap-prompt-workbench-button {
      align-items: center;
      background: transparent;
      border: 1px solid rgba(125, 132, 150, 0.45);
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      height: 32px;
      justify-content: center;
      margin-inline: 4px;
      padding: 0;
      width: 32px;
    }
    .turnmap-prompt-workbench-button svg,
    .turnmap-prompt-workbench-toolbar svg,
    .turnmap-prompt-panel svg {
      fill: none;
      height: 17px;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.9;
      width: 17px;
    }
    .turnmap-prompt-workbench-toolbar {
      align-items: center;
      background: color-mix(in srgb, Canvas 92%, #6d5dfc 8%);
      border: 1px solid rgba(109, 93, 252, 0.45);
      border-radius: 18px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
      display: flex;
      gap: 3px;
      padding: 4px;
      position: fixed;
      z-index: 2147483600;
    }
    .turnmap-prompt-workbench-toolbar button {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 14px;
      cursor: pointer;
      display: inline-flex;
      height: 30px;
      justify-content: center;
      padding: 0;
      width: 30px;
    }
    .turnmap-prompt-workbench-toolbar button:hover,
    .turnmap-prompt-workbench-button:hover {
      background: rgba(109, 93, 252, 0.12);
    }
    .turnmap-prompt-panel {
      background: color-mix(in srgb, Canvas 96%, #101827 4%);
      border: 1px solid rgba(125, 132, 150, 0.35);
      border-radius: 10px;
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
      color: CanvasText;
      max-height: min(460px, 70vh);
      overflow: auto;
      padding: 10px;
      position: fixed;
      width: 340px;
      z-index: 2147483600;
    }
    .turnmap-prompt-panel input,
    .turnmap-prompt-panel textarea,
    .turnmap-prompt-panel select {
      background: Canvas;
      border: 1px solid rgba(125, 132, 150, 0.35);
      border-radius: 8px;
      color: CanvasText;
      font: 500 12px Inter, ui-sans-serif, system-ui, sans-serif;
      padding: 7px 9px;
      width: 100%;
    }
    .turnmap-prompt-panel textarea {
      min-height: 96px;
      resize: vertical;
    }
    .turnmap-prompt-panel__row {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    .turnmap-prompt-panel__row button,
    .turnmap-prompt-panel__button {
      align-items: center;
      background: rgba(109, 93, 252, 0.12);
      border: 1px solid rgba(109, 93, 252, 0.28);
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      gap: 5px;
      justify-content: center;
      min-height: 30px;
      padding: 6px 8px;
    }
    .turnmap-prompt-item {
      border: 1px solid rgba(125, 132, 150, 0.22);
      border-radius: 8px;
      cursor: pointer;
      margin-top: 7px;
      padding: 8px;
    }
    .turnmap-prompt-item:hover {
      border-color: rgba(109, 93, 252, 0.55);
    }
    .turnmap-prompt-item strong {
      display: block;
      font-size: 12px;
      line-height: 1.35;
    }
    .turnmap-prompt-item p,
    .turnmap-prompt-panel__hint {
      color: color-mix(in srgb, CanvasText 62%, transparent);
      font-size: 11px;
      line-height: 1.45;
      margin: 4px 0 0;
    }
    .turnmap-prompt-panel__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .turnmap-prompt-panel__tags span {
      background: rgba(16, 163, 127, 0.13);
      border-radius: 999px;
      font-size: 10px;
      padding: 2px 6px;
    }
    .turnmap-prompt-panel__preview {
      background: rgba(125, 132, 150, 0.1);
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.45;
      margin-top: 8px;
      max-height: 180px;
      overflow: auto;
      padding: 8px;
      white-space: pre-wrap;
    }
  `;
  document.documentElement.append(style);
}

function compact(text: string, length = 120): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}...` : normalized;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character] ?? character;
  });
}

function button(label: string, iconName: Parameters<typeof icon>[0], onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.title = label;
  element.setAttribute("aria-label", label);
  element.innerHTML = icon(iconName);
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return element;
}

function positionNearAnchor(element: HTMLElement, anchor: HTMLElement, offset = 6): void {
  const rect = anchor.getBoundingClientRect();
  const left = Math.max(8, Math.min(window.innerWidth - element.offsetWidth - 8, rect.left));
  const top = Math.max(8, Math.min(window.innerHeight - element.offsetHeight - 8, rect.top - element.offsetHeight - offset));
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

function ensureLauncher(): HTMLButtonElement {
  if (launcher) return launcher;
  launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "turnmap-prompt-workbench-button";
  launcher.title = labels.launcher;
  launcher.setAttribute("aria-label", labels.launcher);
  launcher.innerHTML = icon("launcher");
  launcher.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleToolbar();
  });
  return launcher;
}

function removeSurfaces(): void {
  toolbar?.remove();
  panel?.remove();
  toolbar = null;
  panel = null;
}

function toggleToolbar(): void {
  if (toolbar) {
    removeSurfaces();
    return;
  }
  showToolbar();
}

function showToolbar(): void {
  if (!launcher) return;
  ensureStyle();
  toolbar = document.createElement("div");
  toolbar.className = "turnmap-prompt-workbench-toolbar";
  toolbar.append(
    button(labels.library, "library", () => void showLibraryPanel()),
    button(labels.optimize, "sparkles", () => void showOptimizePanel()),
    button(labels.variables, "braces", () => showVariablesPanel()),
    button(labels.manage, "settings", openPromptWorkbenchSettings)
  );
  document.body.append(toolbar);
  positionNearAnchor(toolbar, launcher, 4);
}

function ensurePanel(view: WorkbenchView): HTMLDivElement {
  if (!launcher) throw new Error("Prompt workbench launcher is missing.");
  panel?.remove();
  panel = document.createElement("div");
  panel.className = `turnmap-prompt-panel turnmap-prompt-panel--${view}`;
  document.body.append(panel);
  positionNearAnchor(panel, launcher, 42);
  return panel;
}

async function loadLibrary(): Promise<PromptWorkbenchLibrary> {
  libraryCache = await loadPromptWorkbenchLibrary();
  return libraryCache;
}

function sortedPrompts(library: PromptWorkbenchLibrary): PromptItem[] {
  return [...library.prompts]
    .filter((prompt) => prompt.enabled)
    .sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      const recentDelta = (right.lastUsedAt ?? 0) - (left.lastUsedAt ?? 0);
      if (recentDelta !== 0) return recentDelta;
      return left.sortOrder - right.sortOrder;
    });
}

async function showLibraryPanel(): Promise<void> {
  const library = await loadLibrary();
  const root = ensurePanel("library");
  root.innerHTML = `
    <input type="search" aria-label="Search prompts" placeholder="Search prompts..." />
    <div class="turnmap-prompt-panel__hint">Pinned, recent, and folder prompts are searched together.</div>
    <div data-list></div>
  `;
  const search = root.querySelector<HTMLInputElement>("input");
  const list = root.querySelector<HTMLElement>("[data-list]");
  const render = () => {
    if (!list) return;
    const query = search?.value.trim().toLowerCase() ?? "";
    const prompts = sortedPrompts(library).filter((prompt) => {
      const haystack = `${prompt.title} ${prompt.content} ${prompt.tags.join(" ")}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    list.textContent = "";
    for (const prompt of prompts) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "turnmap-prompt-item";
      item.setAttribute("aria-label", prompt.title);
      item.innerHTML = `
        <strong>${escapeHtml(prompt.pinned ? `* ${prompt.title}` : prompt.title)}</strong>
        <p>${escapeHtml(compact(prompt.content))}</p>
        <div class="turnmap-prompt-panel__tags">${prompt.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      `;
      item.addEventListener("click", () => void choosePrompt(prompt));
      list.append(item);
    }
  };
  search?.addEventListener("input", render);
  render();
  setTimeout(() => search?.focus(), 30);
}

function promptModeFromSmart(state: PromptInputState, configured: PromptApplyMode): Exclude<PromptApplyMode, "smart"> | "choose" {
  if (configured !== "smart") return configured;
  if (!state.text.trim()) return "insert";
  if (state.selectedText.trim()) return "wrapSelection";
  return "choose";
}

async function choosePrompt(prompt: PromptItem): Promise<void> {
  activePrompt = prompt;
  activeVariables = extractPromptTemplateVariables(prompt.content);
  if (activeVariables.length > 0) {
    showVariablesPanel();
    return;
  }
  await applyPrompt(prompt, {});
}

async function applyPrompt(prompt: PromptItem, values: Record<string, string>): Promise<void> {
  const target = adapter.findEditor();
  if (!target) return;
  const library = libraryCache ?? (await loadLibrary());
  const input = adapter.readInput(target);
  const rendered = renderPromptTemplate(prompt.content, values, { input: input.text, selection: input.selectedText });
  if (!rendered.ok) {
    activePrompt = prompt;
    activeVariables = extractPromptTemplateVariables(prompt.content);
    showVariablesPanel(rendered.missingVariables);
    return;
  }

  pendingRenderedPrompt =
    input.selectedText.trim() && !templateUsesSelection(prompt.content)
      ? applySelectionWrapFallback(rendered.text, input.selectedText, labels.selectedText)
      : rendered.text;
  const mode = promptModeFromSmart(input, library.settings.defaultApplyMode);
  if (mode === "choose") {
    showApplyChoicePanel(prompt, target);
    return;
  }

  completePromptApplication(prompt, target, mode);
}

async function completePromptApplication(
  prompt: PromptItem,
  target: PromptEditorTarget,
  mode: Exclude<PromptApplyMode, "smart">
): Promise<void> {
  if (!adapter.writeInput(target, { text: pendingRenderedPrompt, mode })) return;
  const library = libraryCache ?? (await loadLibrary());
  library.prompts = library.prompts.map((item) =>
    item.id === prompt.id
      ? {
          ...item,
          useCount: item.useCount + 1,
          lastUsedAt: Date.now(),
          updatedAt: Date.now()
        }
      : item
  );
  await savePromptWorkbenchLibrary(library);
  libraryCache = library;
  removeSurfaces();
  target.element.focus();
}

function showApplyChoicePanel(prompt: PromptItem, target: PromptEditorTarget): void {
  const root = ensurePanel("apply");
  root.innerHTML = `
    <strong>${escapeHtml(prompt.title)}</strong>
    <p class="turnmap-prompt-panel__hint">Choose how to apply this prompt to the current input.</p>
    <div class="turnmap-prompt-panel__preview">${escapeHtml(pendingRenderedPrompt)}</div>
    <div class="turnmap-prompt-panel__row"></div>
  `;
  const row = root.querySelector<HTMLElement>(".turnmap-prompt-panel__row");
  row?.append(
    actionButton("Insert", "insert", () => void completePromptApplication(prompt, target, "insert")),
    actionButton("Append", "insert", () => void completePromptApplication(prompt, target, "append")),
    actionButton("Replace", "replace", () => void completePromptApplication(prompt, target, "replace"))
  );
}

function actionButton(label: string, iconName: Parameters<typeof icon>[0], onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.innerHTML = `${icon(iconName)}<span>${escapeHtml(label)}</span>`;
  element.title = label;
  element.setAttribute("aria-label", label);
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return element;
}

function showVariablesPanel(missingVariables: string[] = []): void {
  const root = ensurePanel("variables");
  if (!activePrompt) {
    root.innerHTML = `<p class="turnmap-prompt-panel__hint">Select a prompt with variables first.</p>`;
    return;
  }

  const variables = activeVariables.length > 0 ? activeVariables : extractPromptTemplateVariables(activePrompt.content);
  root.innerHTML = `
    <strong>${escapeHtml(activePrompt.title)}</strong>
    <div data-fields></div>
    <div class="turnmap-prompt-panel__preview" data-preview></div>
    <div class="turnmap-prompt-panel__row">
      <button type="button" data-apply>${icon("insert")}<span>Apply</span></button>
    </div>
  `;
  const fields = root.querySelector<HTMLElement>("[data-fields]");
  const preview = root.querySelector<HTMLElement>("[data-preview]");
  const values: Record<string, string> = {};
  for (const variable of variables) {
    values[variable.name] = variable.defaultValue;
    const label = document.createElement("label");
    label.innerHTML = `${escapeHtml(variable.name)}${variable.required ? " *" : ""}<input data-variable="${escapeHtml(
      variable.name
    )}" value="${escapeHtml(variable.defaultValue)}" />`;
    fields?.append(label);
  }
  const renderPreview = () => {
    root.querySelectorAll<HTMLInputElement>("[data-variable]").forEach((input) => {
      values[input.dataset.variable ?? ""] = input.value;
    });
    const target = adapter.findEditor();
    const inputState = target ? adapter.readInput(target) : { text: "", selectedText: "" };
    const rendered = renderPromptTemplate(activePrompt!.content, values, {
      input: inputState.text,
      selection: inputState.selectedText
    });
    if (preview) {
      preview.textContent = rendered.text || (missingVariables.length > 0 ? `Missing: ${missingVariables.join(", ")}` : "");
    }
  };
  root.querySelectorAll<HTMLInputElement>("[data-variable]").forEach((input) => input.addEventListener("input", renderPreview));
  root.querySelector<HTMLButtonElement>("[data-apply]")?.addEventListener("click", () => {
    void applyPrompt(activePrompt!, values);
  });
  renderPreview();
}

async function showOptimizePanel(): Promise<void> {
  const target = adapter.findEditor();
  const root = ensurePanel("optimize");
  if (!target) {
    root.innerHTML = `<p class="turnmap-prompt-panel__hint">Could not find the ChatGPT input box.</p>`;
    return;
  }
  const input = adapter.readInput(target).text.trim();
  if (!input) {
    root.innerHTML = `<p class="turnmap-prompt-panel__hint">Write something first, then optimize it.</p>`;
    return;
  }

  const library = await loadLibrary();
  root.innerHTML = `<p class="turnmap-prompt-panel__hint">Optimizing current input...</p>`;
  try {
    const result = await optimizePromptInput({
      input,
      format: library.settings.aiOptimizeFormat,
      optimizerPrompts: library.optimizerPrompts
    });
    if (!library.settings.aiOptimizePreview && library.settings.aiOptimizeFormat === "simple-polish") {
      adapter.writeInput(target, { text: result, mode: "replace" });
      removeSurfaces();
      return;
    }
    renderOptimizeResult(root, target, result, library.settings.aiOptimizeFormat);
  } catch (error) {
    root.innerHTML = `
      <p class="turnmap-prompt-panel__hint">AI optimization failed.</p>
      <details><summary>Error details</summary><pre class="turnmap-prompt-panel__preview">${escapeHtml(
        sanitizePromptOptimizerError(error)
      )}</pre></details>
      <div class="turnmap-prompt-panel__row"><button type="button" data-settings>${icon("settings")}<span>Open AI settings</span></button></div>
    `;
    root.querySelector<HTMLButtonElement>("[data-settings]")?.addEventListener("click", openPromptWorkbenchSettings);
  }
}

function renderOptimizeResult(
  root: HTMLElement,
  target: PromptEditorTarget,
  result: string,
  format: "simple-polish" | "strict-planning"
): void {
  const title = format === "strict-planning" ? "Strict planning suggestions" : "Optimized prompt";
  root.innerHTML = `
    <strong>${title}</strong>
    <div class="turnmap-prompt-panel__preview">${escapeHtml(result)}</div>
    <div class="turnmap-prompt-panel__row"></div>
  `;
  const row = root.querySelector<HTMLElement>(".turnmap-prompt-panel__row");
  row?.append(
    actionButton("Copy", "copy", () => void navigator.clipboard?.writeText(result)),
    actionButton("Insert", "insert", () => adapter.writeInput(target, { text: result, mode: "insert" })),
    actionButton("Replace", "replace", () => adapter.writeInput(target, { text: result, mode: "replace" }))
  );
}

function openPromptWorkbenchSettings(): void {
  void chrome.runtime.sendMessage({ type: "TURNMAP_OPEN_SETTINGS" }).catch(() => undefined);
}

function scheduleInitialize(): void {
  if (initializationScheduled) return;
  initializationScheduled = true;
  window.setTimeout(() => {
    initializationScheduled = false;
    void initializePromptWorkbench();
  }, 300);
}

async function initializePromptWorkbench(): Promise<void> {
  if (!adapter.matches()) return;
  const library = await loadLibrary();
  libraryCache = library;
  if (!library.settings.enabled) return;
  const mountPoint = adapter.findMountPoint();
  const editor = adapter.findEditor();
  if (!mountPoint || !editor) return;
  ensureStyle();
  adapter.mountLauncher(mountPoint, ensureLauncher());
  observer?.disconnect();
  observer = adapter.createObserver(scheduleInitialize);
}

export function startPromptWorkbench(): void {
  void initializePromptWorkbench();
  document.addEventListener("click", (event) => {
    if (!panel && !toolbar) return;
    const target = event.target as Element | null;
    if (target?.closest(".turnmap-prompt-workbench-toolbar, .turnmap-prompt-panel, .turnmap-prompt-workbench-button")) return;
    removeSurfaces();
  });
}
