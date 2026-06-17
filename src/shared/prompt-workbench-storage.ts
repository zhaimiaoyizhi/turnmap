export type PromptApplyMode = "smart" | "insert" | "append" | "replace" | "wrapSelection";
export type PromptWorkbenchPanelSide = "auto" | "left" | "right";
export type PromptOptimizeFormat = "simple-polish" | "strict-planning";

export type PromptWorkbenchSettings = {
  enabled: boolean;
  aiOptimizePreview: boolean;
  aiOptimizeFormat: PromptOptimizeFormat;
  defaultApplyMode: PromptApplyMode;
  panelSide: PromptWorkbenchPanelSide;
};

export type PromptOptimizerPrompts = {
  simplePolish: string;
  strictPlanning: string;
};

export type PromptFolder = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type PromptItem = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  enabled: boolean;
  pinned: boolean;
  sortOrder: number;
  useCount: number;
  lastUsedAt: number | null;
  createdAt: number;
  updatedAt: number;
  note?: string;
};

export type PromptWorkbenchLibrary = {
  schemaVersion: 1;
  folders: PromptFolder[];
  prompts: PromptItem[];
  settings: PromptWorkbenchSettings;
  optimizerPrompts: PromptOptimizerPrompts;
  examplesSeeded: boolean;
};

export type PromptWorkbenchBackup = {
  schemaVersion: 1;
  app: "TurnMap";
  kind: "prompt-workbench";
  exportedAt: number;
  folders: PromptFolder[];
  prompts: PromptItem[];
  settings: PromptWorkbenchSettings;
  optimizerPrompts: PromptOptimizerPrompts;
};

export type PromptWorkbenchImportOptions = {
  mode: "merge" | "replace";
  titleConflict?: "overwrite" | "skip";
  importSettings?: boolean;
  importOptimizerPrompts?: boolean;
  now?: number;
  idFactory?: IdFactory;
};

export type PromptWorkbenchImportSummary = {
  added: number;
  updated: number;
  skipped: number;
};

export type PromptWorkbenchImportResult = {
  library: PromptWorkbenchLibrary;
  summary: PromptWorkbenchImportSummary;
};

type IdFactory = (prefix?: string) => string;

export const PROMPT_WORKBENCH_STORAGE_KEY = "turnmap.promptWorkbench";
export const PROMPT_WORKBENCH_SCHEMA_VERSION = 1;

export const DEFAULT_PROMPT_WORKBENCH_SETTINGS: PromptWorkbenchSettings = {
  enabled: true,
  aiOptimizePreview: true,
  aiOptimizeFormat: "simple-polish",
  defaultApplyMode: "smart",
  panelSide: "auto"
};

export const DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT =
  "You are an experienced prompt engineer. Rewrite the user's current input into a clearer prompt while preserving their intent, language, constraints, and tone. Return only the final improved prompt. Clarify the goal, input materials, expected output, boundaries, priorities, and acceptance criteria when they are implied. Do not invent unrelated requirements.";

export const DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT =
  "You are an experienced prompt engineer and product-minded technical planner. Analyze only the user's current input. Return a Markdown table with columns: | 项目 | 当前判断 | 需要你补充/修改 |. Cover 目标, 输入材料, 期望输出, 边界限制, 技术路线, 验收标准, 风险点, 仍需确认. Mark each judgment as Provided, Suggested, Missing, or Confirm. You may suggest a direction, but never present inferred requirements as user-provided facts.";

export const DEFAULT_OPTIMIZER_PROMPTS: PromptOptimizerPrompts = {
  simplePolish: DEFAULT_SIMPLE_POLISH_OPTIMIZER_PROMPT,
  strictPlanning: DEFAULT_STRICT_PLANNING_OPTIMIZER_PROMPT
};

const EXAMPLE_PROMPTS: Array<Pick<PromptItem, "title" | "content" | "tags" | "note">> = [
  {
    title: "Translation",
    content:
      "Translate the following content into {{language=English}}. Preserve terminology, formatting, code blocks, and proper nouns. If a phrase is ambiguous, keep the original in parentheses.\n\n{{input}}",
    tags: ["translation"],
    note: "Translate while preserving structure."
  },
  {
    title: "Project planning",
    content:
      "Act as an experienced product manager and technical lead. Turn the following idea into a scoped project plan with goals, non-goals, modules, milestones, risks, and acceptance criteria.\n\n{{input}}",
    tags: ["planning"],
    note: "Convert a rough idea into an executable plan."
  },
  {
    title: "Literature search",
    content:
      "Help me design a literature search plan for {{topic}}. Include keywords, inclusion criteria, exclusion criteria, target databases, screening steps, and a synthesis outline.",
    tags: ["research"],
    note: "Prepare academic search strategy."
  },
  {
    title: "Document formatting",
    content:
      "Improve the structure and formatting of the following document. Keep the original meaning, make headings clearer, fix list hierarchy, and return an editable Markdown version.\n\n{{input}}",
    tags: ["writing"],
    note: "Clean up document structure."
  },
  {
    title: "Bug reproduction",
    content:
      "Convert this bug report into a clear reproduction report with environment, steps to reproduce, expected result, actual result, suspected area, missing evidence, and verification commands.\n\n{{input}}",
    tags: ["debug"],
    note: "Make bug reports actionable."
  }
];

function nowOrDefault(now?: number): number {
  return typeof now === "number" && Number.isFinite(now) ? now : Date.now();
}

export function createPromptWorkbenchId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeId(idFactory: IdFactory | undefined, prefix: string): string {
  return idFactory ? idFactory(prefix) : createPromptWorkbenchId(prefix);
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((tag) => normalizeString(tag))
        .filter(Boolean)
        .map((tag) => tag.slice(0, 48))
    )
  );
}

export function createDefaultPromptWorkbenchLibrary(options: { now?: number; idFactory?: IdFactory } = {}): PromptWorkbenchLibrary {
  const timestamp = nowOrDefault(options.now);
  const examplesFolder: PromptFolder = {
    id: makeId(options.idFactory, "fld"),
    name: "Examples",
    sortOrder: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const prompts = EXAMPLE_PROMPTS.map((prompt, index): PromptItem => ({
    id: makeId(options.idFactory, "prm"),
    title: prompt.title,
    content: prompt.content,
    folderId: examplesFolder.id,
    tags: prompt.tags,
    enabled: true,
    pinned: false,
    sortOrder: index,
    useCount: 0,
    lastUsedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    note: prompt.note
  }));

  return {
    schemaVersion: PROMPT_WORKBENCH_SCHEMA_VERSION,
    folders: [examplesFolder],
    prompts,
    settings: { ...DEFAULT_PROMPT_WORKBENCH_SETTINGS },
    optimizerPrompts: { ...DEFAULT_OPTIMIZER_PROMPTS },
    examplesSeeded: true
  };
}

export function normalizePromptWorkbenchSettings(value: unknown): PromptWorkbenchSettings {
  const source = value && typeof value === "object" ? (value as Partial<PromptWorkbenchSettings>) : {};
  const aiOptimizeFormat =
    source.aiOptimizeFormat === "strict-planning" || source.aiOptimizeFormat === "simple-polish"
      ? source.aiOptimizeFormat
      : DEFAULT_PROMPT_WORKBENCH_SETTINGS.aiOptimizeFormat;
  const defaultApplyMode: PromptApplyMode =
    source.defaultApplyMode === "insert" ||
    source.defaultApplyMode === "append" ||
    source.defaultApplyMode === "replace" ||
    source.defaultApplyMode === "wrapSelection" ||
    source.defaultApplyMode === "smart"
      ? source.defaultApplyMode
      : DEFAULT_PROMPT_WORKBENCH_SETTINGS.defaultApplyMode;
  const panelSide: PromptWorkbenchPanelSide =
    source.panelSide === "left" || source.panelSide === "right" || source.panelSide === "auto"
      ? source.panelSide
      : DEFAULT_PROMPT_WORKBENCH_SETTINGS.panelSide;

  return {
    enabled: source.enabled !== false,
    aiOptimizePreview: source.aiOptimizePreview !== false,
    aiOptimizeFormat,
    defaultApplyMode,
    panelSide
  };
}

function normalizeFolder(value: unknown, index: number, options: { now: number; idFactory?: IdFactory }): PromptFolder | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<PromptFolder>;
  const name = normalizeString(source.name);
  if (!name) return null;
  return {
    id: normalizeString(source.id) || makeId(options.idFactory, "fld"),
    name,
    sortOrder: Number.isFinite(source.sortOrder) ? Number(source.sortOrder) : index,
    createdAt: Number.isFinite(source.createdAt) ? Number(source.createdAt) : options.now,
    updatedAt: Number.isFinite(source.updatedAt) ? Number(source.updatedAt) : options.now
  };
}

function normalizePrompt(
  value: unknown,
  index: number,
  validFolderIds: Set<string>,
  options: { now: number; idFactory?: IdFactory }
): PromptItem | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<PromptItem>;
  const title = normalizeString(source.title);
  const content = normalizeString(source.content);
  if (!title || !content) return null;
  const folderId = source.folderId && validFolderIds.has(source.folderId) ? source.folderId : null;
  return {
    id: normalizeString(source.id) || makeId(options.idFactory, "prm"),
    title,
    content,
    folderId,
    tags: normalizeTags(source.tags),
    enabled: source.enabled !== false,
    pinned: Boolean(source.pinned),
    sortOrder: Number.isFinite(source.sortOrder) ? Number(source.sortOrder) : index,
    useCount: Number.isFinite(source.useCount) ? Math.max(0, Number(source.useCount)) : 0,
    lastUsedAt: Number.isFinite(source.lastUsedAt) ? Number(source.lastUsedAt) : null,
    createdAt: Number.isFinite(source.createdAt) ? Number(source.createdAt) : options.now,
    updatedAt: Number.isFinite(source.updatedAt) ? Number(source.updatedAt) : options.now,
    note: normalizeString(source.note) || undefined
  };
}

export function normalizeOptimizerPrompts(value: unknown): PromptOptimizerPrompts {
  const source = value && typeof value === "object" ? (value as Partial<PromptOptimizerPrompts>) : {};
  return {
    simplePolish: normalizeString(source.simplePolish) || DEFAULT_OPTIMIZER_PROMPTS.simplePolish,
    strictPlanning: normalizeString(source.strictPlanning) || DEFAULT_OPTIMIZER_PROMPTS.strictPlanning
  };
}

export function normalizePromptWorkbenchLibrary(
  value: unknown,
  options: { now?: number; idFactory?: IdFactory } = {}
): PromptWorkbenchLibrary {
  const timestamp = nowOrDefault(options.now);
  if (!value || typeof value !== "object") {
    return createDefaultPromptWorkbenchLibrary({ now: timestamp, idFactory: options.idFactory });
  }
  const source = value as Partial<PromptWorkbenchLibrary>;
  const folders = (Array.isArray(source.folders) ? source.folders : [])
    .map((folder, index) => normalizeFolder(folder, index, { now: timestamp, idFactory: options.idFactory }))
    .filter((folder): folder is PromptFolder => Boolean(folder))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const validFolderIds = new Set(folders.map((folder) => folder.id));
  const prompts = (Array.isArray(source.prompts) ? source.prompts : [])
    .map((prompt, index) => normalizePrompt(prompt, index, validFolderIds, { now: timestamp, idFactory: options.idFactory }))
    .filter((prompt): prompt is PromptItem => Boolean(prompt))
    .sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      return left.sortOrder - right.sortOrder;
    });

  const defaultLibrary =
    folders.length === 0 && prompts.length === 0
      ? createDefaultPromptWorkbenchLibrary({ now: timestamp, idFactory: options.idFactory })
      : null;
  if (defaultLibrary) return defaultLibrary;

  return {
    schemaVersion: PROMPT_WORKBENCH_SCHEMA_VERSION,
    folders,
    prompts,
    settings: normalizePromptWorkbenchSettings(source.settings),
    optimizerPrompts: normalizeOptimizerPrompts(source.optimizerPrompts),
    examplesSeeded: Boolean(source.examplesSeeded)
  };
}

export async function loadPromptWorkbenchLibrary(): Promise<PromptWorkbenchLibrary> {
  const result = await chrome.storage.local.get(PROMPT_WORKBENCH_STORAGE_KEY);
  return normalizePromptWorkbenchLibrary(result[PROMPT_WORKBENCH_STORAGE_KEY]);
}

export async function savePromptWorkbenchLibrary(library: PromptWorkbenchLibrary): Promise<void> {
  await chrome.storage.local.set({
    [PROMPT_WORKBENCH_STORAGE_KEY]: normalizePromptWorkbenchLibrary(library)
  });
}

export function exportPromptWorkbenchBackup(
  library: PromptWorkbenchLibrary,
  options: { now?: number } = {}
): PromptWorkbenchBackup {
  const normalized = normalizePromptWorkbenchLibrary(library);
  return {
    schemaVersion: PROMPT_WORKBENCH_SCHEMA_VERSION,
    app: "TurnMap",
    kind: "prompt-workbench",
    exportedAt: nowOrDefault(options.now),
    folders: normalized.folders,
    prompts: normalized.prompts,
    settings: normalized.settings,
    optimizerPrompts: normalized.optimizerPrompts
  };
}

function folderNameById(folders: PromptFolder[]): Map<string, string> {
  return new Map(folders.map((folder) => [folder.id, folder.name]));
}

function ensureFolderByName(
  library: PromptWorkbenchLibrary,
  folderName: string | null,
  options: { now: number; idFactory?: IdFactory }
): string | null {
  if (!folderName) return null;
  const existing = library.folders.find((folder) => folder.name.toLowerCase() === folderName.toLowerCase());
  if (existing) return existing.id;
  const folder: PromptFolder = {
    id: makeId(options.idFactory, "fld"),
    name: folderName,
    sortOrder: library.folders.length,
    createdAt: options.now,
    updatedAt: options.now
  };
  library.folders.push(folder);
  return folder.id;
}

export function importPromptWorkbenchBackup(
  currentLibrary: PromptWorkbenchLibrary,
  backup: PromptWorkbenchBackup,
  options: PromptWorkbenchImportOptions
): PromptWorkbenchImportResult {
  if (backup.app !== "TurnMap" || backup.kind !== "prompt-workbench" || backup.schemaVersion !== 1) {
    throw new Error("Unsupported prompt workbench backup.");
  }

  const timestamp = nowOrDefault(options.now);
  const imported = normalizePromptWorkbenchLibrary(backup, { now: timestamp, idFactory: options.idFactory });
  if (options.mode === "replace") {
    return {
      library: {
        ...imported,
        settings: options.importSettings === false ? currentLibrary.settings : imported.settings,
        optimizerPrompts: options.importOptimizerPrompts ? imported.optimizerPrompts : currentLibrary.optimizerPrompts
      },
      summary: { added: imported.prompts.length, updated: 0, skipped: 0 }
    };
  }

  const titleConflict = options.titleConflict ?? "skip";
  const library = normalizePromptWorkbenchLibrary(currentLibrary, { now: timestamp, idFactory: options.idFactory });
  if (options.importSettings) library.settings = imported.settings;
  if (options.importOptimizerPrompts) library.optimizerPrompts = imported.optimizerPrompts;

  const importedFolderNames = folderNameById(imported.folders);
  const summary: PromptWorkbenchImportSummary = { added: 0, updated: 0, skipped: 0 };
  const promptByTitle = new Map(library.prompts.map((prompt) => [prompt.title.toLowerCase(), prompt]));

  for (const importedPrompt of imported.prompts) {
    const key = importedPrompt.title.toLowerCase();
    const existing = promptByTitle.get(key);
    const folderName = importedPrompt.folderId ? importedFolderNames.get(importedPrompt.folderId) ?? null : null;
    const folderId = ensureFolderByName(library, folderName, { now: timestamp, idFactory: options.idFactory });

    if (existing) {
      if (titleConflict === "skip") {
        summary.skipped += 1;
        continue;
      }
      Object.assign(existing, {
        title: importedPrompt.title,
        content: importedPrompt.content,
        folderId,
        tags: importedPrompt.tags,
        enabled: importedPrompt.enabled,
        pinned: importedPrompt.pinned,
        note: importedPrompt.note,
        updatedAt: timestamp
      });
      summary.updated += 1;
      continue;
    }

    const added: PromptItem = {
      ...importedPrompt,
      id: makeId(options.idFactory, "prm"),
      folderId,
      sortOrder: library.prompts.length,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    library.prompts.push(added);
    promptByTitle.set(key, added);
    summary.added += 1;
  }

  return { library: normalizePromptWorkbenchLibrary(library, { now: timestamp, idFactory: options.idFactory }), summary };
}
