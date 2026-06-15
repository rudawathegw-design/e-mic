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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// send a copy shortcut (Ctrl+C / Cmd+C) to the foreground app
function sendCopy() {
  return new Promise((resolve) => {
    if (isMac) {
      const osa = 'tell application "System Events" to keystroke "c" using command down';
      const child = spawn("osascript", ["-e", osa]);
      child.on("error", (e) => console.error("copy osascript failed:", e));
      child.on("close", resolve);
      return;
    }
    const ps =
      "Add-Type -AssemblyName System.Windows.Forms;" +
      "[System.Windows.Forms.SendKeys]::SendWait('^c')";
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", ps], { windowsHide: true });
    child.on("error", (e) => console.error("copy sendkeys failed:", e));
    child.on("close", resolve);
  });
}

/**
 * Grab whatever text is currently selected in the foreground app by copying it
 * to the clipboard. Returns the selected string ("" if nothing was selected).
 * The previous clipboard contents are returned too so the caller can restore them.
 */
export async function grabSelection() {
  const previous = clipboard.readText();
  clipboard.writeText("");              // sentinel: detect whether the copy landed
  await sendCopy();
  await wait(160);                       // let the foreground app place the selection
  const selected = clipboard.readText();
  return { selected: selected.trim(), previous };
}

/** Put `text` on the clipboard and paste it into the foreground app. */
export async function replaceSelection(text) {
  clipboard.writeText(text);
  await wait(60);
  sendPaste();
}
