// duck.js — lower the system volume while dictating, then restore it.
// Windows: a tiny PowerShell CoreAudio helper (volume.ps1), volume as 0..1.
// macOS: AppleScript `set volume` / `get volume settings`, volume as 0..100.
// No native modules.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PS1 = path.join(__dirname, "volume.ps1");
const isMac = process.platform === "darwin";

let saved = null;   // volume (fraction 0..1) to restore after dictation

function spawnText(cmd, args) {
  return new Promise((resolve) => {
    let out = "";
    const c = spawn(cmd, args, { windowsHide: true });
    c.stdout.on("data", (d) => (out += d));
    c.on("close", () => resolve(out.trim()));
    c.on("error", () => resolve(""));
  });
}

// Returns the current output volume as a fraction 0..1 (NaN on failure).
async function getVol() {
  if (isMac) {
    const out = await spawnText("osascript", ["-e", "output volume of (get volume settings)"]);
    const n = parseFloat(out);
    return Number.isNaN(n) ? NaN : n / 100;
  }
  const out = await spawnText("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, "get"]);
  return parseFloat(out);
}

// Sets the output volume from a fraction 0..1.
async function setVol(frac) {
  if (isMac) {
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
    await spawnText("osascript", ["-e", `set volume output volume ${pct}`]);
    return;
  }
  await spawnText("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, "set", String(frac)]);
}

export async function duck(setting) {
  if (!setting || setting === "Off") return;   // any level other than Off = mute while talking
  const cur = await getVol();
  if (Number.isNaN(cur)) return;
  saved = cur;
  await setVol(0);   // fully stop other audio while dictating
}

export async function unduck() {
  if (saved == null) return;
  const v = saved;
  saved = null;
  await setVol(v);
}
