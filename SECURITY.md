# Security Policy

## Threat model

Commandant is a single-user, single-device tool. The security model is designed around that constraint — it is not a general-purpose credential manager or a multi-user system.

### What is protected

- **SSH private key** — stored in the app's private data directory (`/data/data/<app_id>/files/` on Android), which is protected by Android's per-app sandbox. No other app can read it without root access.
- **Host configuration** — stored in the same location as the key.
- **SSH connections** — each action opens a fresh SSH session, runs exactly one command, and disconnects immediately. No persistent session is held open.
- **Command allow-list** — the app can only execute `systemctl start`, `systemctl stop`, `systemctl restart`, and `journalctl`. Arbitrary shell commands are not possible, by design.

### Accepted tradeoffs

- **No Android Keystore** — the private key is not stored in hardware-backed secure storage. This was a deliberate decision to avoid the significant complexity of Android Keystore integration for a personal-use tool. If you require hardware-backed key storage, this app is not the right tool.
- **No host key verification** — SSH host keys are accepted without verification (equivalent to `StrictHostKeyChecking no`). Since this app is designed for a single known host, a "first connection, trust this fingerprint?" prompt was considered out of scope for v1.
- **Local storage only** — no credentials or data ever leave the device except via the SSH connection to your own server.

### What this app is not designed for

- Shared devices
- Team/multi-user environments
- Storing credentials for servers you do not control
- Production environments requiring compliance or auditing

---

## Reporting a vulnerability

If you discover a security vulnerability, please **do not open a public GitHub issue**.

Instead, email: **fyxtez@gmail.com**

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix if you have one

I aim to respond within 72 hours and will credit you in the fix if you'd like.
