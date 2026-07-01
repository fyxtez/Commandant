import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import Button from "../../components/Button/Button";
import LogEntry from "../../components/LogEntry/LogEntry";
import type { ActionKind, ActionLogEntry, ServiceEntry } from "../../types";
import "./ServiceDetail.css";

interface Props {
  service: ServiceEntry;
  onBack: () => void;
  onLogAppended: (entry: ActionLogEntry) => void;
  onClearHistory: () => void;
}

interface RunActionResult {
  success: boolean;
  exit_code: number | null;
  message: string;
}

export default function ServiceDetail({ service, onBack, onLogAppended, onClearHistory }: Props) {
  const [pending, setPending] = useState<ActionKind | null>(null);

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

  // Auto-scroll live log to bottom on new lines
  useEffect(() => {
    if (liveOpen) {
      liveBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLines, liveOpen]);

  // Clean up listeners when component unmounts
  useEffect(() => {
    return () => {
      unlistenLine.current?.();
      unlistenEnd.current?.();
      if (liveRunning) {
        invoke("stop_live_logs").catch(() => {});
      }
    };
  }, []);

  async function runAction(action: ActionKind) {
    setPending(action);
    try {
      const result = await invoke<RunActionResult>("run_systemd_action", {
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
    setLogsOpen(true);
    setLogsContent(null);
    setLogsError(null);
    setLogsLoading(true);
    try {
      const output = await invoke<string>("fetch_service_logs", {
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
    setLiveOpen(true);
    setLiveLines([]);
    setLiveError(null);
    setLiveRunning(true);

    // Set up event listeners before starting the stream
    unlistenLine.current = await listen<string>("live-log-line", (event) => {
      setLiveLines((prev) => [...prev.slice(-500), event.payload]);
    });

    unlistenEnd.current = await listen<string>("live-log-ended", (event) => {
      setLiveRunning(false);
      if (event.payload.startsWith("error:")) {
        setLiveError(event.payload);
      }
    });

    try {
      await invoke("start_live_logs", { unitName: service.unit_name });
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

  return (
    <div className="service-detail">
      <div className="service-detail__scroll">
        <Button onClick={onBack} className="service-detail__back">
          ← Back
        </Button>

        <div className="service-detail__header">
          <h1 className="service-detail__label">{service.label}</h1>
          <p className="service-detail__unit">{service.unit_name}</p>
        </div>

        <div className="service-detail__actions">
          <button
            className="action-btn action-btn--start"
            disabled={pending !== null}
            onClick={() => runAction("start")}
          >
            <span className="action-btn__icon">▶</span>
            {pending === "start" ? "…" : "Start"}
          </button>
          <button
            className="action-btn action-btn--stop"
            disabled={pending !== null}
            onClick={() => runAction("stop")}
          >
            <span className="action-btn__icon">■</span>
            {pending === "stop" ? "…" : "Stop"}
          </button>
          <button
            className="action-btn action-btn--restart"
            disabled={pending !== null}
            onClick={() => runAction("restart")}
          >
            <span className="action-btn__icon">↺</span>
            {pending === "restart" ? "…" : "Restart"}
          </button>
        </div>

        <div className="log-btn-row">
          <button className="logs-btn" onClick={openLogs}>
            Last 100 logs
          </button>
          <button className="logs-btn logs-btn--live" onClick={openLiveLogs}>
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
      </div>

      {/* Last 100 logs modal */}
      {logsOpen && (
        <div className="logs-overlay" onClick={() => setLogsOpen(false)}>
          <div className="logs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal__header">
              <span className="logs-modal__title">
                journalctl · {service.unit_name} · last 100
              </span>
              <button className="logs-modal__close" onClick={() => setLogsOpen(false)}>
                ✕
              </button>
            </div>
            <div className="logs-modal__body">
              {logsLoading && <p className="logs-modal__status">Fetching…</p>}
              {logsError && (
                <p className="logs-modal__status logs-modal__status--error">{logsError}</p>
              )}
              {logsContent && (
                <pre className="logs-modal__pre">{logsContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live logs modal */}
      {liveOpen && (
        <div className="logs-overlay">
          <div className="logs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logs-modal__header">
              <span className="logs-modal__title">
                {liveRunning && <span className="live-indicator" />}
                live · {service.unit_name}
              </span>
              <button className="logs-modal__close" onClick={closeLiveLogs}>
                ✕
              </button>
            </div>
            <div className="logs-modal__body logs-modal__body--live">
              {liveLines.length === 0 && !liveError && (
                <p className="logs-modal__status">Connecting…</p>
              )}
              {liveError && (
                <p className="logs-modal__status logs-modal__status--error">{liveError}</p>
              )}
              {liveLines.map((line, i) => (
                <div key={i} className="live-line">{line}</div>
              ))}
              <div ref={liveBottomRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
