import { useCallback, useEffect, useState } from "react";
import { testAiConnection } from "../ai/openai-compatible";
import { useI18n } from "../i18n/useI18n";
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
  const { t } = useI18n();
  const [settings, setSettings] = useState<AiSettings>(defaultsForProvider("openai"));
  const [status, setStatus] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void loadAiSettings().then(setSettings);
  }, []);

  useEffect(() => {
    setStatus((current) => current || t("ai.status.local"));
  }, [t]);

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
    setStatus(t("ai.status.saved"));
    onSaved?.(t("ai.status.aiSaved"));
  }, [onSaved, settings, t]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setStatus(t("ai.status.testing"));

    try {
      await testAiConnection(settings);
      await saveAiSettings(settings);
      setStatus(t("ai.status.connectionSaved"));
      onSaved?.(t("ai.status.connectionSavedGlobal"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("ai.status.failed"));
    } finally {
      setTesting(false);
    }
  }, [onSaved, settings, t]);

  return (
    <section className={compact ? "settings-section settings-section--compact" : "settings-section"}>
      <div className="settings-section__header">
        <strong>{t("ai.title")}</strong>
        <span>{t("ai.subtitle")}</span>
      </div>

      <label>
        {t("ai.provider")}
        <select
          value={settings.provider}
          onChange={(event) => updateProvider(event.currentTarget.value as AiProvider)}
        >
          <option value="openai">OpenAI</option>
          <option value="deepseek">DeepSeek</option>
          <option value="custom">{t("ai.customCompatible")}</option>
        </select>
      </label>

      <label>
        {t("ai.baseUrl")}
        <input
          value={settings.baseUrl}
          onChange={(event) => updateField("baseUrl", event.currentTarget.value)}
          placeholder="https://api.example.com/v1"
        />
      </label>

      <label>
        {t("ai.model")}
        <input
          value={settings.model}
          onChange={(event) => updateField("model", event.currentTarget.value)}
          placeholder="model-name"
        />
      </label>

      <label>
        {t("ai.apiKey")}
        <input
          type="password"
          value={settings.apiKey}
          onChange={(event) => updateField("apiKey", event.currentTarget.value)}
          placeholder={t("ai.apiKeyPlaceholder")}
        />
      </label>

      <p>
        {t("ai.privacy")}
      </p>

      <label className="settings-panel__check">
        <input
          type="checkbox"
          checked={settings.autoSummarize}
          onChange={(event) => updateField("autoSummarize", event.currentTarget.checked)}
        />
        {t("ai.autoSummarize")}
      </label>

      <p>{status}</p>

      <div className="settings-panel__actions">
        <button type="button" onClick={save}>
          {t("ai.save")}
        </button>
        <button type="button" onClick={testConnection} disabled={testing}>
          {testing ? t("ai.testing") : t("ai.test")}
        </button>
      </div>
    </section>
  );
}
