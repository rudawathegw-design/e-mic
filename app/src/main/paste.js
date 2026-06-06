// paste.js — deliver the transcript to whatever app the user is typing in.
// Strategy: put the text on the clipboard, then send the paste shortcut to the
// foreground app. Windows: PowerShell SendKeys Ctrl+V. macOS: AppleScript Cmd+V
// (requires Accessibility permission). No native modules required.
import { clipboard } from "electron";
import { spawn } from "node:child_process";

const isMac = process.platform === "darwin";

function sendPaste() {
  if (isMac) {
    // Requires E Mic under System Settings > Privacy & Security > Accessibility.
    // keystroke "v" using command down == Cmd+V.
    const osa = 'tell application "System Events" to keystroke "v" using command down';
    const child = spawn("osascript", ["-e", osa]);
    child.on("error", (e) => console.error("paste osascript failed:", e));
    return;
  }
  // Windows: SendWait blocks until the keys are delivered; {^}v means Ctrl+V.
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
  setTimeout(sendPaste, 120);
}
