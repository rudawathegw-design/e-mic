// generate-keys.js — make valid 6-digit E Mic license keys.
// Usage:
//   node tools/generate-keys.js          -> prints 10 random valid keys
//   node tools/generate-keys.js 50       -> prints 50 random valid keys
//   node tools/generate-keys.js check 042397   -> tells you if a key is valid
//
// Uses the SAME formula the app verifies with (src/main/license.js), so any key
// printed here will activate the app, and vice-versa.
import { isValidKey, makeKey, SECRET } from "../src/main/license.js";

const args = process.argv.slice(2);

if (args[0] === "check") {
  const k = args[1] || "";
  console.log(`${k}  ->  ${isValidKey(k) ? "VALID ✓" : "invalid ✗"}`);
  process.exit(0);
}

const count = Math.max(1, parseInt(args[0], 10) || 10);
console.log(`E Mic license keys (formula secret = +${SECRET}):\n`);

const seen = new Set();
while (seen.size < count) {
  // 5 leading digits, deterministic-free randomness is fine for keys
  let five = "";
  for (let i = 0; i < 5; i++) five += Math.floor(Math.random() * 10);
  const key = makeKey(five);
  if (seen.has(key)) continue;
  seen.add(key);
  console.log("   " + key);
}
console.log(`\nGive one of these to a customer after they pay. Each works on any PC.`);
