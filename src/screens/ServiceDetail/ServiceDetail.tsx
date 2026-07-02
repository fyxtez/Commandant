import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import Button from "../../components/Button/Button";
import LogEntry from "../../components/LogEntry/LogEntry";
import type { ActionKind, ActionLogEntry, HostConfig, ServiceEntry } from "../../types";
import "./ServiceDetail.css";

interface Props {
  service: ServiceEntry;
  preset: HostConfig | null;
  isActive: boolean | null;
  onBack: () => void;
  onLogAppended: (entry: ActionLogEntry) => void;
  onClearHistory: () => void;
  onDelete: () => void;
  onStatusUpdated: (active: boolean | null) => void;
}

interface RunActionResult {
  success: boolean;
  exit_code: number | null;
  message: string;
}

type LogMode = "simple" | "full";

function stripJournalPrefix(line: string): string {
  const match = line.match(/\S+\[\d+\](?:\[\d+\])?: (.+)/);
  return match ? match[1] : line;
}

function formatLine(line: string, mode: LogMode): string {
  return mode === "simple" ? stripJournalPrefix(line) : line;
}

export default function ServiceDetail({
  service,
  preset,
  isActive,
  onBack,
  onLogAppended,
  onClearHistory,
  onDelete,
  onStatusUpdated,
}: Props) {
  const [pending, setPending] = useState<ActionKind | null>(null);
  const [logMode, setLogMode] = useState<LogMode>("simple");

  // last 100 logs modal
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsContent, setLogsContent] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // live logs modal
  const [liveOpen, setLiveOpen] = useState(false);
  const [liveLines, setLiveLines] = useState<string[]>([]);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveBottomRef = useRef<HTMLDivElement>(null);
  const unlistenLine = useRef<UnlistenFn | null>(null);
  const unlistenEnd = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    if (liveOpen) {
      liveBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLines, liveOpen]);

  useEffect(() => {
    return () => {
      unlistenLine.current?.();
      unlistenEnd.current?.();
      if (liveRunning) invoke("stop_live_logs").catch(() => {});
    };
  }, []);

  async function refreshStatus() {
    if (!preset) return;
    try {
      const active = await invoke<boolean>("check_service_active", {
        presetId: service.preset_id,
        unitName: service.unit_name,
      });
      onStatusUpdated(active);
    } catch {
      onStatusUpdated(null);
    }
  }

  async function runAction(action: ActionKind) {
    if (!preset) return;
    setPending(action);
    try {
      const result = await invoke<RunActionResult>("run_systemd_action", {
        presetId: service.preset_id,
        unitName: service.unit_name,
        action,
      });
      onLogAppended({
        timestamp: new Date().toISOString(),
        action,
        success: result.success,
        exit_code: result.exit_code,
        message: result.message,
      });
      // Refresh active status after action
      await refreshStatus();
    } catch (err) {
      onLogAppended({
        timestamp: new Date().toISOString(),
        action,
        success: false,
        exit_code: null,
        message: String(err),
      });
    } finally {
      setPending(null);
    }
  }

  async function openLogs() {
    if (!preset) return;
    setLogsOpen(true);
    setLogsContent(null);
    setLogsError(null);
    setLogsLoading(true);
    try {
      const output = await invoke<string>("fetch_service_logs", {
        presetId: service.preset_id,
        unitName: service.unit_name,
      });
      setLogsContent(output || "(no output)");
      onLogAppended({
        timestamp: new Date().toISOString(),
        action: "logs",
        success: true,
        exit_code: null,
        message: "",
      });
    } catch (err) {
      setLogsError(String(err));
      onLogAppended({
        timestamp: new Date().toISOString(),
        action: "logs",
        success: false,
        exit_code: null,
        message: String(err),
      });
    } finally {
      setLogsLoading(false);
    }
  }

  async function openLiveLogs() {
    if (!preset) return;
    setLiveOpen(true);
    setLiveLines([]);
    setLiveError(null);
    setLiveRunning(true);

    unlistenLine.current = await listen<string>("live-log-line", (event) => {
      setLiveLines((prev) => [...prev.slice(-500), event.payload]);
    });

    unlistenEnd.current = await listen<string>("live-log-ended", (event) => {
      setLiveRunning(false);
      if (event.payload.startsWith("error:")) setLiveError(event.payload);
    });

    try {
      await invoke("start_live_logs", {
        presetId: service.preset_id,
        unitName: service.unit_name,
      });
    } catch (err) {
      setLiveError(String(err));
      setLiveRunning(false);
    }
  }

  async function closeLiveLogs() {
    await invoke("stop_live_logs").catch(() => {});
    unlistenLine.current?.();
    unlistenEnd.current?.();
    unlistenLine.current = null;
    unlistenEnd.current = null;
    setLiveRunning(false);
    setLiveOpen(false);
    setLiveLines([]);
  }

  const reversedLog = [...service.log].reverse();
  const activeKind = isActive === true ? "ok" : isActive === false ? "danger" : "idle";
  const activeLabel = isActive === true ? "active" : isActive === false ? "inactive" : "unknown";

  return (
    <div className="service-detail">
      <div className="service-detail__scroll">
        <Button onClick={onBack} className="service-detail__back">
          ← Back
        </Button>

        <div className="service-detail__header">
          <div className="service-detail__title-row">
            <h1 className="service-detail__label">{service.label}</h1>
            <div className={`service-detail__status service-detail__status--${activeKind}`}>
              <span className={`service-detail__status-dot service-detail__status-dot--${activeKind}`} />
              {activeLabel}
            </div>
          </div>
          <p className="service-detail__unit">{service.unit_name}</p>
          {preset && (
            <p className="service-detail__preset">{preset.name} · {preset.username}@{preset.host}</p>
          )}
          {!preset && (
            <p className="service-detail__preset service-detail__preset--missing">
              ⚠ Preset not found — go to Presets and add it back
            </p>
          )}
        </div>

        <div className="service-detail__actions">
          <button
            className="action-btn action-btn--start"
            disabled={pending !== null || !preset}
            onClick={() => runAction("start")}
          >
            <span className="action-btn__icon">▶</span>
            {pending === "start" ? "…" : "Start"}
          </button>
          <button
            className="action-btn action-btn--stop"
            disabled={pending !== null || !preset}
            onClick={() => runAction("stop")}
          >
            <span className="action-btn__icon">■</span>
            {pending === "stop" ? "…" : "Stop"}
          </button>
          <button
            className="action-btn action-btn--restart"
            disabled={pending !== null || !preset}
            onClick={() => runAction("restart")}
          >
            <span className="action-btn__icon">↺</span>
            {pending === "restart" ? "…" : "Restart"}
          </button>
        </div>

        <div className="log-btn-row">
          <button className="logs-btn" onClick={openLogs} disabled={!preset}>
            Last 100 logs
          </button>
          <button className="logs-btn logs-btn--live" onClick={openLiveLogs} disabled={!preset}>
            <span className="logs-btn__pulse" />
            Live logs
          </button>
        </div>

        <div className="service-detail__history-header">
          <p className="service-detail__section-title">History</p>
          {reversedLog.length > 0 && (
            <button className="service-detail__clear-btn" onClick={onClearHistory}>
              Clear
            </button>
          )}
        </div>

        {reversedLog.length === 0 ? (
          <p className="service-detail__empty">No actions run yet.</p>
        ) : (
          <div className="service-detail__log">
            {reversedLog.map((entry, i) => (
              <LogEntry key={i} entry={entry} />
            ))}
          </div>
        )}

        <button className="service-detail__delete-btn" onClick={onDelete}>
          Delete service
        </button>
      </div>

      {/* Last 100 logs modal */}
      {logsOpen && (
        <div className="logs-overlay" onClick={() => setLogsOpen(false)}>
          <div className="logs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal__header">
              <span className="logs-modal__title">
                last 100 · {service.unit_name}
              </span>
              <div className="logs-modal__controls">
                <div className="log-mode-toggle">
                  <button
                    className={`log-mode-btn ${logMode === "simple" ? "log-mode-btn--active" : ""}`}
                    onClick={() => setLogMode("simple")}
                  >
                    Simple
                  </button>
                  <button
                    className={`log-mode-btn ${logMode === "full" ? "log-mode-btn--active" : ""}`}
                    onClick={() => setLogMode("full")}
                  >
                    Full
                  </button>
                </div>
                <button className="logs-modal__close" onClick={() => setLogsOpen(false)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="logs-modal__body">
              {logsLoading && <p className="logs-modal__status">Fetching…</p>}
              {logsError && (
                <p className="logs-modal__status logs-modal__status--error">{logsError}</p>
              )}
              {logsContent && (
                <pre className="logs-modal__pre">
                  {logsContent
                    .split("\n")
                    .map((l) => formatLine(l, logMode))
                    .join("\n")}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live logs modal */}
      {liveOpen && (
        <div className="logs-overlay">
          <div className="logs-modal">
            <div className="logs-modal__header">
              <span className="logs-modal__title">
                {liveRunning && <span className="live-indicator" />}
                live · {service.unit_name}
              </span>
              <div className="logs-modal__controls">
                <div className="log-mode-toggle">
                  <button
                    className={`log-mode-btn ${logMode === "simple" ? "log-mode-btn--active" : ""}`}
                    onClick={() => setLogMode("simple")}
                  >
                    Simple
                  </button>
                  <button
                    className={`log-mode-btn ${logMode === "full" ? "log-mode-btn--active" : ""}`}
                    onClick={() => setLogMode("full")}
                  >
                    Full
                  </button>
                </div>
                <button className="logs-modal__close" onClick={closeLiveLogs}>
                  ✕
                </button>
              </div>
            </div>
            <div className="logs-modal__body logs-modal__body--live">
              {liveLines.length === 0 && !liveError && (
                <p className="logs-modal__status">Connecting…</p>
              )}
              {liveError && (
                <p className="logs-modal__status logs-modal__status--error">{liveError}</p>
              )}
              {liveLines.map((line, i) => (
                <div key={i} className="live-line">
                  {formatLine(line, logMode)}
                </div>
              ))}
              <div ref={liveBottomRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
