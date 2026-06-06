// updater.js — GitHub-Releases auto-update via electron-updater.
// Optional by default; a release is FORCED when its notes contain [mandatory]
// (or [force]/[required]). Only runs in the installed (packaged) app.
//
// For a MANDATORY update we show a visible, branded, always-on-top splash with a
// live progress bar (so the user clearly sees the required update happening),
// then restart to install. Optional updates stay silent and notify the renderer.
import pkg from "electron-updater";
import { app, dialog, BrowserWindow, nativeImage } from "electron";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { autoUpdater } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICON_PATH = path.join(__dirname, "..", "renderer", "assets", "icon.png");

let win = null;
let mandatory = false;
let splash = null;

export function isMandatoryPending() { return mandatory; }

function detectMandatory(info) {
  const notes = Array.isArray(info?.releaseNotes)
    ? info.releaseNotes.map((n) => n?.note || "").join(" ")
    : (info?.releaseNotes || "");
  return /\[(mandatory|force|required)\]/i.test(notes);
}

function logoDataUri() {
  try { return "data:image/png;base64," + readFileSync(ICON_PATH).toString("base64"); }
  catch { return ""; }
}

function splashHtml(version) {
  const logo = logoDataUri();
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;font-family:'Segoe UI',system-ui,sans-serif;
      background:#FAF9F5;color:#2C2722;overflow:hidden;}
    .wrap{height:100%;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:14px;-webkit-app-region:drag;}
    img{width:84px;height:84px;border-radius:18px;}
    .title{font-size:17px;font-weight:600;}
    .sub{font-size:12.5px;color:#6b6258;margin-top:-6px;}
    .bar{width:74%;height:8px;border-radius:6px;background:#EFE7DA;overflow:hidden;
      box-shadow:inset 0 1px 2px rgba(0,0,0,.06);}
    .fill{height:100%;width:0%;border-radius:6px;
      background:linear-gradient(90deg,#D97757,#C2603E);transition:width .25s;}
    .pct{font-size:12px;color:#8a8076;font-variant-numeric:tabular-nums;}
  </style></head><body><div class="wrap">
    ${logo ? `<img src="${logo}"/>` : ""}
    <div class="title">Updating E&nbsp;Mic</div>
    <div class="sub">Required update${version ? " &middot; v" + version : ""} — please wait</div>
    <div class="bar"><div class="fill" id="f"></div></div>
    <div class="pct" id="p">Starting…</div>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('p', (_e, v) => {
      document.getElementById('f').style.width = v + '%';
      document.getElementById('p').textContent = v >= 100 ? 'Installing…' : v + '%';
    });
  </script></body></html>`;
}

function showSplash(version) {
  if (splash && !splash.isDestroyed()) { splash.show(); return; }
  let icon = nativeImage.createFromPath(ICON_PATH);
  splash = new BrowserWindow({
    width: 420, height: 320, resizable: false, frame: false, show: false,
    alwaysOnTop: true, skipTaskbar: false, backgroundColor: "#FAF9F5",
    title: "Updating E Mic", icon: icon.isEmpty() ? undefined : icon,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  splash.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(splashHtml(version)));
  splash.once("ready-to-show", () => { splash.show(); splash.focus(); });
}

function setSplashProgress(pct) {
  if (splash && !splash.isDestroyed()) splash.webContents.send("p", pct);
}

export function initUpdater(mainWin) {
  win = mainWin;
  autoUpdater.autoDownload = false;          // we trigger downloads ourselves
  autoUpdater.autoInstallOnAppQuit = true;
  const send = (type, data) => win && !win.isDestroyed() && win.webContents.send("upd", { type, data });

  autoUpdater.on("checking-for-update", () => send("checking"));
  autoUpdater.on("update-available", (info) => {
    mandatory = detectMandatory(info);
    send("available", { version: info.version, mandatory });
    if (mandatory) {
      showSplash(info.version);            // visible, blocking, branded
      autoUpdater.downloadUpdate().catch((e) => {
        setSplashProgress(0);
        send("error", String(e?.message || e));
      });
    }
  });
  autoUpdater.on("update-not-available", () => send("none"));
  autoUpdater.on("download-progress", (p) => {
    const pct = Math.round(p.percent);
    send("progress", pct);
    if (mandatory) setSplashProgress(pct);
  });
  autoUpdater.on("update-downloaded", (info) => {
    send("downloaded", { version: info.version, mandatory });
    if (mandatory) {
      setSplashProgress(100);
      // brief pause so the user sees "Installing…", then restart to install.
      setTimeout(() => autoUpdater.quitAndInstall(), 900);
    }
  });
  autoUpdater.on("error", (e) => send("error", String(e?.message || e)));
}

export async function checkForUpdates() {
  if (!app.isPackaged) throw new Error("Updates only work in the installed app (not in dev).");
  return autoUpdater.checkForUpdates();
}
export function downloadUpdate() { return autoUpdater.downloadUpdate(); }
export function quitAndInstall() { autoUpdater.quitAndInstall(); }
export function checkSilently() {
  // macOS auto-update requires a signed+notarized build; skip until we have one.
  if (process.platform === "darwin") return;
  if (app.isPackaged) autoUpdater.checkForUpdates().catch(() => {});
}
