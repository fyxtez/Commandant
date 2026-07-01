# Commandant

One-tap systemd control from your Android phone.

Commandant lets you start, stop, and restart systemd services on a remote Linux server over SSH — directly from your phone, in under 10 seconds. No terminal, no remembering commands, no laptop required.

Built for developers and indie hackers who self-host on a VPS and need a reliable kill switch when something breaks at 3am.

---

## What it does

- **Start / Stop / Restart** any systemd service with one tap
- **Live logs** — stream `journalctl -f` output in real time
- **Last 100 logs** — fetch recent logs on demand, with simple or full view
- **Active status** — see at a glance whether each service is running or not, polled automatically every 10 minutes
- **Multiple hosts** — configure different SSH hosts and assign services to them
- **Action history** — per-service log of every action taken

## What it does not do

- No arbitrary shell commands — only `systemctl start/stop/restart` and `journalctl`. By design.
- No multi-user, no cloud sync, no backend server of any kind
- No Play Store telemetry or ads

---

## Screenshots

> Coming soon

---

## Tech stack

- **Frontend** — React + TypeScript (Vite)
- **Backend** — Rust (Tauri 2.0)
- **SSH** — [russh](https://github.com/warp-tech/russh) (pure Rust, no C dependency)
- **Storage** — `tauri-plugin-store` (local JSON, app-private directory)

---

## Building from source

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 18+
- [Tauri CLI](https://tauri.app/start/prerequisites/)
- Android SDK + NDK (for Android builds)

### Desktop (dev)

```bash
git clone https://github.com/fyxtez/commandant
cd commandant
npm install
npm run tauri dev
```

### Android (debug APK)

```bash
npx tauri android init   # first time only
npx tauri android build --apk --debug
```

The APK will be at:
```
src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Transfer it to your phone and install. You'll need to enable **Install from unknown sources** in Android settings.

### Android (release APK)

You'll need a signing keystore. Follow [Tauri's Android signing guide](https://tauri.app/distribute/google-play/) to set one up, then:

```bash
npx tauri android build --apk
```

---

## Security model

Commandant stores your SSH private key in the app's private data directory on Android, protected by the OS-level per-app sandbox. It is **not** stored in Android Keystore (hardware-backed). This is a deliberate tradeoff — Commandant is designed for a single user on their own device, not as a general-purpose credential manager.

See [SECURITY.md](SECURITY.md) for the full threat model and how to report vulnerabilities.

---

## License

MIT — see [LICENSE](LICENSE)
