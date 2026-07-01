mod ssh;

use serde::{Deserialize, Serialize};
use tauri::{Emitter, State};
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Preset {
    id: String,
    name: String,
    host: String,
    port: u16,
    username: String,
    private_key: String,
}

#[derive(Debug, Serialize)]
struct RunActionResult {
    success: bool,
    exit_code: Option<i32>,
    message: String,
}

struct LiveLogState {
    stop_tx: Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
}

fn validate_action(action: &str) -> Result<&'static str, String> {
    match action {
        "start" => Ok("start"),
        "stop" => Ok("stop"),
        "restart" => Ok("restart"),
        other => Err(format!("'{other}' is not a permitted action")),
    }
}

fn load_preset_by_id(app: &tauri::AppHandle, preset_id: &str) -> Result<Preset, String> {
    let store = app.store("commandant.json").map_err(|e| e.to_string())?;
    let value = store
        .get("presets")
        .ok_or_else(|| "No presets configured — add a preset first".to_string())?;
    let presets: Vec<Preset> =
        serde_json::from_value(value.clone()).map_err(|e| e.to_string())?;
    presets
        .into_iter()
        .find(|p| p.id == preset_id)
        .ok_or_else(|| format!("Preset not found: {preset_id}"))
}

#[tauri::command]
async fn run_systemd_action(
    app: tauri::AppHandle,
    preset_id: String,
    unit_name: String,
    action: String,
) -> Result<RunActionResult, String> {
    let action = validate_action(&action)?;
    if unit_name.trim().is_empty() {
        return Err("unit_name must not be empty".into());
    }
    let preset = load_preset_by_id(&app, &preset_id)?;
    let outcome = ssh::run_systemctl_command(
        &preset.host,
        preset.port,
        &preset.username,
        &preset.private_key,
        &unit_name,
        action,
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(RunActionResult {
        success: outcome.success,
        exit_code: outcome.exit_code,
        message: outcome.message,
    })
}

#[tauri::command]
async fn fetch_service_logs(
    app: tauri::AppHandle,
    preset_id: String,
    unit_name: String,
) -> Result<String, String> {
    if unit_name.trim().is_empty() {
        return Err("unit_name must not be empty".into());
    }
    let preset = load_preset_by_id(&app, &preset_id)?;
    let outcome = ssh::run_systemctl_command(
        &preset.host,
        preset.port,
        &preset.username,
        &preset.private_key,
        &unit_name,
        "logs",
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(outcome.message)
}

#[tauri::command]
async fn check_service_active(
    app: tauri::AppHandle,
    preset_id: String,
    unit_name: String,
) -> Result<bool, String> {
    if unit_name.trim().is_empty() {
        return Err("unit_name must not be empty".into());
    }
    let preset = load_preset_by_id(&app, &preset_id)?;
    let outcome = ssh::run_systemctl_command(
        &preset.host,
        preset.port,
        &preset.username,
        &preset.private_key,
        &unit_name,
        "is-active",
    )
    .await
    .map_err(|e| e.to_string())?;
    // systemctl is-active exits 0 if active, non-zero otherwise
    Ok(outcome.success)
}

#[tauri::command]
async fn start_live_logs(
    app: tauri::AppHandle,
    state: State<'_, LiveLogState>,
    preset_id: String,
    unit_name: String,
) -> Result<(), String> {
    if unit_name.trim().is_empty() {
        return Err("unit_name must not be empty".into());
    }
    {
        let mut guard = state.stop_tx.lock().await;
        if let Some(tx) = guard.take() {
            let _ = tx.send(());
        }
    }
    let preset = load_preset_by_id(&app, &preset_id)?;
    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let mut guard = state.stop_tx.lock().await;
        *guard = Some(stop_tx);
    }
    let app_clone = app.clone();
    tokio::spawn(async move {
        let result = ssh::stream_journalctl(
            &preset.host,
            preset.port,
            &preset.username,
            &preset.private_key,
            &unit_name,
            stop_rx,
            move |line| {
                let _ = app_clone.emit("live-log-line", line);
            },
        )
        .await;
        let msg = match result {
            Ok(_) => "stopped".to_string(),
            Err(e) => format!("error: {e}"),
        };
        let _ = app.emit("live-log-ended", msg);
    });
    Ok(())
}

#[tauri::command]
async fn stop_live_logs(state: State<'_, LiveLogState>) -> Result<(), String> {
    let mut guard = state.stop_tx.lock().await;
    if let Some(tx) = guard.take() {
        let _ = tx.send(());
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(LiveLogState {
            stop_tx: Mutex::new(None),
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            run_systemd_action,
            fetch_service_logs,
            check_service_active,
            start_live_logs,
            stop_live_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running commandant");
}
