import { loadDefaultLayout, saveDefaultLayout, type LayoutMode } from "../graph/graph-storage";
import { DEFAULT_THEME, THEME_STORAGE_KEY, normalizeTheme, type ThemeMode } from "./theme-storage";
import {
  READING_BEHAVIOR_DEFAULTS,
  loadReadingBehaviorSettings,
  saveReadingBehaviorSettings,
  type ReadingBehaviorSettings
} from "../../shared/reading-settings.ts";

const FLOATING_PANEL_ENABLED_KEY = "turnmap.floatingPanel.enabled";
const LAUNCHER_ENABLED_KEY = "turnmap.launcher.enabled";
const UPDATE_NOTICE_ENABLED_KEY = "turnmap.updateNotice.enabled";
const UPDATE_NOTICE_PRERELEASE_KEY = "turnmap.updateNotice.includePrerelease";
const IGNORED_VERSION_KEY = "turnmap.updateNotice.ignoredVersion";
const NODE_COLOR_RENDER_MODE_KEY = "turnmap.nodeColor.renderMode";
const NODE_COLOR_RENDER_STRENGTH_KEY = "turnmap.nodeColor.renderStrength";
const LINK_CONNECTION_STYLE_KEY = "turnmap.link.connectionStyle";

export const UI_SETTINGS_STORAGE_KEYS = [
  FLOATING_PANEL_ENABLED_KEY,
  LAUNCHER_ENABLED_KEY,
  UPDATE_NOTICE_ENABLED_KEY,
  UPDATE_NOTICE_PRERELEASE_KEY,
  IGNORED_VERSION_KEY,
  THEME_STORAGE_KEY,
  NODE_COLOR_RENDER_MODE_KEY,
  NODE_COLOR_RENDER_STRENGTH_KEY,
  LINK_CONNECTION_STYLE_KEY
] as const;

export type NodeColorRenderMode = "gradient" | "solid";
export type LinkConnectionStyle = "curved" | "angled";

export type UiSettings = ReadingBehaviorSettings & {
  defaultLayout: LayoutMode;
  theme: ThemeMode;
  floatingPanelEnabled: boolean;
  launcherEnabled: boolean;
  updateNoticeEnabled: boolean;
  includePrereleaseUpdates: boolean;
  ignoredVersion: string;
  nodeColorRenderMode: NodeColorRenderMode;
  nodeColorRenderStrength: number;
  linkConnectionStyle: LinkConnectionStyle;
};

function normalizeRenderMode(value: unknown): NodeColorRenderMode {
  return value === "solid" ? "solid" : "gradient";
}

function normalizeRenderStrength(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 70;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function normalizeLinkConnectionStyle(value: unknown): LinkConnectionStyle {
  return value === "angled" ? "angled" : "curved";
}

export async function loadUiSettings(): Promise<UiSettings> {
  const [defaultLayout, stored, readingBehavior] = await Promise.all([
    loadDefaultLayout(),
    chrome.storage.local.get([...UI_SETTINGS_STORAGE_KEYS]),
    loadReadingBehaviorSettings()
  ]);

  return {
    ...readingBehavior,
    defaultLayout,
    theme: normalizeTheme(stored[THEME_STORAGE_KEY] ?? DEFAULT_THEME),
    floatingPanelEnabled: Boolean(stored[FLOATING_PANEL_ENABLED_KEY]),
    launcherEnabled: stored[LAUNCHER_ENABLED_KEY] !== false,
    updateNoticeEnabled: stored[UPDATE_NOTICE_ENABLED_KEY] !== false,
    includePrereleaseUpdates: Boolean(stored[UPDATE_NOTICE_PRERELEASE_KEY]),
    ignoredVersion: typeof stored[IGNORED_VERSION_KEY] === "string" ? stored[IGNORED_VERSION_KEY] : "",
    nodeColorRenderMode: normalizeRenderMode(stored[NODE_COLOR_RENDER_MODE_KEY]),
    nodeColorRenderStrength: normalizeRenderStrength(stored[NODE_COLOR_RENDER_STRENGTH_KEY]),
    linkConnectionStyle: normalizeLinkConnectionStyle(stored[LINK_CONNECTION_STYLE_KEY])
  };
}

export async function saveUiSettings(settings: UiSettings): Promise<void> {
  await Promise.all([
    saveDefaultLayout(settings.defaultLayout),
    saveReadingBehaviorSettings({
      scrollSpeedMultiplier: settings.scrollSpeedMultiplier ?? READING_BEHAVIOR_DEFAULTS.scrollSpeedMultiplier,
      edgeWaitSeconds: settings.edgeWaitSeconds ?? READING_BEHAVIOR_DEFAULTS.edgeWaitSeconds,
      jumpSearchStrength: settings.jumpSearchStrength ?? READING_BEHAVIOR_DEFAULTS.jumpSearchStrength
    }),
    chrome.storage.local.set({
      [FLOATING_PANEL_ENABLED_KEY]: settings.floatingPanelEnabled,
      [LAUNCHER_ENABLED_KEY]: settings.launcherEnabled,
      [UPDATE_NOTICE_ENABLED_KEY]: settings.updateNoticeEnabled,
      [UPDATE_NOTICE_PRERELEASE_KEY]: settings.includePrereleaseUpdates,
      [IGNORED_VERSION_KEY]: settings.ignoredVersion.trim(),
      [THEME_STORAGE_KEY]: settings.theme,
      [NODE_COLOR_RENDER_MODE_KEY]: settings.nodeColorRenderMode,
      [NODE_COLOR_RENDER_STRENGTH_KEY]: normalizeRenderStrength(settings.nodeColorRenderStrength),
      [LINK_CONNECTION_STYLE_KEY]: normalizeLinkConnectionStyle(settings.linkConnectionStyle)
    })
  ]);
}

export function applyNodeColorRendering(settings: Pick<UiSettings, "nodeColorRenderMode" | "nodeColorRenderStrength">): void {
  const strength = normalizeRenderStrength(settings.nodeColorRenderStrength);
  document.documentElement.dataset.turnmapNodeColorRender = settings.nodeColorRenderMode;
  document.documentElement.style.setProperty("--node-color-fill-mix", `${Math.round(8 + strength * 0.24)}%`);
  document.documentElement.style.setProperty("--node-color-border-mix", `${Math.round(20 + strength * 0.55)}%`);
  document.documentElement.style.setProperty("--node-color-shadow-mix", `${Math.round(6 + strength * 0.24)}%`);
}
