// patch-installer-text.js — change the NSIS one-click install banner text from
// electron-builder's default "Installing, please wait..." to "Installing E Mic".
// electron-builder reads this English string from its bundled messages.yml, so we
// patch that file in node_modules before the build. Safe + idempotent.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(
  __dirname, "..", "node_modules", "app-builder-lib",
  "templates", "nsis", "messages.yml"
);

const FROM = "Installing, please wait...";
const TO = "Installing E Mic";

if (!existsSync(file)) {
  console.warn("messages.yml not found, skipping installer-text patch:", file);
  process.exit(0);
}

let txt = readFileSync(file, "utf-8");
if (txt.includes(TO)) {
  console.log("Installer text already patched.");
} else if (txt.includes(FROM)) {
  txt = txt.replace(FROM, TO);
  writeFileSync(file, txt);
  console.log(`Patched installer banner text -> "${TO}"`);
} else {
  console.warn(`Could not find "${FROM}" in messages.yml; electron-builder may have changed it.`);
}
