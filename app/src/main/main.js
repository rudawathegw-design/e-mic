// main.js — Electron main process for E Mic.
import { app, BrowserWindow, ipcMain, clipboard, screen } from "electron";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import * as store from "./store.js";
import { isValidKey } from "./license.js";
import { transcribe, resetModel } from "./transcribe.js";
import { process as processText } from "./punctuate.js";
import { deliver } from "./paste.js";
import { duck, unduck } from "./duck.js";
import { initUpdater, checkForUpdates, downloadUpdate, quitAndInstall, checkSilently, isMandatoryPending } from "./updater.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERER = path.join(__dirname, "..", "renderer", "index.html");
const OVERLAY = path.join(__dirname, "..", "renderer", "overlay.html");

let win = null;        // dashboard
let overlay = null;    // system-wide listening pill

// real Windows account/login name, e.g. "RudawAbdulrahman"
function osUser() {
  try { return os.userInfo().username || "there"; } catch { return "there"; }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 840, minWidth: 900, minHeight: 600,
    frame: false, backgroundColor: "#FAF9F5", show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
      webSecurity: false, backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  win.webContents.session.setPermissionRequestHandler((wc, perm, cb) =>
    cb(perm === "media" || perm === "audioCapture")
  );
  win.loadFile(RENDERER);
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    win = null;
    try { overlay?.destroy(); } catch {}
    overlay = null;
    app.quit();
  });
}

function createOverlay() {
  const wa = screen.getPrimaryDisplay().workArea;   // excludes the taskbar
  const W = 560, H = 96;
  overlay = new BrowserWindow({
    width: W, height: H,
    x: Math.round(wa.x + (wa.width - W) / 2),
    y: wa.y + wa.height - H - 2,     // bottom-center, 2px gap above the taskbar
    frame: false, transparent: true, resizable: false, movable: false,
    skipTaskbar: true, alwaysOnTop: true, focusable: false, hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
      webSecurity: false,
    },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setIgnoreMouseEvents(true, { forward: true }); // click-through
  overlay.loadFile(OVERLAY);
}

// ---- dictation coordination (one place; called by hotkey AND in-app button) ----
function broadcast(channel, payload) {
  win?.webContents.send(channel, payload);
  overlay?.webContents.send(channel, payload);
}
const OW = 560, OH = 96;
function showOverlayOnActiveScreen() {
  if (!overlay || overlay.isDestroyed()) return;
  // place the pill on whichever monitor the cursor is on, just above the taskbar
  const pt = screen.getCursorScreenPoint();
  const wa = screen.getDisplayNearestPoint(pt).workArea;
  overlay.setBounds({
    x: Math.round(wa.x + (wa.width - OW) / 2),
    y: wa.y + wa.height - OH - 2,
    width: OW, height: OH,
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.showInactive();
  overlay.moveTop();   // force above even a focused E Mic window
}

let dictating = false;   // guards against duplicate start/stop events
let capturingShortcut = false;   // true while Settings is recording a new shortcut
function startDictation() {
  if (dictating || capturingShortcut) return;
  if (isMandatoryPending()) { win?.show(); win?.webContents.send("upd", { type: "force" }); return; }
  if (!store.isActive()) {
    // trial over: show an "Upgrade to Pro" pill and open the app on the upgrade page
    win?.webContents.send("trial-expired");
    win?.show();
    showOverlayOnActiveScreen();
    overlay?.webContents.send("upgrade");
    return;
  }
  dictating = true;
  console.log("dictation: start");
  showOverlayOnActiveScreen();
  duck(store.get().settings.duck);   // lower other audio while talking
  broadcast("ptt-start");
}
function stopDictation() {
  if (!dictating) return;
  dictating = false;
  console.log("dictation: stop");
  unduck();   // restore audio
  broadcast("ptt-stop");
}

// ---- configurable global push-to-talk (hold the chosen shortcut anywhere) ----
function setupHotkey() {
  let mod;
  try { mod = require("uiohook-napi"); }
  catch (e) { console.warn("uiohook unavailable — global hotkey off:", e?.message); return; }
  const { uIOhook, UiohookKey } = mod;

  const grp = (...names) => new Set(names.map((n) => UiohookKey[n]).filter((x) => x != null));
  const MODS = {
    ctrl: grp("Ctrl", "CtrlRight"),
    alt: grp("Alt", "AltRight"),
    shift: grp("Shift", "ShiftRight"),
    meta: grp("Meta", "MetaRight"),
  };
  // map a captured key label ("Ctrl","Win","Alt","Shift","A","F9","Space") to a target
  const mainKeycode = (label) => {
    if (!label) return null;
    if (label === "Space") return UiohookKey.Space;
    if (/^[A-Z0-9]$/.test(label)) return UiohookKey[label];
    return UiohookKey[label] ?? null;     // F1..F12, etc.
  };
  function parse(shortcut) {
    const need = { ctrl: false, alt: false, shift: false, meta: false };
    let main = null;
    for (const k of shortcut || []) {
      if (k === "Ctrl") need.ctrl = true;
      else if (k === "Alt") need.alt = true;
      else if (k === "Shift") need.shift = true;
      else if (k === "Win") need.meta = true;
      else main = mainKeycode(k);
    }
    return { need, main };
  }

  const down = new Set();
  let talking = false;
  let stopTimer = null;
  const anyDown = (set) => { for (const c of set) if (down.has(c)) return true; return false; };

  const refresh = () => {
    const sc = parse(store.get().settings.shortcut || ["Ctrl", "Win"]);
    const ctrl = anyDown(MODS.ctrl), alt = anyDown(MODS.alt), shift = anyDown(MODS.shift), meta = anyDown(MODS.meta);
    const modsOk =
      (!sc.need.ctrl || ctrl) && (!sc.need.alt || alt) &&
      (!sc.need.shift || shift) && (!sc.need.meta || meta);
    const mainOk = sc.main == null ? true : down.has(sc.main);
    const hasAny = sc.need.ctrl || sc.need.alt || sc.need.shift || sc.need.meta || sc.main != null;
    const want = hasAny && modsOk && mainOk;

    if (want) {
      // a (re)press cancels any pending stop — absorbs key auto-repeat flicker
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (!talking) { talking = true; startDictation(); }
    } else if (talking && !stopTimer) {
      // only stop if the keys stay released for >150ms (ignore repeat flicker)
      stopTimer = setTimeout(() => { stopTimer = null; talking = false; stopDictation(); }, 150);
    }
  };

  uIOhook.on("keydown", (e) => { down.add(e.keycode); refresh(); });
  uIOhook.on("keyup", (e) => { down.delete(e.keycode); refresh(); });

  try { uIOhook.start(); console.log("global hotkey active (configurable, default Ctrl + Win)"); }
  catch (e) { console.warn("uiohook start failed:", e?.message); }
  app.on("will-quit", () => { try { uIOhook.stop(); } catch {} });
}

function setupIpc() {
  ipcMain.on("win:minimize", () => win?.minimize());
  ipcMain.on("win:maximize", () => (win?.isMaximized() ? win.unmaximize() : win?.maximize()));
  ipcMain.on("win:close", () => win?.close());

  ipcMain.handle("state:get", () => {
    const s = store.get();
    return {
      user: osUser(),
      licensed: s.licensed,
      trialDaysLeft: store.trialDaysLeft(),
      active: store.isActive(),
      settings: s.settings,
      dictionary: s.dictionary,
      history: s.history,
    };
  });

  ipcMain.handle("settings:set", (_e, settings) => {
    const prev = store.get().settings;
    store.patch({ settings });
    if (settings.model !== prev.model) resetModel();
    applyStartup(settings.startup);
    return true;
  });
  ipcMain.handle("dictionary:set", (_e, dictionary) => { store.patch({ dictionary }); return true; });
  ipcMain.handle("history:set", (_e, history) => { store.patch({ history: history.slice(0, 500) }); return true; });

  ipcMain.handle("license:activate", (_e, rawKey) => {
    if (isValidKey(rawKey)) {
      store.patch({ licensed: true, licenseKey: String(rawKey).replace(/\D/g, "") });
      return { ok: true };
    }
    return { ok: false };
  });

  // in-app "Hold to talk" button uses the same path as the global hotkey
  ipcMain.on("ptt:start", () => startDictation());
  ipcMain.on("ptt:stop", () => stopDictation());
  ipcMain.on("capturing", (_e, v) => { capturingShortcut = !!v; });

  // the overlay (or dashboard) sends captured audio here for transcription
  ipcMain.handle("dictate", async (_e, { audio, peak }) => {
    const fail = (reason, message) => {
      console.log("dictate fail:", reason, message || "");
      const r = { ok: false, reason, message };
      overlay?.webContents.send("dictation-result", r);   // let the overlay hide
      return r;
    };
    if (!store.isActive()) return fail("trial-expired");
    const s = store.get();
    const pcm = audio instanceof Float32Array ? audio : new Float32Array(audio);
    console.log("dictate: samples=" + pcm.length + " (" + (pcm.length / 16000).toFixed(2) + "s) peak=" + (peak != null ? peak.toFixed(3) : "?"));
    if (!pcm.length) return fail("no-audio");
    if (peak != null && peak < 0.012) return fail("silence");
    try {
      const r = await transcribe(pcm, s.settings.model);
      console.log("dictate: whisper raw=" + JSON.stringify(r.text));
      const text = processText(r.text, {
        punctuation: s.settings.punctuation,
        grammar: s.settings.grammar,
        improve: s.settings.improve,
      }, s.dictionary);
      if (!text) return fail("empty");
      console.log("dictate: pasting=" + JSON.stringify(text) + " via " + s.settings.output);
      deliver(text, s.settings.output);
      const result = { ok: true, text, lang: "en", time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) };
      overlay?.webContents.send("dictation-result", result);  // show "Pasted" + hide overlay
      return result;   // dashboard (the recorder) uses this return value directly
    } catch (err) {
      console.error("dictate failed:", err);
      return fail("error", String(err?.message || err));
    }
  });

  // updates
  ipcMain.handle("update:check", async () => { try { await checkForUpdates(); return { ok: true }; } catch (e) { return { ok: false, message: String(e?.message || e) }; } });
  ipcMain.handle("update:download", async () => { try { await downloadUpdate(); return { ok: true }; } catch (e) { return { ok: false, message: String(e?.message || e) }; } });
  ipcMain.on("update:install", () => quitAndInstall());

  // overlay lifecycle
  ipcMain.on("overlay:hide", () => overlay?.hide());
  // dashboard aborted before transcription (silence/short hold) -> hide the pill
  ipcMain.on("dictation:cancel", () => overlay?.webContents.send("dictation-result", { ok: false }));
  ipcMain.on("clipboard:write", (_e, text) => clipboard.writeText(String(text || "")));
}

function applyStartup(enabled) {
  try { app.setLoginItemSettings({ openAtLogin: !!enabled }); } catch (e) { console.warn("startup setting failed:", e?.message); }
}

app.whenReady().then(() => {
  createWindow();
  createOverlay();
  setupIpc();
  setupHotkey();
  applyStartup(store.get().settings.startup);   // honor saved "launch on startup"
  initUpdater(win);
  checkSilently();   // auto-check for updates on launch
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
