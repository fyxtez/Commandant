mod ssh;

use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HostConfig {
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

/// Hard allow-list — the only three things this app can ever ask the host to do.
fn validate_action(action: &str) -> Result<&'static str, String> {
    match action {
        "start" => Ok("start"),
        "stop" => Ok("stop"),
        "restart" => Ok("restart"),
        other => Err(format!("'{other}' is not a permitted action")),
    }
}

#[tauri::command]
async fn run_systemd_action(
    app: tauri::AppHandle,
    unit_name: String,
    action: String,
) -> Result<RunActionResult, String> {
    // Validate action before touching anything else
    let action = validate_action(&action)?;

    if unit_name.trim().is_empty() {
        return Err("unit_name must not be empty".into());
    }

    // Load host config from store
    let store = app
        .store("commandant.json")
        .map_err(|e| e.to_string())?;

    let config_value = store
        .get("host_config")
        .ok_or_else(|| "No host configured — open Settings first".to_string())?;

    let config: HostConfig =
        serde_json::from_value(config_value.clone()).map_err(|e| e.to_string())?;

    // Run SSH command
    let outcome = ssh::run_systemctl_command(
        &config.host,
        config.port,
        &config.username,
        &config.private_key,
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
    unit_name: String,
) -> Result<String, String> {
    if unit_name.trim().is_empty() {
        return Err("unit_name must not be empty".into());
    }

    let store = app
        .store("commandant.json")
        .map_err(|e| e.to_string())?;

    let config_value = store
        .get("host_config")
        .ok_or_else(|| "No host configured — open Settings first".to_string())?;

    let config: HostConfig =
        serde_json::from_value(config_value.clone()).map_err(|e| e.to_string())?;

    let outcome = ssh::run_systemctl_command(
        &config.host,
        config.port,
        &config.username,
        &config.private_key,
        &unit_name,
        "logs",
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(outcome.message)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![run_systemd_action, fetch_service_logs])
        .run(tauri::generate_context!())
        .expect("error while running commandant");
}
