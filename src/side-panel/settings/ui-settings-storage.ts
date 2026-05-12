import { loadDefaultLayout, saveDefaultLayout, type LayoutMode } from "../graph/graph-storage";

const FLOATING_PANEL_ENABLED_KEY = "chatmap.floatingPanel.enabled";
const LAUNCHER_ENABLED_KEY = "chatmap.launcher.enabled";
const UPDATE_NOTICE_ENABLED_KEY = "chatmap.updateNotice.enabled";
const UPDATE_NOTICE_PRERELEASE_KEY = "chatmap.updateNotice.includePrerelease";
const IGNORED_VERSION_KEY = "chatmap.updateNotice.ignoredVersion";

export type UiSettings = {
  defaultLayout: LayoutMode;
  floatingPanelEnabled: boolean;
  launcherEnabled: boolean;
  updateNoticeEnabled: boolean;
  includePrereleaseUpdates: boolean;
  ignoredVersion: string;
};

export async function loadUiSettings(): Promise<UiSettings> {
  const [defaultLayout, stored] = await Promise.all([
    loadDefaultLayout(),
    chrome.storage.local.get([
      FLOATING_PANEL_ENABLED_KEY,
      LAUNCHER_ENABLED_KEY,
      UPDATE_NOTICE_ENABLED_KEY,
      UPDATE_NOTICE_PRERELEASE_KEY,
      IGNORED_VERSION_KEY
    ])
  ]);

  return {
    defaultLayout,
    floatingPanelEnabled: Boolean(stored[FLOATING_PANEL_ENABLED_KEY]),
    launcherEnabled: stored[LAUNCHER_ENABLED_KEY] !== false,
    updateNoticeEnabled: stored[UPDATE_NOTICE_ENABLED_KEY] !== false,
    includePrereleaseUpdates: Boolean(stored[UPDATE_NOTICE_PRERELEASE_KEY]),
    ignoredVersion: typeof stored[IGNORED_VERSION_KEY] === "string" ? stored[IGNORED_VERSION_KEY] : ""
  };
}

export async function saveUiSettings(settings: UiSettings): Promise<void> {
  await Promise.all([
    saveDefaultLayout(settings.defaultLayout),
    chrome.storage.local.set({
      [FLOATING_PANEL_ENABLED_KEY]: settings.floatingPanelEnabled,
      [LAUNCHER_ENABLED_KEY]: settings.launcherEnabled,
      [UPDATE_NOTICE_ENABLED_KEY]: settings.updateNoticeEnabled,
      [UPDATE_NOTICE_PRERELEASE_KEY]: settings.includePrereleaseUpdates,
      [IGNORED_VERSION_KEY]: settings.ignoredVersion.trim()
    })
  ]);
}
