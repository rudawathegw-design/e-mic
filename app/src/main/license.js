// license.js — the 6-digit key formula. Used by BOTH the app (to verify) and
// tools/generate-keys.js (to generate). Keep these two in sync — they import
// the same function, so they always agree.
//
// A key is six digits d1 d2 d3 d4 d5 d6.
// It is VALID when the last digit is the check digit of the first five:
//
//     d6 = (d1*2 + d2*3 + d3*4 + d4*5 + d5*6 + SECRET) mod 10
//
// The SECRET is the only thing that stops someone guessing keys. It lives in a
// separate, GITIGNORED file (secret.js) so it never gets published to GitHub.
// To change it: edit secret.js (or copy secret.example.js -> secret.js), set a
// new digit (0–9), and rebuild — every old key becomes invalid.
import { SECRET } from "./secret.js";
export { SECRET };

// Weights applied to the first five digits, left to right.
const WEIGHTS = [2, 3, 4, 5, 6];

/** Compute the correct 6th (check) digit for any 5 leading digits. */
export function checkDigit(firstFive) {
  let sum = SECRET;
  for (let i = 0; i < 5; i++) sum += Number(firstFive[i]) * WEIGHTS[i];
  return sum % 10;
}

/** Normalise user input: keep digits only (so "12 34 56" or "123-456" work). */
export function normalize(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** True when `raw` is a valid 6-digit license key. */
export function isValidKey(raw) {
  const k = normalize(raw);
  if (!/^\d{6}$/.test(k)) return false;
  return Number(k[5]) === checkDigit(k);
}

/** Build a valid key from 5 leading digits (string or number). */
export function makeKey(firstFive) {
  const f = String(firstFive).replace(/\D/g, "").padStart(5, "0").slice(0, 5);
  return f + checkDigit(f);
}
