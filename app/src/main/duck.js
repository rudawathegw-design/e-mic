// duck.js — lower the Windows master volume while dictating, then restore it.
// Uses a tiny PowerShell CoreAudio helper (volume.ps1). No native modules.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PS1 = path.join(__dirname, "volume.ps1");

// how much each setting lowers the volume (fraction)
const FACTOR = { "Off": 0, "Low (10%)": 0.10, "Medium (25%)": 0.25, "High (50%)": 0.50 };

let saved = null;   // volume to restore after dictation

function run(args) {
  return new Promise((resolve) => {
    let out = "";
    const c = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, ...args], { windowsHide: true });
    c.stdout.on("data", (d) => (out += d));
    c.on("close", () => resolve(out.trim()));
    c.on("error", () => resolve(""));
  });
}

export async function duck(setting) {
  if (!setting || setting === "Off") return;   // any level other than Off = mute while talking
  const cur = parseFloat(await run(["get"]));
  if (Number.isNaN(cur)) return;
  saved = cur;
  await run(["set", "0"]);   // fully stop other audio while dictating
}

export async function unduck() {
  if (saved == null) return;
  const v = saved;
  saved = null;
  await run(["set", String(v)]);
}
