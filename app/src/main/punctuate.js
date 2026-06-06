// punctuate.js — rules-only text processing for English (NO AI, fully offline).
// Composable steps gated by the user's Settings toggles:
//   • Auto-punctuation  -> fixPunctuation
//   • Grammar correction -> fixGrammar
//   • Improve writing    -> improveText (strip fillers, de-duplicate)
// The custom dictionary (exact + fuzzy) is always applied last.

// Whisper tags non-speech audio (laughs, coughing, music, applause…) inside
// (parentheses), [brackets], *asterisks*, or ♪notes♪. Strip ALL of them so only
// the actual spoken words are typed — never describe sounds.
const NONSPEECH = /\([^)]*\)|\[[^\]]*\]|\*[^*]*\*|♪[^♪]*♪|♪/g;

export function stripNonSpeech(raw) {
  return String(raw || "")
    .replace(NONSPEECH, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.;:]+/, "")
    .trim();
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* ---------- improve writing: remove dictation fillers + repeats ---------- */
const FILLERS = /\b(?:um+|uh+|erm?|ah+|hmm+|mhm|you know|i mean|sort of|kind of|you see)\b/gi;

export function improveText(t) {
  let s = t.replace(FILLERS, " ");
  // collapse immediate duplicate words: "the the" -> "the"
  s = s.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
  // tidy spaces and stray punctuation left behind
  s = s.replace(/\s+([,.!?;:])/g, "$1").replace(/\s{2,}/g, " ").replace(/^[\s,]+/, "").trim();
  return s;
}

/* ---------- grammar: capitalization, i->I, a/an ---------- */
export function fixGrammar(t) {
  let s = t;
  s = s.replace(/\bi\b/g, "I");
  // capitalize first letter of each sentence
  s = s.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());
  // a/an agreement (basic heuristic): "a apple" -> "an apple", "an book" -> "a book"
  s = s.replace(/\b([Aa])\s+(?=[aeiou])/g, (m, a) => a + "n ");
  s = s.replace(/\b([Aa])n\s+(?=[bcdfghjklmnpqrstvwxyz])/g, (m, a) => a + " ");
  return s;
}

/* ---------- punctuation: spacing + terminal mark ---------- */
export function fixPunctuation(t) {
  let s = t.replace(/\s+([,.!?;:])/g, "$1").replace(/\s{2,}/g, " ").trim();
  if (s && !".!?".includes(s[s.length - 1])) s += ".";
  return s;
}

/* ---------- dictionary (exact + fuzzy) ---------- */
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}
const budget = (len) => (len <= 4 ? 1 : len <= 7 ? 2 : 3);

const normWord = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

// fuzzy-match multi-word dictionary entries (e.g. "First Iraqi Bank") against
// sliding windows of the transcript, so close mishears get corrected.
function applyPhrases(text, phrases) {
  if (!phrases.length) return text;
  const tokens = text.split(/(\s+)/);            // words at even indices, spaces at odd
  const wordIdx = [];
  for (let i = 0; i < tokens.length; i++) if (i % 2 === 0 && tokens[i] !== "") wordIdx.push(i);

  for (const phrase of phrases) {
    const pw = phrase.split(/\s+/);
    const N = pw.length;
    const target = pw.join(" ").toLowerCase();
    const tol = Math.max(1, Math.ceil(target.length * 0.34));
    for (let s = 0; s + N <= wordIdx.length; s++) {
      const idxs = wordIdx.slice(s, s + N);
      const ww = idxs.map((i) => normWord(tokens[i]));
      if (ww.some((w) => w === "")) continue;
      const d = lev(ww.join(" "), target);
      if (d > 0 && d <= tol) {
        const lastTok = tokens[idxs[N - 1]];
        const trail = (lastTok.match(/[.,!?;:]+$/) || [""])[0];
        tokens[idxs[0]] = phrase + trail;
        for (let k = 1; k < N; k++) tokens[idxs[k]] = "";
        break;
      }
    }
  }
  return tokens.join("").replace(/\s{2,}/g, " ").trim();
}

export function applyDictionary(text, dictionary = []) {
  let t = text;
  const singles = [], phrases = [];
  for (const word of dictionary) {
    if (!word) continue;
    t = t.replace(new RegExp("\\b" + escapeRe(word) + "\\b", "gi"), word);  // exact, any entry
    if (/\s/.test(word)) phrases.push(word);
    else if (word.length >= 4) singles.push(word);
  }
  t = applyPhrases(t, phrases);
  if (singles.length) {
    t = t.replace(/[A-Za-z][A-Za-z'’-]*/g, (tok) => {
      if (singles.some((w) => w.toLowerCase() === tok.toLowerCase())) return tok;
      const low = tok.toLowerCase();
      let best = null, bestD = Infinity;
      for (const w of singles) {
        if (Math.abs(w.length - tok.length) > 3) continue;
        const d = lev(low, w.toLowerCase());
        if (d < bestD) { bestD = d; best = w; }
      }
      if (best && bestD > 0 && bestD <= budget(best.length)) return best;
      return tok;
    });
  }
  return t;
}

/**
 * Full pipeline driven by Settings flags.
 * @param {string} raw
 * @param {{punctuation?:boolean, grammar?:boolean, improve?:boolean}} flags
 * @param {string[]} dictionary
 */
export function process(raw, flags = {}, dictionary = []) {
  let t = stripNonSpeech(raw);
  if (!t) return "";
  if (flags.improve) t = improveText(t);
  if (flags.grammar) t = fixGrammar(t);
  if (flags.punctuation) t = fixPunctuation(t);
  t = applyDictionary(t, dictionary);
  return t.trim();
}

// kept for compatibility / quick tests
export function cleanup(raw, dictionary = []) {
  return process(raw, { punctuation: true, grammar: true }, dictionary);
}
