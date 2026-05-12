import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AiSettingsForm } from "../side-panel/settings/AiSettingsForm";
import {
  loadUiSettings,
  saveUiSettings,
  type UiSettings
} from "../side-panel/settings/ui-settings-storage";
import type { LayoutMode } from "../side-panel/graph/graph-storage";
import "../side-panel/styles.css";
import "./settings-page.css";

const LAYOUT_OPTIONS: Array<{ value: LayoutMode; label: string }> = [
  { value: "single", label: "Single-side" },
  { value: "radial", label: "Radial" },
  { value: "list", label: "Matrix" },
  { value: "two-sided", label: "Two-sided" }
];

function SettingsPage() {
  const [settings, setSettings] = useState<UiSettings | null>(null);
  const [status, setStatus] = useState("Settings are stored locally in this browser profile.");

  useEffect(() => {
    void loadUiSettings().then(setSettings);
  }, []);

  const update = useCallback((updates: Partial<UiSettings>) => {
    setSettings((current) => (current ? { ...current, ...updates } : current));
  }, []);

  const save = useCallback(async () => {
    if (!settings) return;
    await saveUiSettings(settings);
    setStatus("Interface settings saved.");
  }, [settings]);

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <div>
          <h1>ChatMap Settings</h1>
          <p>Manage global settings without crowding the map workspace.</p>
        </div>
        <button type="button" onClick={() => window.close()}>
          Close
        </button>
      </header>

      <section className="settings-page__grid">
        <AiSettingsForm onSaved={setStatus} />

        <section className="settings-section">
          <div className="settings-section__header">
            <strong>Interface</strong>
            <span>Defaults for map views and ChatGPT page helpers</span>
          </div>

          {settings ? (
            <>
              <label>
                Default layout
                <select
                  value={settings.defaultLayout}
                  onChange={(event) => update({ defaultLayout: event.currentTarget.value as LayoutMode })}
                >
                  {LAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-panel__check">
                <input
                  type="checkbox"
                  checked={settings.floatingPanelEnabled}
                  onChange={(event) => update({ floatingPanelEnabled: event.currentTarget.checked })}
                />
                Enable Float navigator by default
              </label>

              <label className="settings-panel__check">
                <input
                  type="checkbox"
                  checked={settings.launcherEnabled}
                  onChange={(event) => update({ launcherEnabled: event.currentTarget.checked })}
                />
                Show ChatMap launcher on ChatGPT pages
              </label>

              <div className="settings-panel__actions">
                <button type="button" onClick={save}>
                  Save Interface
                </button>
              </div>
            </>
          ) : (
            <p>Loading interface settings...</p>
          )}
        </section>

        <section className="settings-section">
          <div className="settings-section__header">
            <strong>Updates</strong>
            <span>Preview controls for release notifications</span>
          </div>

          {settings ? (
            <>
              <label className="settings-panel__check">
                <input
                  type="checkbox"
                  checked={settings.updateNoticeEnabled}
                  onChange={(event) => update({ updateNoticeEnabled: event.currentTarget.checked })}
                />
                Show update notices when available
              </label>

              <label className="settings-panel__check">
                <input
                  type="checkbox"
                  checked={settings.includePrereleaseUpdates}
                  onChange={(event) => update({ includePrereleaseUpdates: event.currentTarget.checked })}
                />
                Include pre-release versions
              </label>

              <label>
                Ignored version
                <input
                  value={settings.ignoredVersion}
                  onChange={(event) => update({ ignoredVersion: event.currentTarget.value })}
                  placeholder="v0.1.1"
                />
              </label>

              <p>
                GitHub/unpacked installs cannot be silently updated by the extension. Update notices will
                point users to a release page or package when this feature is connected.
              </p>

              <div className="settings-panel__actions">
                <button type="button" onClick={save}>
                  Save Updates
                </button>
              </div>
            </>
          ) : (
            <p>Loading update settings...</p>
          )}
        </section>
      </section>

      <section className="settings-page__status">{status}</section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsPage />
  </StrictMode>
);
