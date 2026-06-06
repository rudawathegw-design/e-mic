// paste.js — deliver the transcript to whatever app the user is typing in.
// Strategy: put the text on the clipboard, then send Ctrl+V to the foreground
// window via a one-line PowerShell SendKeys. No native modules required.
import { clipboard } from "electron";
import { spawn } from "node:child_process";

function sendCtrlV() {
  // SendWait blocks until the keys are delivered; {^}v means Ctrl+V.
  const ps =
    "Add-Type -AssemblyName System.Windows.Forms;" +
    "[System.Windows.Forms.SendKeys]::SendWait('^v')";
  const child = spawn("powershell.exe", ["-NoProfile", "-Command", ps], {
    windowsHide: true,
  });
  child.on("error", (e) => console.error("paste sendkeys failed:", e));
}

/**
 * @param {string} text
 * @param {string} mode  one of the Settings "output" values
 */
export function deliver(text, mode) {
  clipboard.writeText(text);
  if (/^Copy/.test(mode)) return;            // clipboard-only: stop here
  // small delay so the foreground app is ready to receive the paste
  setTimeout(sendCtrlV, 120);
}
