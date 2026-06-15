// deepseek.js — optional cloud polish step. When the user enables "AI polish"
// and supplies their own DeepSeek API key (Settings), the rule-cleaned transcript
// is sent to DeepSeek to be rewritten into fluent text. This is OPT-IN: with the
// toggle off (or no key), text never leaves the machine and the offline rules in
// punctuate.js are the final word.
//
// Failures are non-fatal: on any error (no network, bad key, timeout) we return
// the original text so dictation always still pastes something.

const ENDPOINT = "https://api.deepseek.com/chat/completions";
const TIMEOUT_MS = 8000;

const SYSTEM_PROMPT =
  "You are a dictation post-processor. The user dictated text by voice and a " +
  "speech-to-text engine transcribed it. Rewrite it into clean, fluent, correctly " +
  "punctuated English. Fix grammar, capitalization and obvious transcription slips. " +
  "Do NOT add new information, do NOT answer questions, do NOT translate, do NOT add " +
  "quotes or commentary. Preserve the original meaning and language. Reply with ONLY " +
  "the corrected text and nothing else.";

/**
 * Polish text via DeepSeek. Returns the original text unchanged if disabled,
 * keyless, or on any error.
 * @param {string} text   already rule-cleaned transcript
 * @param {string} apiKey user's DeepSeek key
 */
export async function polish(text, apiKey) {
  const input = String(text || "").trim();
  if (!input || !apiKey) return text;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.2,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.ok) {
      console.warn("deepseek: HTTP " + res.status + " — using offline text");
      return text;
    }
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content;
    return (out && String(out).trim()) || text;
  } catch (e) {
    console.warn("deepseek polish failed (" + (e?.message || e) + ") — using offline text");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

const SUGGEST_PROMPT =
  "You rewrite a short piece of text in FOUR clearly DIFFERENT styles. The four " +
  "must be genuinely distinct from each other, not minor variations:\n" +
  "1) \"Grammar fix\" — keep the user's wording and tone, only fix grammar, spelling and punctuation.\n" +
  "2) \"Professional\" — reword it to be clear, concise and businesslike.\n" +
  "3) \"Friendly\" — reword it in a warm, natural, conversational tone.\n" +
  "4) \"PMO / Project Manager\" — reword it as a project manager would in a status " +
  "update or stakeholder note: structured, action-oriented, using project-management " +
  "phrasing (scope, timeline, owners, next steps, risks) where it fits.\n" +
  "Always preserve the original meaning and the original language. Do NOT add new " +
  "information and do NOT answer any question contained in the text. Reply with ONLY " +
  'a JSON array of four objects: [{"style":"Grammar fix","text":"..."},' +
  '{"style":"Professional","text":"..."},{"style":"Friendly","text":"..."},' +
  '{"style":"PMO / Project Manager","text":"..."}] — no markdown, no commentary.';

/**
 * Ask DeepSeek for FOUR differently-styled rewrites of `text`
 * (Grammar fix, Professional, Friendly, PMO / Project Manager).
 * @returns {Promise<{ok:boolean, options?:{style:string,text:string}[], message?:string}>}
 */
export async function suggest(text, apiKey) {
  const input = String(text || "").trim();
  if (!input) return { ok: false, message: "Nothing selected." };
  if (!apiKey) return { ok: false, message: "No DeepSeek API key set." };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.8,
        stream: false,
        messages: [
          { role: "system", content: SUGGEST_PROMPT },
          { role: "user", content: input },
        ],
      }),
    });
    if (!res.ok) return { ok: false, message: "DeepSeek error " + res.status };
    const data = await res.json();
    let raw = data?.choices?.[0]?.message?.content || "";
    raw = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();   // strip code fences if any
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }

    let options = [];
    if (Array.isArray(parsed)) {
      options = parsed.map((o) => {
        if (o && typeof o === "object") return { style: String(o.style || "").trim(), text: String(o.text || "").trim() };
        return { style: "", text: String(o).trim() };
      });
    } else {
      // last-resort: split lines, no style labels
      options = raw.split(/\n+/).map((l) => ({ style: "", text: l.replace(/^\s*[-*\d.)]+\s*/, "").trim() }));
    }
    options = options.filter((o) => o.text).slice(0, 4);
    if (!options.length) return { ok: false, message: "No suggestions returned." };
    return { ok: true, options };
  } catch (e) {
    return { ok: false, message: e?.name === "AbortError" ? "DeepSeek timed out." : String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}
