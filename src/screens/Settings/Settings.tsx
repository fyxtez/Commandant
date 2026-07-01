import { useEffect, useState } from "react";
import Field from "../../components/Field/Field";
import Button from "../../components/Button/Button";
import { loadHostConfig, saveHostConfig } from "../../storage";
import type { HostConfig } from "../../types";
import "./Settings.css";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function Settings({ onClose, onSaved }: Props) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadHostConfig().then((cfg) => {
      if (cfg) {
        setHost(cfg.host);
        setPort(String(cfg.port));
        setUsername(cfg.username);
        setPrivateKey(cfg.private_key);
      }
      setReady(true);
    });
  }, []);

  async function handleSave() {
    if (!host.trim() || !username.trim() || !privateKey.trim()) return;
    setSaving(true);
    const config: HostConfig = {
      host: host.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      private_key: privateKey,
    };
    await saveHostConfig(config);
    setSaving(false);
    onSaved();
  }

  if (!ready) return null;

  return (
    <div className="settings">
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
        hint="Stored in this app's private local storage. OpenSSH format."
        inputProps={{
          value: privateKey,
          onChange: (e) => setPrivateKey(e.target.value),
          placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----",
          spellCheck: false,
        }}
      />
      <div className="settings__actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || !host.trim() || !username.trim() || !privateKey.trim()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
