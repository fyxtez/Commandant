import { useState } from "react";
import Field from "../../components/Field/Field";
import Button from "../../components/Button/Button";
import type { Preset } from "../../types";
import "./PresetForm.css";

interface Props {
  preset?: Preset;
  onSave: (preset: Preset) => void;
  onCancel: () => void;
}

export default function PresetForm({ preset, onSave, onCancel }: Props) {
  const [name, setName] = useState(preset?.name ?? "");
  const [host, setHost] = useState(preset?.host ?? "");
  const [port, setPort] = useState(String(preset?.port ?? 22));
  const [username, setUsername] = useState(preset?.username ?? "root");
  const [privateKey, setPrivateKey] = useState(preset?.private_key ?? "");

  const canSave =
    name.trim().length > 0 &&
    host.trim().length > 0 &&
    username.trim().length > 0 &&
    privateKey.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: preset?.id ?? crypto.randomUUID(),
      name: name.trim(),
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      private_key: privateKey,
    });
  }

  return (
    <div className="preset-form">
      <Field
        label="Preset name"
        inputProps={{
          value: name,
          onChange: (e) => setName(e.target.value),
          placeholder: "My VPS",
        }}
      />
      <Field
        label="Host / IP"
        inputProps={{
          value: host,
          onChange: (e) => setHost(e.target.value),
          placeholder: "203.0.113.42",
          autoCapitalize: "none",
          autoCorrect: "off",
        }}
      />
      <Field
        label="SSH Port"
        inputProps={{
          value: port,
          onChange: (e) => setPort(e.target.value),
          placeholder: "22",
          inputMode: "numeric",
        }}
      />
      <Field
        label="Username"
        inputProps={{
          value: username,
          onChange: (e) => setUsername(e.target.value),
          placeholder: "root",
          autoCapitalize: "none",
          autoCorrect: "off",
        }}
      />
      <Field
        as="textarea"
        label="SSH Private Key"
        hint="OpenSSH format. Stored in app-private local storage."
        inputProps={{
          value: privateKey,
          onChange: (e) => setPrivateKey(e.target.value),
          placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----",
          spellCheck: false,
        }}
      />
      <div className="preset-form__actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled={!canSave} onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
