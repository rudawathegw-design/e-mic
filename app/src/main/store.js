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
  settings: {
    model: "Base — fast (English)",
    output: "Paste (recommended)",
    punctuation: true,
    grammar: true,
    improve: true,
    duck: "High (50%)",
    shortcut: ["Ctrl", "Win"],
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
