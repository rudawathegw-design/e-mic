# E Mic

Offline English & Arabic voice-to-text dictation for Windows. Hold a key, speak,
release — your words are transcribed locally (Whisper) and pasted into any app.

- **App source:** [`app/`](app/) — Electron app, see [`app/README.md`](app/README.md)
- **Website:** [`site/`](site/) — published via GitHub Pages
- **Downloads:** [Latest release](https://github.com/rudawathegw-design/e-mic/releases/latest)

## Publishing a new version

1. Bump `version` in `app/package.json`.
2. From `app/`, run:
   ```bash
   set GH_TOKEN=<your token>   &&  npm run publish
   ```
   This builds the web installer and uploads it to a GitHub Release as a draft.
3. Edit the draft release notes, then **Publish release**.
4. Installed apps auto-check on launch and will offer the update.

### Forcing a mandatory update

Put `[mandatory]` (or `[force]` / `[required]`) anywhere in the release notes.
Clients will download and be required to restart & install before continuing.

The download installer is the small **web installer** (nsis-web) — it shows a
live "Downloading… X%" progress screen, then installs.
