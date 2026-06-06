// preload.cjs — safe bridge between the renderer UI and the main process.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("EA", {
  // window controls
  minimize: () => ipcRenderer.send("win:minimize"),
  maximize: () => ipcRenderer.send("win:maximize"),
  close: () => ipcRenderer.send("win:close"),

  // state + persistence
  getState: () => ipcRenderer.invoke("state:get"),
  saveSettings: (s) => ipcRenderer.invoke("settings:set", s),
  saveDictionary: (d) => ipcRenderer.invoke("dictionary:set", d),
  saveHistory: (h) => ipcRenderer.invoke("history:set", h),

  // licensing
  activate: (key) => ipcRenderer.invoke("license:activate", key),

  // dictation control (in-app button -> same path as global hotkey)
  pttStart: () => ipcRenderer.send("ptt:start"),
  pttStop: () => ipcRenderer.send("ptt:stop"),
  setCapturing: (v) => ipcRenderer.send("capturing", v),

  // dictation engine (overlay sends captured audio)
  dictate: (audio, peak) => ipcRenderer.invoke("dictate", { audio, peak }),
  copy: (text) => ipcRenderer.send("clipboard:write", text),

  // overlay lifecycle
  hideOverlay: () => ipcRenderer.send("overlay:hide"),
  cancelDictation: () => ipcRenderer.send("dictation:cancel"),

  // updates
  checkUpdate: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  installUpdate: () => ipcRenderer.send("update:install"),
  onUpdate: (cb) => ipcRenderer.on("upd", (_e, m) => cb(m)),

  // events from the main process
  onPttStart: (cb) => ipcRenderer.on("ptt-start", cb),
  onPttStop: (cb) => ipcRenderer.on("ptt-stop", cb),
  onResult: (cb) => ipcRenderer.on("dictation-result", (_e, data) => cb(data)),
  onTrialExpired: (cb) => ipcRenderer.on("trial-expired", cb),
  onUpgrade: (cb) => ipcRenderer.on("upgrade", cb),
});
