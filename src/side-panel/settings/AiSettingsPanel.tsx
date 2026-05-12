import { AiSettingsForm } from "./AiSettingsForm";

type AiSettingsPanelProps = {
  onClose: () => void;
};

export function AiSettingsPanel({ onClose }: AiSettingsPanelProps) {
  return (
    <aside className="settings-panel">
      <div className="settings-panel__header">
        <strong>AI Provider</strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <AiSettingsForm compact />
    </aside>
  );
}
