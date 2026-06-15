// store.js — tiny JSON store in the OS user-data folder. Holds the trial start
// date, the license state, settings, dictionary, and history. No database needed.
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(app.getPath("userData"), "ea-mic.json");

export const TRIAL_DAYS = 10;

const DEFAULTS = {
  installedAt: null,      // ISO date string — set on first launch (trial start)
  licensed: false,
  licenseKey: "",
  apiRequests: 0,         // running count of DeepSeek API calls made
  settings: {
    model: "Base — fast (English)",
    output: "Paste (recommended)",
    punctuation: true,
    grammar: true,
    improve: true,
    duck: "High (50%)",
    mic: "",                // input device id ("" = system default)
    aiPolish: false,        // opt-in: rewrite transcript via DeepSeek (cloud)
    deepseekKey: "",        // user's own DeepSeek API key (stored locally)
    shortcut: ["Ctrl", "Win"],
    fixShortcut: ["Ctrl", "`"],  // tap: grammar-correct the selected text
    startup: true,
  },
  dictionary: [],
  history: [],
};

let cache = null;

function read() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    cache = { ...DEFAULTS };
  }
  if (!cache.installedAt) {
    cache.installedAt = new Date().toISOString();
    write();
  }
  // there is no model picker in the UI, so always use the chosen default model
  cache.settings = { ...DEFAULTS.settings, ...cache.settings };
  cache.settings.model = DEFAULTS.settings.model;
  delete cache.settings.language;
  // migrate the earlier grammar-fix default (Ctrl+Alt+G) to the new Ctrl+`
  if (Array.isArray(cache.settings.fixShortcut) && cache.settings.fixShortcut.join("+") === "Ctrl+Alt+G")
    cache.settings.fixShortcut = ["Ctrl", "`"];
  return cache;
}

function write() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error("store write failed:", e);
  }
}

export function get() {
  return read();
}

export function patch(partial) {
  cache = { ...read(), ...partial };
  write();
  return cache;
}

/** Increment the DeepSeek API request counter and return the new total. */
export function bumpApiRequests() {
  const s = read();
  s.apiRequests = (s.apiRequests || 0) + 1;
  write();
  return s.apiRequests;
}

/** Whole-number days remaining in the trial (0 once expired). */
export function trialDaysLeft() {
  const s = read();
  const start = new Date(s.installedAt).getTime();
  const elapsedDays = (Date.now() - start) / 86400000;
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
}

/** Can the user dictate right now? (licensed, or still inside the trial.) */
export function isActive() {
  const s = read();
  return s.licensed || trialDaysLeft() > 0;
}
