import { useCallback, useEffect, useState } from "react";
import { testAiConnection } from "../ai/openai-compatible";
import {
  defaultsForProvider,
  loadAiSettings,
  saveAiSettings,
  type AiProvider,
  type AiSettings
} from "./ai-settings-storage";

type AiSettingsFormProps = {
  compact?: boolean;
  onSaved?: (message: string) => void;
};

export function AiSettingsForm({ compact = false, onSaved }: AiSettingsFormProps) {
  const [settings, setSettings] = useState<AiSettings>(defaultsForProvider("openai"));
  const [status, setStatus] = useState(
    "Settings are stored locally. AI features send selected conversation text to your configured provider."
  );
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void loadAiSettings().then(setSettings);
  }, []);

  const updateProvider = useCallback((provider: AiProvider) => {
    setSettings((current) => ({
      ...defaultsForProvider(provider),
      apiKey: current.apiKey,
      provider
    }));
  }, []);

  const updateField = useCallback((field: keyof AiSettings, value: string | boolean) => {
    setSettings((current) => ({
      ...current,
      [field]: value
    }));
  }, []);

  const save = useCallback(async () => {
    await saveAiSettings(settings);
    setStatus("Saved.");
    onSaved?.("AI settings saved.");
  }, [onSaved, settings]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setStatus("Testing connection...");

    try {
      await testAiConnection(settings);
      await saveAiSettings(settings);
      setStatus("Connection succeeded. Settings saved.");
      onSaved?.("AI connection succeeded. Settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  }, [onSaved, settings]);

  return (
    <section className={compact ? "settings-section settings-section--compact" : "settings-section"}>
      <div className="settings-section__header">
        <strong>AI Provider</strong>
        <span>OpenAI-compatible chat completions</span>
      </div>

      <label>
        Provider
        <select
          value={settings.provider}
          onChange={(event) => updateProvider(event.currentTarget.value as AiProvider)}
        >
          <option value="openai">OpenAI</option>
          <option value="deepseek">DeepSeek</option>
          <option value="custom">Custom compatible</option>
        </select>
      </label>

      <label>
        Base URL
        <input
          value={settings.baseUrl}
          onChange={(event) => updateField("baseUrl", event.currentTarget.value)}
          placeholder="https://api.example.com/v1"
        />
      </label>

      <label>
        Model
        <input
          value={settings.model}
          onChange={(event) => updateField("model", event.currentTarget.value)}
          placeholder="model-name"
        />
      </label>

      <label>
        API Key
        <input
          type="password"
          value={settings.apiKey}
          onChange={(event) => updateField("apiKey", event.currentTarget.value)}
          placeholder="Stored locally"
        />
      </label>

      <p>
        API keys are saved in this browser's extension storage. ChatMap sends conversation text only when
        you run AI features or enable auto summarize.
      </p>

      <label className="settings-panel__check">
        <input
          type="checkbox"
          checked={settings.autoSummarize}
          onChange={(event) => updateField("autoSummarize", event.currentTarget.checked)}
        />
        Auto summarize new/default nodes
      </label>

      <p>{status}</p>

      <div className="settings-panel__actions">
        <button type="button" onClick={save}>
          Save
        </button>
        <button type="button" onClick={testConnection} disabled={testing}>
          {testing ? "Testing..." : "Test Connection"}
        </button>
      </div>
    </section>
  );
}
