import { useState } from "react";
import Field from "../../components/Field/Field";
import Button from "../../components/Button/Button";
import "./AddService.css";

interface Props {
  onCancel: () => void;
  onSave: (label: string, unitName: string) => void;
}

export default function AddService({ onCancel, onSave }: Props) {
  const [label, setLabel] = useState("");
  const [unitName, setUnitName] = useState("");

  const canSave = label.trim().length > 0 && unitName.trim().length > 0;

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
      <div className="add-service__actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!canSave}
          onClick={() => onSave(label.trim(), unitName.trim())}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
