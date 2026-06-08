# E Mic — Android

Native Android port of E Mic (the offline English voice-to-text app), built to
match the Claude Design handoff (`../E Mic Mobile.zip` →
`E Mic Android.html` + `mobile.jsx`). Kotlin + Jetpack Compose, with on-device
speech recognition via **whisper.cpp** — the same Whisper family the desktop app
uses, so it stays fully offline and private.

## What's implemented

| Area | Status |
|------|--------|
| Theme, fonts, colors (1:1 with the prototype tokens) | ✅ |
| Home (greeting, trial banner, stats, scratchpad, recent) | ✅ |
| History (search, copy, delete, grouped by day) | ✅ |
| Settings (model/output cycles, toggles, license row) | ✅ |
| License / Buy (19,000 IQD, FIB transfer steps, activation) | ✅ |
| Trial → Expired → Pro states | ✅ |
| Activation code check (ports desktop `license.js` formula) | ✅ |
| Floating bubble overlay (draggable, snap-to-edge, foreground service) | ✅ |
| Dictation sheet (listening → transcribing → result, Copy/Insert/Redo) | ✅ |
| Insert-into-any-app (Accessibility service) | ✅ |
| Start-on-boot (BootReceiver) | ✅ |
| whisper.cpp JNI bridge + audio capture (16 kHz mono) | ✅ wiring, ⛏ needs sources + model |
| Auto-punctuation / cleanup (ports desktop `punctuate.js`) | ✅ |
| GitHub Actions APK build (`.github/workflows/android.yml`) | ✅ |
| Signed release build (PKCS12 keystore from repo secrets) | ✅ |
| Quantised model (`base.en` q5_1, ~57 MB) | ✅ |
| Official Google Fonts prod certificate | ✅ |

## Prerequisites

- **Android Studio** (Koala or newer) — provides the JDK 17, Android SDK, NDK,
  and the Gradle wrapper. This machine has no Android toolchain installed, so the
  project has not been compiled here; open it in Android Studio to build.
- Android SDK 34, NDK + CMake (install via SDK Manager → SDK Tools).

## First build (UI only — no speech yet)

1. Open the `android/` folder in Android Studio and let it sync.
2. Run on a device/emulator. The whole UI works; tapping Done on the dictation
   sheet shows a placeholder until whisper.cpp is added (next section).

## Enable on-device speech (whisper.cpp)

1. Vendor whisper.cpp into the native source tree:
   ```bash
   cd android
   git submodule add https://github.com/ggerganov/whisper.cpp \
       app/src/main/cpp/whisper
   ```
   (CMake auto-detects it; without it the app builds with a stub and
   `WhisperBridge.nativeAvailable` is false.)
2. Add a Whisper model (GGML/GGUF, English) at
   `app/src/main/assets/models/ggml-base.en.bin`. Recommended: the q5_1
   quantised `base.en` (~57 MB) — matches the desktop default. Download from the
   whisper.cpp model list. It's copied to internal storage on first run.
3. Rebuild. `n_threads` and model path are set in `cpp/whisper_jni.cpp` /
   `stt/WhisperBridge.kt`.

> Auto-punctuation/cleanup is handled by `stt/Punctuate.kt`, a direct port of
> the desktop `app/src/main/punctuate.js` (strip non-speech, grammar, terminal
> punctuation, fuzzy dictionary). It's gated by the **Auto-punctuation** toggle
> and applied to the raw Whisper output in `DictationActivity`.

## Build the APK in CI (no local toolchain needed)

`.github/workflows/android.yml` builds an installable **debug APK** on GitHub's
runners — handy since neither this machine nor a phone can build locally.

- **Trigger:** push a tag like `android-v1.0.0`, or run it manually
  (Actions → "Build E Mic Android" → Run workflow).
- **What it does:** installs JDK 17 + Android SDK/NDK/CMake, clones whisper.cpp,
  downloads `ggml-base.en.bin`, injects the license `SECRET` from the
  `LICENSE_SECRET` repo secret (same one the desktop release uses), then runs
  `gradle assembleDebug`.
- **Output:** the APK is uploaded as a build artifact, and on tag builds it's
  attached to the GitHub Release. Download it and install on your phone (enable
  "Install unknown apps").

Set the `LICENSE_SECRET` repo secret (Settings → Secrets → Actions) to the same
digit as the desktop, or activation codes won't validate.

### Release signing

The release build is signed with a PKCS12 keystore supplied via repo secrets:

- `ANDROID_KEYSTORE_BASE64` — base64 of the `.p12` keystore
- `ANDROID_KEYSTORE_PASSWORD` — store/key password
- `ANDROID_KEY_ALIAS` — key alias (`emic`)

These are already configured for this repo. CI decodes the keystore, builds
`assembleRelease`, and the signed `EMic-android.apk` is attached to the Release.
If the keystore secret is absent the build still succeeds but produces an
unsigned APK. **Keep the keystore + password safe** — the same key is required
to publish app updates. Local signing config lives in `app/build.gradle.kts`
(reads `ANDROID_KEYSTORE_PATH` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS`
from the environment).

> The keystore was generated with OpenSSL (PKCS12); Android accepts it via
> `storeType = "PKCS12"`. For Play Store upload you can keep this key or enrol
> in Play App Signing.

## Activation codes / SECRET

`license/License.kt` mirrors the desktop `src/main/license.js` 6-digit check.
Set `SECRET` to the **same digit** as the desktop's gitignored `secret.js`.
Don't hardcode it for release — inject via a `BuildConfig` field from a
gitignored Gradle property:

```kotlin
// app/build.gradle.kts → defaultConfig
buildConfigField("int", "LICENSE_SECRET", (project.findProperty("emicSecret") ?: "0").toString())
```
then read `BuildConfig.LICENSE_SECRET` in `License.kt`.

## Permissions the app requests at runtime

- **Microphone** (`RECORD_AUDIO`) — asked on first dictation.
- **Draw over other apps** (`SYSTEM_ALERT_WINDOW`) — asked when "Floating
  bubble" is enabled in Settings; sends the user to the system grant screen.
- **Accessibility** — the user enables "E Mic — insert dictated text" in
  Settings → Accessibility so Insert can type into other apps. (We only write on
  Insert; we never read screen content.)
- **Notifications** (Android 13+) for the foreground-service notice.

## Fonts

Uses Google Downloadable Fonts (Hanken Grotesk / Newsreader / JetBrains Mono).
For release, add the official **prod** font certificate to
`res/values/font_certs.xml` (see the comment in that file) or the UI falls back
to the system font.

## Project layout

```
app/src/main/
  java/iq/fib/eamic/
    MainActivity.kt            app shell + bottom nav + overlay wiring
    EaMicApp.kt                Application (warms Repository)
    data/                      Models, Repository (DataStore + JSON history)
    license/License.kt         6-digit activation check (port of license.js)
    ui/theme/                  Color / Type / Theme (prototype tokens)
    ui/components/             Brandmark, LiveWave, Badge, Card, TrialBanner
    ui/screens/                Home, History, Settings, License
    overlay/                   OverlayService (bubble), DictationActivity (sheet), BootReceiver
    accessibility/             InsertAccessibilityService
    stt/                       WhisperBridge (JNI), AudioRecorder
  cpp/                         CMakeLists + whisper_jni.cpp (+ stub)
  res/                         layouts, drawables, themes, strings, font certs
```
