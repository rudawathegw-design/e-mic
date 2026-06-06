// updater.js — GitHub-Releases auto-update via electron-updater.
// Optional by default; a release is FORCED when its notes contain [mandatory]
// (or [force]/[required]). Only runs in the installed (packaged) app.
import pkg from "electron-updater";
import { app, dialog } from "electron";

const { autoUpdater } = pkg;

let win = null;
let mandatory = false;

export function isMandatoryPending() { return mandatory; }

function detectMandatory(info) {
  const notes = Array.isArray(info?.releaseNotes)
    ? info.releaseNotes.map((n) => n?.note || "").join(" ")
    : (info?.releaseNotes || "");
  return /\[(mandatory|force|required)\]/i.test(notes);
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
    if (mandatory) autoUpdater.downloadUpdate().catch((e) => send("error", String(e?.message || e)));
  });
  autoUpdater.on("update-not-available", () => send("none"));
  autoUpdater.on("download-progress", (p) => send("progress", Math.round(p.percent)));
  autoUpdater.on("update-downloaded", (info) => {
    send("downloaded", { version: info.version, mandatory });
    if (mandatory) {
      win?.show();
      dialog.showMessageBox(win, {
        type: "warning",
        buttons: ["Restart & Install"],
        defaultId: 0,
        title: "Required update",
        message: `E Mic ${info.version} is required to continue.`,
        detail: "The app will restart to install the update.",
      }).then(() => autoUpdater.quitAndInstall());
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
export function checkSilently() { if (app.isPackaged) autoUpdater.checkForUpdates().catch(() => {}); }
