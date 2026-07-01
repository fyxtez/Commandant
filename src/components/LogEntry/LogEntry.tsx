import "./LogEntry.css";
import type { ActionLogEntry } from "../../types";

interface Props {
  entry: ActionLogEntry;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function markerClass(entry: ActionLogEntry): string {
  if (!entry.success) return "danger";
  if (entry.action === "stop") return "idle";
  if (entry.action === "logs") return "info";
  return "ok"; // start, restart succeeded
}

export default function LogEntry({ entry }: Props) {
  const marker = markerClass(entry);

  return (
    <div className="log-entry">
      <span className={`log-entry__marker log-entry__marker--${marker}`} />
      <div className="log-entry__body">
        <span className={`log-entry__action log-entry__action--${marker}`}>{entry.action}</span>
        <div className="log-entry__meta">
          {formatTime(entry.timestamp)}
          {entry.exit_code !== null ? ` · exit ${entry.exit_code}` : ""}
        </div>
        {!entry.success && entry.message && (
          <div className="log-entry__error">{entry.message}</div>
        )}
      </div>
    </div>
  );
}
