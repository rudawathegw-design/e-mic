// main.js — Electron main process for E Mic.
import { app, BrowserWindow, ipcMain, clipboard, screen, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import * as store from "./store.js";
import { isValidKey } from "./license.js";
import { transcribe, resetModel, warmUp } from "./transcribe.js";
import { process as processText, fixGrammar, fixPunctuation, improveText, applyDictionary } from "./punctuate.js";
import { polish as deepseekPolish, suggest as deepseekSuggest } from "./deepseek.js";
import { deliver, grabSelection } from "./paste.js";
import { duck, unduck } from "./duck.js";
import { initUpdater, checkForUpdates, downloadUpdate, quitAndInstall, checkSilently, isMandatoryPending } from "./updater.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERER = path.join(__dirname, "..", "renderer", "index.html");
const OVERLAY = path.join(__dirname, "..", "renderer", "overlay.html");
const SUGGEST = path.join(__dirname, "..", "renderer", "suggest.html");
const APP_ICON = path.join(__dirname, "..", "renderer", "assets", "icon.png");

let win = null;        // dashboard
let overlay = null;    // system-wide listening pill
let suggest = null;    // grammar-suggestion popup
let tray = null;       // notification-area (system tray) icon
let isQuitting = false; // true only when the user really wants to exit

// real Windows account/login name, e.g. "RudawAbdulrahman"
function osUser() {
  try { return os.userInfo().username || "there"; } catch { return "there"; }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 840, minWidth: 900, minHeight: 600,
    frame: false, backgroundColor: "#FAF9F5", show: false, icon: APP_ICON,
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
  // Clicking the X (or "Close window" from the taskbar) hides to the tray and
  // keeps E Mic running in the background — it does NOT quit the app.
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on("closed", () => { win = null; });
}

function createTray() {
  if (tray) return;
  let img = nativeImage.createFromPath(APP_ICON);
  if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip("E Mic — voice to text");
  const showApp = () => { if (win) { win.show(); win.focus(); } else createWindow(); };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open E Mic", click: showApp },
    { type: "separator" },
    { label: "Quit E Mic", click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on("click", showApp);
  tray.on("double-click", showApp);
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

const SUG_W = 420, SUG_H = 360;
function createSuggest() {
  suggest = new BrowserWindow({
    width: SUG_W, height: SUG_H,
    frame: false, transparent: true, resizable: false, movable: false,
    skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: false, webSecurity: false,
    },
  });
  suggest.setAlwaysOnTop(true, "screen-saver");
  suggest.loadFile(SUGGEST);
  // hide (don't close) when it loses focus, so it behaves like a transient popup
  suggest.on("blur", () => { if (suggest && !suggest.isDestroyed()) suggest.hide(); });
}

// show the popup near the cursor and send it a state payload
function showSuggest(payload) {
  if (!suggest || suggest.isDestroyed()) createSuggest();
  const pt = screen.getCursorScreenPoint();
  const wa = screen.getDisplayNearestPoint(pt).workArea;
  // anchor near the cursor but keep the window fully on-screen
  let x = pt.x + 12, y = pt.y + 16;
  x = Math.min(Math.max(wa.x, x), wa.x + wa.width - SUG_W);
  y = Math.min(Math.max(wa.y, y), wa.y + wa.height - SUG_H);
  suggest.setBounds({ x: Math.round(x), y: Math.round(y), width: SUG_W, height: SUG_H });
  const send = () => suggest.webContents.send("suggest", payload);
  if (suggest.webContents.isLoading()) suggest.webContents.once("did-finish-load", send);
  else send();
  suggest.setAlwaysOnTop(true, "screen-saver");
  suggest.show();
  suggest.moveTop();
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

// increment the DeepSeek counter and push the new total to the dashboard
function countApiRequest() {
  const n = store.bumpApiRequests();
  win?.webContents.send("api-count", n);
  return n;
}

// build up to 3 labelled offline correction variants (no cloud, no key needed)
function offlineVariants(text, dictionary) {
  const tidy = (s) => s.replace(/\s+([,.!?;:])/g, "$1").replace(/\s{2,}/g, " ").trim();
  const cand = [
    { style: "Grammar fix", text: applyDictionary(fixPunctuation(fixGrammar(text)), dictionary) },
    { style: "Cleaned up",  text: applyDictionary(fixPunctuation(fixGrammar(improveText(text))), dictionary) }, // fillers/repeats removed
    { style: "Light touch", text: applyDictionary(tidy(fixGrammar(text)), dictionary) },                        // grammar only, no forced period
  ];
  const out = [], seen = new Set();
  for (const c of cand) if (c.text && !seen.has(c.text)) { seen.add(c.text); out.push(c); }
  return out;
}

// ---- grammar-correct the text currently selected anywhere in Windows ----
// Triggered by the "fix" shortcut (a tap, not a hold): copy the selection, get
// three correction options (DeepSeek if enabled, else offline rules) and show
// them in a popup. We DON'T paste — the user clicks an option to copy it.
let fixing = false;
async function runGrammarFix() {
  if (fixing) return;
  if (!store.isActive()) { win?.webContents.send("trial-expired"); win?.show(); return; }
  fixing = true;
  try {
    await new Promise((r) => setTimeout(r, 120));   // let the trigger keys fully release
    const { selected } = await grabSelection();
    if (!selected) {
      console.log("grammar-fix: nothing selected");
      showSuggest({ phase: "error", message: "Select some text first, then tap the shortcut." });
      return;
    }
    console.log("grammar-fix: selected=" + JSON.stringify(selected.slice(0, 80)));
    const s = store.get();

    if (s.settings.aiPolish && s.settings.deepseekKey) {
      showSuggest({ phase: "loading" });                     // instant "correcting…" feedback
      const r = await deepseekSuggest(selected, s.settings.deepseekKey);
      countApiRequest();
      if (r.ok) showSuggest({ phase: "ready", options: r.options });
      else showSuggest({ phase: "error", message: r.message });
    } else {
      const options = offlineVariants(selected, s.dictionary);
      showSuggest({ phase: "ready", options });
    }
  } catch (e) {
    console.error("grammar-fix failed:", e);
    showSuggest({ phase: "error", message: "Something went wrong while correcting." });
  } finally {
    setTimeout(() => { fixing = false; }, 400);   // debounce repeated taps
  }
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
  // punctuation labels -> UiohookKey names
  const PUNCT = {
    "`": "Backquote", "-": "Minus", "=": "Equal", "[": "BracketLeft", "]": "BracketRight",
    "\\": "Backslash", ";": "Semicolon", "'": "Quote", ",": "Comma", ".": "Period", "/": "Slash",
  };
  // map a captured key label ("Ctrl","Win","Alt","Shift","A","F9","Space","`") to a target
  const mainKeycode = (label) => {
    if (!label) return null;
    if (label === "Space") return UiohookKey.Space;
    if (/^[A-Z0-9]$/.test(label)) return UiohookKey[label];
    if (PUNCT[label]) return UiohookKey[PUNCT[label]] ?? null;
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

  const down = new Set();   // currently-held NON-modifier keys (the "main" key)
  // Modifier state from TWO sources, combined asymmetrically so neither known
  // Windows quirk can fire the mic:
  //   1. Physical tracking (`heldMods`) is the only thing that marks a modifier
  //      DOWN — we set Meta only when we actually saw a Win keydown. This kills
  //      the phantom "Ctrl alone reads as Ctrl+Win" bug, where uIOhook's event
  //      mask spuriously reports metaKey:true on a lone-Ctrl event.
  //   2. The event mask may only CLEAR a modifier — if the OS says Win is up we
  //      force it up even when we missed the keyup (Windows swallows the Win
  //      keyup when it opens the Start menu). This kills the "Meta stuck down"
  //      bug. We never let the mask SET a modifier, only release one.
  const heldMods = new Set();   // physically-held modifier keycodes
  const mods = { ctrl: false, alt: false, shift: false, meta: false };
  let talking = false;
  let stopTimer = null;
  let fixHeld = false;     // edge tracker for the grammar-fix (tap) shortcut

  const modActive = (group) => { for (const c of group) if (heldMods.has(c)) return true; return false; };
  const clearGroup = (group) => { for (const c of group) heldMods.delete(c); };

  const syncMods = (e) => {
    // (1) physical: maintain heldMods from this event's keycode
    if (e && MOD_CODES.has(e.keycode)) {
      if (e.type === "keydown") heldMods.add(e.keycode);
      else heldMods.delete(e.keycode);   // keyup / anything else
    }
    // (2) mask: only ever RELEASE a modifier the OS reports as up
    if (e && e.ctrlKey !== undefined) {
      if (!e.ctrlKey)  clearGroup(MODS.ctrl);
      if (!e.altKey)   clearGroup(MODS.alt);
      if (!e.shiftKey) clearGroup(MODS.shift);
      if (!e.metaKey)  clearGroup(MODS.meta);
    }
    mods.ctrl = modActive(MODS.ctrl); mods.alt = modActive(MODS.alt);
    mods.shift = modActive(MODS.shift); mods.meta = modActive(MODS.meta);
  };

  // does the current state satisfy `shortcut`?
  const satisfied = (shortcut) => {
    const sc = parse(shortcut || []);
    // EXACT modifier match: every required modifier held AND no extra modifier
    // held (so Ctrl+Win never fires while you're holding, say, Ctrl+Alt+Win).
    const modsOk =
      mods.ctrl === sc.need.ctrl && mods.alt === sc.need.alt &&
      mods.shift === sc.need.shift && mods.meta === sc.need.meta;
    const mainOk = sc.main == null ? true : down.has(sc.main);
    const hasAny = sc.need.ctrl || sc.need.alt || sc.need.shift || sc.need.meta || sc.main != null;
    return hasAny && modsOk && mainOk;
  };

  const refresh = () => {
    // grammar-fix: fire once on RELEASE, so the modifier keys are up before we
    // send Ctrl+C / Ctrl+V to the foreground app (otherwise they'd be corrupted)
    const fixNow = satisfied(store.get().settings.fixShortcut || []);
    if (fixHeld && !fixNow) runGrammarFix();
    fixHeld = fixNow;

    const want = satisfied(store.get().settings.shortcut || ["Ctrl", "Win"]);

    if (want) {
      // a (re)press cancels any pending stop — absorbs key auto-repeat flicker
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (!talking) { talking = true; startDictation(); }
    } else if (talking && !stopTimer) {
      // only stop if the keys stay released for >150ms (ignore repeat flicker)
      stopTimer = setTimeout(() => { stopTimer = null; talking = false; stopDictation(); }, 150);
    }
  };

  const MOD_CODES = new Set([...MODS.ctrl, ...MODS.alt, ...MODS.shift, ...MODS.meta]);
  uIOhook.on("keydown", (e) => { syncMods(e); if (!MOD_CODES.has(e.keycode)) down.add(e.keycode); refresh(); });
  uIOhook.on("keyup", (e) => { syncMods(e); down.delete(e.keycode); refresh(); });

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
      apiRequests: s.apiRequests || 0,
      settings: s.settings,
      dictionary: s.dictionary,
      history: s.history,
    };
  });

  ipcMain.handle("settings:set", (_e, settings) => {
    const prev = store.get().settings;
    store.patch({ settings });
    if (settings.model !== prev.model) {
      resetModel();
      setTimeout(() => { warmUp(settings.model); }, 300); // re-warm the new model
    }
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
      let text = processText(r.text, {
        punctuation: s.settings.punctuation,
        grammar: s.settings.grammar,
        improve: s.settings.improve,
      }, s.dictionary);
      if (!text) return fail("empty");
      // optional cloud polish (opt-in; falls back to offline text on any error)
      if (s.settings.aiPolish && s.settings.deepseekKey) {
        text = await deepseekPolish(text, s.settings.deepseekKey);
        countApiRequest();
        console.log("dictate: deepseek polished=" + JSON.stringify(text));
      }
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
  ipcMain.on("suggest:close", () => { if (suggest && !suggest.isDestroyed()) suggest.hide(); });
  ipcMain.on("suggest:size", (_e, h) => {
    if (!suggest || suggest.isDestroyed()) return;
    const wa = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const height = Math.max(120, Math.min(Math.round(h) || SUG_H, wa.height - 20));
    const b = suggest.getBounds();
    // grow upward if the popup would run off the bottom of the screen
    const y = Math.min(b.y, wa.y + wa.height - height - 4);
    suggest.setBounds({ x: b.x, y: Math.max(wa.y, y), width: SUG_W, height });
  });
}

function applyStartup(enabled) {
  try { app.setLoginItemSettings({ openAtLogin: !!enabled }); } catch (e) { console.warn("startup setting failed:", e?.message); }
}

app.whenReady().then(() => {
  // Windows taskbar identity — makes the taskbar use our icon and group correctly.
  try { app.setAppUserModelID("iq.fib.eamic"); } catch {}
  createWindow();
  createTray();
  createOverlay();
  createSuggest();
  setupIpc();
  setupHotkey();
  applyStartup(store.get().settings.startup);   // honor saved "launch on startup"
  initUpdater(win);
  checkSilently();   // auto-check for updates on launch
  // Pre-load the speech model in the background so the first Ctrl+Win is instant.
  setTimeout(() => { warmUp(store.get().settings.model); }, 1500);
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

// Keep running in the tray even if all windows are hidden/closed.
app.on("window-all-closed", () => { /* stay alive in the tray */ });

// Real quit (tray "Quit", updater quitAndInstall, OS shutdown): clean up.
app.on("before-quit", () => { isQuitting = true; });
app.on("will-quit", () => {
  try { overlay?.destroy(); } catch {}
  try { tray?.destroy(); } catch {}
});
