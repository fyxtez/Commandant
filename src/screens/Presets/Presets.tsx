import Button from "../../components/Button/Button";
import type { HostConfig } from "../../types";
import "./Presets.css";

interface Props {
  presets: HostConfig[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function Presets({ presets, onAdd, onEdit, onDelete, onClose }: Props) {
  return (
    <div className="presets">
      <div className="presets__scroll">
        <Button onClick={onClose} className="presets__back">← Back</Button>

        {presets.length === 0 ? (
          <p className="presets__empty">No hosts yet. Add your first SSH host.</p>
        ) : (
          presets.map((p) => (
            <div key={p.id} className="preset-card">
              <div className="preset-card__info" onClick={() => onEdit(p.id)}>
                <span className="preset-card__name">{p.name}</span>
                <span className="preset-card__host">
                  {p.username}@{p.host}:{p.port}
                </span>
              </div>
              <button
                className="preset-card__delete"
                onClick={() => onDelete(p.id)}
                aria-label="Delete host"
              >
                ✕
              </button>
            </div>
          ))
        )}

        <button className="presets__add-card" onClick={onAdd}>
          <span>+</span>
          Add new host
        </button>
      </div>
    </div>
  );
}
