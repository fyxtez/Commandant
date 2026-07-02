import { useState } from "react";
import Field from "../../components/Field/Field";
import Button from "../../components/Button/Button";
import type { HostConfig } from "../../types";
import "./AddService.css";

interface Props {
  presets: HostConfig[];
  onCancel: () => void;
  onSave: (label: string, unitName: string, presetId: string) => void;
  onOpenHosts: () => void;
}

export default function AddService({ presets, onCancel, onSave, onOpenHosts }: Props) {
  const [label, setLabel] = useState("");
  const [unitName, setUnitName] = useState("");
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "");

  const canSave =
    label.trim().length > 0 &&
    unitName.trim().length > 0 &&
    presetId.length > 0;

  return (
    <div className="add-service">
      <Field
        label="Label"
        inputProps={{
          value: label,
          onChange: (e) => setLabel(e.target.value),
          placeholder: "Telegram Sniper Bot",
        }}
      />
      <Field
        label="Unit name"
        hint="Must match the systemd service name on the host exactly."
        inputProps={{
          value: unitName,
          onChange: (e) => setUnitName(e.target.value),
          placeholder: "telegram_sniper",
          autoCapitalize: "none",
          autoCorrect: "off",
        }}
      />

      <div className="field">
        <label className="field__label">SSH Host</label>
        {presets.length === 0 ? (
          <div className="add-service__no-hosts">
            <p className="add-service__no-hosts-text">
              No hosts configured yet.
            </p>
            <button className="add-service__open-hosts-btn" onClick={onOpenHosts}>
              Open Hosts →
            </button>
          </div>
        ) : (
          <div className="add-service__presets">
            {presets.map((p) => (
              <button
                key={p.id}
                className={`add-service__preset-btn ${
                  presetId === p.id ? "add-service__preset-btn--active" : ""
                }`}
                onClick={() => setPresetId(p.id)}
              >
                <span className="add-service__preset-name">{p.name}</span>
                <span className="add-service__preset-host">
                  {p.username}@{p.host}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="add-service__actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!canSave}
          onClick={() => onSave(label.trim(), unitName.trim(), presetId)}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
