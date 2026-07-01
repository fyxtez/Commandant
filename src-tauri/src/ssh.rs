use async_trait::async_trait;
use russh::client::{self, Handle};
use russh::{ChannelMsg, Disconnect};
use russh_keys::decode_secret_key;
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SshError {
    #[error("could not parse private key: {0}")]
    KeyParse(String),
    #[error("connection failed: {0}")]
    Connect(String),
    #[error("authentication failed — check username and private key")]
    AuthFailed,
    #[error("channel error: {0}")]
    Channel(String),
}

pub struct ActionOutcome {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub message: String,
}

struct ClientHandler;

#[async_trait]
impl client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh_keys::key::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

pub async fn run_systemctl_command(
    host: &str,
    port: u16,
    username: &str,
    private_key_pem: &str,
    unit_name: &str,
    action: &str,
) -> Result<ActionOutcome, SshError> {
    let key_pair = decode_secret_key(private_key_pem, None)
        .map_err(|e| SshError::KeyParse(e.to_string()))?;

    let config = Arc::new(client::Config {
        inactivity_timeout: Some(Duration::from_secs(10)),
        ..Default::default()
    });

    let mut session: Handle<ClientHandler> =
        client::connect(config, (host, port), ClientHandler)
            .await
            .map_err(|e| SshError::Connect(e.to_string()))?;

    let authenticated = session
        .authenticate_publickey(username, Arc::new(key_pair))
        .await
        .map_err(|e| SshError::Connect(e.to_string()))?;

    if !authenticated {
        let _ = session.disconnect(Disconnect::ByApplication, "", "en").await;
        return Err(SshError::AuthFailed);
    }

    let command = if action == "logs" {
        format!("journalctl -u {} -n 100 --no-pager", shell_quote(unit_name))
    } else {
        format!("systemctl {} {}", action, shell_quote(unit_name))
    };

    let mut channel = session
        .channel_open_session()
        .await
        .map_err(|e| SshError::Channel(e.to_string()))?;

    channel
        .exec(true, command.as_bytes())
        .await
        .map_err(|e| SshError::Channel(e.to_string()))?;

    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let mut exit_code: Option<i32> = None;

    // IMPORTANT: don't break on Eof — ExitStatus can arrive after Eof in some
    // SSH implementations. Only break on Close or when the channel returns None.
    loop {
        match channel.wait().await {
            Some(ChannelMsg::Data { data }) => stdout.extend_from_slice(&data),
            Some(ChannelMsg::ExtendedData { data, .. }) => stderr.extend_from_slice(&data),
            Some(ChannelMsg::ExitStatus { exit_status }) => {
                exit_code = Some(exit_status as i32);
            }
            Some(ChannelMsg::Close) | None => break,
            _ => {}
        }
    }

    let _ = session.disconnect(Disconnect::ByApplication, "", "en").await;

    let success = exit_code == Some(0);
    let message = if success {
        String::from_utf8_lossy(&stdout).trim().to_string()
    } else {
        let err = String::from_utf8_lossy(&stderr).trim().to_string();
        if err.is_empty() {
            String::from_utf8_lossy(&stdout).trim().to_string()
        } else {
            err
        }
    };

    Ok(ActionOutcome {
        success,
        exit_code,
        message,
    })
}

fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}
