# EA MIC — English & Arabic Voice to Text

A private, **fully offline** desktop dictation app for Windows. Hold a key, speak,
release — your words are transcribed locally and pasted into whatever app you're
using. English and Arabic. No internet, no API keys, no per-use cost.

Built from the Claude Design handoff; the UI matches that design (warm "Claude"
theme, custom titlebar, listening pill, license/activation screen).

---

## What's inside

| Piece | How it works | File |
|-------|--------------|------|
| **Speech → text** | Local **Whisper** via `@huggingface/transformers` (onnxruntime-node). Model downloads once, then runs offline. | `src/main/transcribe.js` |
| **Punctuation** | **Rules only — no AI.** Tidies spacing, capitalises, applies your dictionary. | `src/main/punctuate.js` |
| **Push-to-talk** | Hold **Ctrl + Win** anywhere (global hotkey via `uiohook-napi`), or the in-app "Hold to talk" button. | `src/main/main.js` |
| **Paste** | Copies the text, then sends Ctrl+V to the focused app. | `src/main/paste.js` |
| **Trial** | **10 days** from first launch, stored locally. | `src/main/store.js` |
| **License** | **6-digit key**, verified offline by a formula. | `src/main/license.js` |

Everything is stored in your Windows user-data folder
(`%APPDATA%/EA MIC/ea-mic.json` and `/models`).

---

## Run it (development)

```bash
cd app
npm install
npm start
```

First dictation downloads the Whisper model (a few hundred MB) — give it a moment.
After that it's instant and offline.

### Build a Windows installer

```bash
npm run dist
```

---

## The license key (important)

A key is six digits `d1 d2 d3 d4 d5 d6`. It is **valid** when:

```
d6 = (d1·2 + d2·3 + d3·4 + d4·5 + d5·6 + 7) mod 10
```

The **secret** is the `+7` in `src/main/license.js` (`SECRET`). Anyone who doesn't
know it can't forge keys. Change it to any digit and rebuild to invalidate all
old keys.

These are **universal** keys — each one works on any PC.

### Generate keys to sell

```bash
npm run keys        # prints 10 valid keys
npm run keys 50     # prints 50 valid keys
npm run keys check 042397   # test a single key
```

When a customer pays the **19,000 IQD** to your **FIB number** (shown on the
license screen), give them one of these codes. They type it into
**Settings → Enter key / the license screen** and the app unlocks for good.

> To change the price or FIB number, edit `PRICE` and `FIB_NUMBER` at the top of
> the License section in `src/renderer/screens.jsx`.

---

## Settings the app exposes

- **Model** — Whisper size (Base/Small/Medium). Bigger = more accurate, slower.
- **Dictation language** — English / العربية / Auto-detect.
- **Output mode** — Paste, type, or copy-only.
- **Auto-punctuation** — on/off (the rules clean-up).
- **Push-to-talk shortcut**, **launch on startup**, etc.

---

## Notes / known limits

- Windows-only paste + global hotkey (PowerShell SendKeys + uiohook).
- If `uiohook-napi` can't load, the global hotkey is disabled but the in-app
  button still works.
- `webSecurity` is disabled in the renderer because it's a local, trusted app
  loading its own files — do not load remote/untrusted content into this window.
