import { requestChatCompletion } from "../ai/openai-compatible";
import { loadAiSettings } from "../settings/ai-settings-storage";

export type BuiltInLanguage = "en" | "zh";
export type LanguageMode = "browser" | BuiltInLanguage | `custom:${string}`;

export type CustomLanguage = {
  id: string;
  label: string;
  languageName: string;
  translations: Record<string, string>;
  createdAt: string;
};

export const LANGUAGE_STORAGE_KEY = "chatmap.interface.language";
export const CUSTOM_LANGUAGES_STORAGE_KEY = "chatmap.interface.customLanguages";
export const DEFAULT_LANGUAGE: LanguageMode = "browser";

export const BUILT_IN_LANGUAGE_OPTIONS: Array<{ value: LanguageMode; label: string }> = [
  { value: "browser", label: "Follow browser" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" }
];

export const EN_TRANSLATIONS = {
  "app.kicker": "Conversation mind map",
  "app.subtitle.hasTurns": "Click a node to jump back to ChatGPT.",
  "app.subtitle.noTurns": "No complete turns found yet.",
  "app.action.refresh": "Refresh",
  "app.action.deepScan": "Deep Scan",
  "app.action.settings": "Settings",
  "app.action.debug": "Debug",
  "app.action.view": "View",
  "app.view.sidePanel": "Side Panel",
  "app.view.fullPage": "Full Page",
  "app.view.showFloat": "Show Float",
  "app.view.hideFloat": "Hide Float",
  "app.view.current": "Current",
  "app.status.waiting": "Waiting for ChatGPT conversation...",
  "app.status.cacheFailed": "Turns loaded, but IndexedDB caching failed.",
  "app.status.mappedDeepScan": "{count} turns mapped via deep-scan after {steps} steps",
  "app.status.mappedVia": "{count} turns mapped via {source}",
  "app.status.loadedTurns": "{count} loaded turns mapped",
  "app.status.reading": "Reading the full ChatGPT conversation...",
  "app.status.openConversation": "Open a ChatGPT conversation tab, then refresh ChatMap.",
  "app.status.deepScanning": "Deep scanning loaded ChatGPT history...",
  "app.status.deepScanFailed": "Deep scan could not reach the active ChatGPT tab.",
  "app.status.noActiveTab": "No active ChatGPT tab was found.",
  "app.status.floatEnabled": "Floating panel enabled",
  "app.status.floatDisabled": "Floating panel disabled",
  "app.status.floatFailed": "Could not reach the ChatGPT tab for floating panel.",
  "debug.conversation": "Conversation",
  "debug.id": "ID",
  "debug.turns": "Turns",
  "debug.source": "Source",
  "debug.steps": "Steps",
  "debug.scroll": "Scroll",
  "toolbar.layout": "Layout",
  "toolbar.suggestLinks": "Suggest Links",
  "toolbar.suggesting": "Suggesting...",
  "toolbar.search": "Search",
  "toolbar.undo": "Undo",
  "toolbar.redo": "Redo",
  "toolbar.summarizeAll": "Summarize All",
  "toolbar.summarizing": "Summarizing...",
  "toolbar.files": "Files",
  "file.importJson": "Import JSON",
  "file.exportJson": "Export JSON",
  "file.exportCanvas": "Export Canvas",
  "file.exportSvg": "Export SVG",
  "file.exportPng": "Export PNG",
  "file.exportMd": "Export MD",
  "file.copyMd": "Copy MD",
  "file.resetMap": "Reset Map",
  "search.title": "Search Map",
  "search.close": "Close",
  "search.placeholder": "Search title, summary, tag...",
  "search.empty": "No matching nodes.",
  "suggestions.title": "AI Link Suggestions",
  "suggestions.acceptAll": "Accept All",
  "suggestions.clear": "Clear",
  "settings.title": "ChatMap Settings",
  "settings.subtitle": "Manage global settings without crowding the map workspace.",
  "settings.close": "Close",
  "settings.status.local": "Settings are stored locally in this browser profile.",
  "settings.status.interfaceSaved": "Interface settings saved.",
  "settings.section.interface": "Interface",
  "settings.section.interfaceHint": "Defaults for map views and ChatGPT page helpers",
  "settings.defaultLayout": "Default layout",
  "layout.single": "Single-side",
  "layout.radial": "Radial",
  "layout.matrix": "Matrix",
  "layout.twoSided": "Two-sided",
  "relationship.related": "Related",
  "relationship.dependsOn": "Depends on",
  "relationship.extends": "Extends",
  "relationship.supports": "Supports",
  "relationship.contradicts": "Contradicts",
  "relationship.contrasts": "Contrasts",
  "relationship.duplicates": "Duplicates",
  "relationship.verifies": "Verifies",
  "relationship.references": "References",
  "relationship.todo": "Todo",
  "settings.theme": "Theme",
  "settings.theme.browser": "Follow browser",
  "settings.theme.day": "Day",
  "settings.theme.night": "Night",
  "settings.theme.eyeCare": "Eye-care",
  "settings.language": "Language",
  "settings.language.browser": "Follow browser",
  "settings.language.english": "English",
  "settings.language.chinese": "中文",
  "settings.languageHint": "Built-in Chinese and English follow the browser by default.",
  "settings.customLanguage": "Custom language",
  "settings.customLanguagePlaceholder": "Spanish, Japanese, German...",
  "settings.generateTranslation": "Generate with AI",
  "settings.generatingTranslation": "Generating...",
  "settings.customTranslationHint":
    "AI translation only sends ChatMap UI labels, not your conversation content. Generated labels are stored locally.",
  "settings.enableFloat": "Enable Float navigator by default",
  "settings.showLauncher": "Show ChatMap launcher on ChatGPT pages",
  "settings.saveInterface": "Save Interface",
  "settings.loadingInterface": "Loading interface settings...",
  "settings.section.updates": "Updates",
  "settings.section.updatesHint": "Preview controls for release notifications",
  "settings.showUpdates": "Show update notices when available",
  "settings.includePrerelease": "Include pre-release versions",
  "settings.ignoredVersion": "Ignored version",
  "settings.updateHint":
    "GitHub/unpacked installs cannot be silently updated by the extension. Update notices will point users to a release page or package when this feature is connected.",
  "settings.saveUpdates": "Save Updates",
  "settings.loadingUpdates": "Loading update settings...",
  "settings.translationSaved": "Generated translation saved.",
  "settings.translationNeedsName": "Enter a target language name first.",
  "settings.translationFailed": "AI translation failed.",
  "ai.title": "AI Provider",
  "ai.subtitle": "OpenAI-compatible chat completions",
  "ai.provider": "Provider",
  "ai.customCompatible": "Custom compatible",
  "ai.baseUrl": "Base URL",
  "ai.model": "Model",
  "ai.apiKey": "API Key",
  "ai.apiKeyPlaceholder": "Stored locally",
  "ai.privacy":
    "API keys are saved in this browser's extension storage. ChatMap sends conversation text only when you run AI features or enable auto summarize.",
  "ai.autoSummarize": "Auto summarize new/default nodes",
  "ai.status.local": "Settings are stored locally. AI features send selected conversation text to your configured provider.",
  "ai.status.saved": "Saved.",
  "ai.status.aiSaved": "AI settings saved.",
  "ai.status.testing": "Testing connection...",
  "ai.status.connectionSaved": "Connection succeeded. Settings saved.",
  "ai.status.connectionSavedGlobal": "AI connection succeeded. Settings saved.",
  "ai.status.failed": "Connection test failed.",
  "ai.save": "Save",
  "ai.test": "Test Connection",
  "ai.testing": "Testing..."
} as const;

export type I18nKey = keyof typeof EN_TRANSLATIONS;
export type TranslationMap = Record<I18nKey, string>;

export const ZH_TRANSLATIONS: TranslationMap = {
  "app.kicker": "对话思维导图",
  "app.subtitle.hasTurns": "点击节点即可跳回 ChatGPT 原文。",
  "app.subtitle.noTurns": "还没有找到完整问答轮次。",
  "app.action.refresh": "刷新",
  "app.action.deepScan": "深度扫描",
  "app.action.settings": "设置",
  "app.action.debug": "调试",
  "app.action.view": "视图",
  "app.view.sidePanel": "侧边栏",
  "app.view.fullPage": "全屏页",
  "app.view.showFloat": "显示浮窗",
  "app.view.hideFloat": "隐藏浮窗",
  "app.view.current": "当前",
  "app.status.waiting": "正在等待 ChatGPT 对话...",
  "app.status.cacheFailed": "对话已加载，但 IndexedDB 缓存失败。",
  "app.status.mappedDeepScan": "已通过深度扫描映射 {count} 个节点，共 {steps} 步",
  "app.status.mappedVia": "已通过 {source} 映射 {count} 个节点",
  "app.status.loadedTurns": "已映射 {count} 个已加载节点",
  "app.status.reading": "正在读取完整 ChatGPT 对话...",
  "app.status.openConversation": "请打开一个 ChatGPT 对话标签页，然后刷新 ChatMap。",
  "app.status.deepScanning": "正在深度扫描已加载的 ChatGPT 历史...",
  "app.status.deepScanFailed": "深度扫描无法连接当前 ChatGPT 标签页。",
  "app.status.noActiveTab": "没有找到当前活动的 ChatGPT 标签页。",
  "app.status.floatEnabled": "浮窗已启用",
  "app.status.floatDisabled": "浮窗已关闭",
  "app.status.floatFailed": "无法连接 ChatGPT 标签页来控制浮窗。",
  "debug.conversation": "对话",
  "debug.id": "ID",
  "debug.turns": "轮次",
  "debug.source": "来源",
  "debug.steps": "步数",
  "debug.scroll": "滚动",
  "toolbar.layout": "布局",
  "toolbar.suggestLinks": "建议链接",
  "toolbar.suggesting": "建议中...",
  "toolbar.search": "搜索",
  "toolbar.undo": "撤销",
  "toolbar.redo": "重做",
  "toolbar.summarizeAll": "全部总结",
  "toolbar.summarizing": "总结中...",
  "toolbar.files": "文件",
  "file.importJson": "导入 JSON",
  "file.exportJson": "导出 JSON",
  "file.exportCanvas": "导出 Canvas",
  "file.exportSvg": "导出 SVG",
  "file.exportPng": "导出 PNG",
  "file.exportMd": "导出 MD",
  "file.copyMd": "复制 MD",
  "file.resetMap": "重置导图",
  "search.title": "搜索导图",
  "search.close": "关闭",
  "search.placeholder": "搜索标题、摘要、标签...",
  "search.empty": "没有匹配的节点。",
  "suggestions.title": "AI 链接建议",
  "suggestions.acceptAll": "全部接受",
  "suggestions.clear": "清空",
  "settings.title": "ChatMap 设置",
  "settings.subtitle": "在不挤占导图工作区的情况下管理全局设置。",
  "settings.close": "关闭",
  "settings.status.local": "设置会保存在当前浏览器配置文件中。",
  "settings.status.interfaceSaved": "界面设置已保存。",
  "settings.section.interface": "界面",
  "settings.section.interfaceHint": "导图视图和 ChatGPT 页面辅助功能的默认设置",
  "settings.defaultLayout": "默认布局",
  "layout.single": "单侧式",
  "layout.radial": "环绕式",
  "layout.matrix": "矩阵式",
  "layout.twoSided": "两侧式",
  "relationship.related": "相关",
  "relationship.dependsOn": "依赖",
  "relationship.extends": "延伸",
  "relationship.supports": "支持",
  "relationship.contradicts": "反驳",
  "relationship.contrasts": "对比",
  "relationship.duplicates": "重复",
  "relationship.verifies": "验证",
  "relationship.references": "引用",
  "relationship.todo": "待办",
  "settings.theme": "主题",
  "settings.theme.browser": "跟随浏览器",
  "settings.theme.day": "白天",
  "settings.theme.night": "夜晚",
  "settings.theme.eyeCare": "护眼",
  "settings.language": "语言",
  "settings.language.browser": "跟随浏览器",
  "settings.language.english": "English",
  "settings.language.chinese": "中文",
  "settings.languageHint": "内置中文和英文默认跟随浏览器语言。",
  "settings.customLanguage": "自定义语言",
  "settings.customLanguagePlaceholder": "西班牙语、日语、德语...",
  "settings.generateTranslation": "用 AI 生成",
  "settings.generatingTranslation": "生成中...",
  "settings.customTranslationHint": "AI 翻译只发送 ChatMap 界面文案，不发送你的对话内容。生成后的文案会保存在本地。",
  "settings.enableFloat": "默认启用浮窗导航",
  "settings.showLauncher": "在 ChatGPT 页面显示 ChatMap 悬浮球",
  "settings.saveInterface": "保存界面设置",
  "settings.loadingInterface": "正在加载界面设置...",
  "settings.section.updates": "更新",
  "settings.section.updatesHint": "发布通知的预览控制",
  "settings.showUpdates": "有更新时显示提示",
  "settings.includePrerelease": "包含预发布版本",
  "settings.ignoredVersion": "忽略的版本",
  "settings.updateHint": "GitHub/解压安装无法由扩展静默更新。该功能接通后，更新提示会指向发布页或安装包。",
  "settings.saveUpdates": "保存更新设置",
  "settings.loadingUpdates": "正在加载更新设置...",
  "settings.translationSaved": "翻译已生成并保存。",
  "settings.translationNeedsName": "请先输入目标语言名称。",
  "settings.translationFailed": "AI 翻译失败。",
  "ai.title": "AI 服务",
  "ai.subtitle": "OpenAI 兼容的聊天补全接口",
  "ai.provider": "服务商",
  "ai.customCompatible": "自定义兼容接口",
  "ai.baseUrl": "Base URL",
  "ai.model": "模型",
  "ai.apiKey": "API Key",
  "ai.apiKeyPlaceholder": "仅本地保存",
  "ai.privacy": "API Key 会保存在本浏览器的扩展存储中。只有运行 AI 功能或启用自动总结时，ChatMap 才会发送对话文本。",
  "ai.autoSummarize": "自动总结新节点/默认节点",
  "ai.status.local": "设置保存在本地。AI 功能会把选中的对话文本发送给你配置的服务商。",
  "ai.status.saved": "已保存。",
  "ai.status.aiSaved": "AI 设置已保存。",
  "ai.status.testing": "正在测试连接...",
  "ai.status.connectionSaved": "连接成功，设置已保存。",
  "ai.status.connectionSavedGlobal": "AI 连接成功，设置已保存。",
  "ai.status.failed": "连接测试失败。",
  "ai.save": "保存",
  "ai.test": "测试连接",
  "ai.testing": "测试中..."
};

export const BUILT_IN_TRANSLATIONS: Record<BuiltInLanguage, TranslationMap> = {
  en: EN_TRANSLATIONS,
  zh: ZH_TRANSLATIONS
};

type LanguageSettings = {
  mode: LanguageMode;
  customLanguages: CustomLanguage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeLanguageMode(value: unknown): LanguageMode {
  if (value === "browser" || value === "en" || value === "zh") return value;
  if (typeof value === "string" && value.startsWith("custom:")) return value as `custom:${string}`;
  return DEFAULT_LANGUAGE;
}

export function browserLanguage(): BuiltInLanguage {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((language) => language.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

export function customLanguageId(languageName: string): string {
  const base = languageName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `custom-${Date.now()}`;
}

function normalizeCustomLanguages(value: unknown): CustomLanguage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      label: typeof item.label === "string" ? item.label : "",
      languageName: typeof item.languageName === "string" ? item.languageName : "",
      translations: isRecord(item.translations)
        ? Object.fromEntries(
            Object.entries(item.translations).filter((entry): entry is [string, string] => typeof entry[1] === "string")
          )
        : {},
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
    }))
    .filter((item) => item.id && item.label);
}

export async function loadLanguageSettings(): Promise<LanguageSettings> {
  const stored = await chrome.storage.local.get([LANGUAGE_STORAGE_KEY, CUSTOM_LANGUAGES_STORAGE_KEY]);
  return {
    mode: normalizeLanguageMode(stored[LANGUAGE_STORAGE_KEY]),
    customLanguages: normalizeCustomLanguages(stored[CUSTOM_LANGUAGES_STORAGE_KEY])
  };
}

export async function saveLanguageMode(mode: LanguageMode): Promise<void> {
  await chrome.storage.local.set({ [LANGUAGE_STORAGE_KEY]: mode });
}

export async function saveCustomLanguage(language: CustomLanguage): Promise<void> {
  const settings = await loadLanguageSettings();
  const next = [language, ...settings.customLanguages.filter((item) => item.id !== language.id)].slice(0, 12);
  await chrome.storage.local.set({
    [CUSTOM_LANGUAGES_STORAGE_KEY]: next,
    [LANGUAGE_STORAGE_KEY]: `custom:${language.id}` satisfies LanguageMode
  });
}

export function translationsFor(mode: LanguageMode, customLanguages: CustomLanguage[]): TranslationMap {
  if (mode === "browser") return BUILT_IN_TRANSLATIONS[browserLanguage()];
  if (mode === "en" || mode === "zh") return BUILT_IN_TRANSLATIONS[mode];

  const id = mode.slice("custom:".length);
  const custom = customLanguages.find((language) => language.id === id);
  return { ...EN_TRANSLATIONS, ...(custom?.translations ?? {}) };
}

export function formatTranslation(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
}

function parseTranslationJson(content: string): Record<string, string> {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = (fenced ?? content).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return a JSON object.");
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!isRecord(parsed)) throw new Error("Model translation payload was not an object.");

  return Object.fromEntries(
    Object.keys(EN_TRANSLATIONS).map((key) => {
      const translated = parsed[key];
      return [key, typeof translated === "string" && translated.trim() ? translated.trim() : EN_TRANSLATIONS[key as I18nKey]];
    })
  );
}

export async function generateCustomLanguage(languageName: string): Promise<CustomLanguage> {
  const trimmedLanguageName = languageName.trim();
  if (!trimmedLanguageName) throw new Error("Target language is required.");
  const settings = await loadAiSettings();
  const content = await requestChatCompletion(
    settings,
    [
      {
        role: "system",
        content:
          "You translate browser extension UI labels. Return only one JSON object. Keep placeholders such as {count}, {steps}, and {source} unchanged. Keep product names like ChatMap and ChatGPT unchanged. Prefer concise labels that fit buttons and menus."
      },
      {
        role: "user",
        content: JSON.stringify({
          targetLanguage: trimmedLanguageName,
          sourceLanguage: "English",
          labels: EN_TRANSLATIONS
        })
      }
    ],
    { temperature: 0.1, maxTokens: 5000, jsonMode: true }
  );

  const translations = parseTranslationJson(content);
  const id = customLanguageId(trimmedLanguageName);
  return {
    id,
    label: trimmedLanguageName,
    languageName: trimmedLanguageName,
    translations,
    createdAt: new Date().toISOString()
  };
}
