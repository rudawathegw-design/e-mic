package iq.fib.eamic.stt

import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.min

/**
 * Rules-only English text cleanup — a direct port of the desktop app's
 * src/main/punctuate.js. Fully offline, no AI. Steps are gated by Settings:
 *   • Auto-punctuation -> [fixPunctuation] (+ [fixGrammar])
 * plus a custom dictionary (exact + fuzzy) applied last. Keep this in sync with
 * the JS version so phone and desktop produce identical output.
 */
object Punctuate {

    // Whisper tags non-speech (laughs, music, applause…) inside (), [], **, ♪♪.
    private val NONSPEECH = Regex("\\([^)]*\\)|\\[[^\\]]*]|\\*[^*]*\\*|♪[^♪]*♪|♪")
    private val FILLERS = Regex(
        "\\b(?:um+|uh+|erm?|ah+|hmm+|mhm|you know|i mean|sort of|kind of|you see)\\b",
        RegexOption.IGNORE_CASE,
    )

    fun stripNonSpeech(raw: String?): String =
        (raw ?: "")
            .replace(NONSPEECH, " ")
            .replace(Regex("\\s+([,.!?;:])"), "$1")
            .replace(Regex("\\s{2,}"), " ")
            .replace(Regex("^[\\s,.;:]+"), "")
            .trim()

    /** Remove dictation fillers and collapse immediate duplicate words. */
    fun improveText(t: String): String {
        var s = t.replace(FILLERS, " ")
        s = s.replace(Regex("\\b(\\w+)(\\s+\\1\\b)+", RegexOption.IGNORE_CASE), "$1")
        return s.replace(Regex("\\s+([,.!?;:])"), "$1")
            .replace(Regex("\\s{2,}"), " ")
            .replace(Regex("^[\\s,]+"), "")
            .trim()
    }

    /** Capitalization, lone "i" -> "I", basic a/an agreement. */
    fun fixGrammar(t: String): String {
        var s = t.replace(Regex("\\bi\\b"), "I")
        // Capitalize first letter of each sentence.
        s = Regex("(^\\s*|[.!?]\\s+)([a-z])").replace(s) { m ->
            m.groupValues[1] + m.groupValues[2].uppercase()
        }
        // "a apple" -> "an apple"
        s = Regex("\\b([Aa])\\s+(?=[aeiou])").replace(s) { m -> m.groupValues[1] + "n " }
        // "an book" -> "a book"
        s = Regex("\\b([Aa])n\\s+(?=[bcdfghjklmnpqrstvwxyz])").replace(s) { m -> m.groupValues[1] + " " }
        return s
    }

    /** Tidy spacing and ensure a terminal mark. */
    fun fixPunctuation(t: String): String {
        var s = t.replace(Regex("\\s+([,.!?;:])"), "$1").replace(Regex("\\s{2,}"), " ").trim()
        if (s.isNotEmpty() && s.last() !in ".!?") s += "."
        return s
    }

    // ---- dictionary (exact + fuzzy) ----
    private fun lev(a: String, b: String): Int {
        val m = a.length; val n = b.length
        if (m == 0) return n; if (n == 0) return m
        var prev = IntArray(n + 1) { it }
        for (i in 1..m) {
            val cur = IntArray(n + 1); cur[0] = i
            for (j in 1..n) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                cur[j] = min(min(prev[j] + 1, cur[j - 1] + 1), prev[j - 1] + cost)
            }
            prev = cur
        }
        return prev[n]
    }

    private fun budget(len: Int) = if (len <= 4) 1 else if (len <= 7) 2 else 3
    private fun normWord(w: String) = w.lowercase().replace(Regex("[^a-z0-9']"), "")

    private fun applyPhrases(text: String, phrases: List<String>): String {
        if (phrases.isEmpty()) return text
        val tokens = text.split(Regex("(\\s+)")).toMutableList()
        // NOTE: split() drops the delimiters; rebuild with single spaces below.
        val words = tokens.filter { it.isNotEmpty() }.toMutableList()
        for (phrase in phrases) {
            val pw = phrase.split(Regex("\\s+"))
            val nN = pw.size
            val target = pw.joinToString(" ").lowercase()
            val tol = maxOf(1, ceil(target.length * 0.34).toInt())
            var s = 0
            while (s + nN <= words.size) {
                val window = (0 until nN).map { normWord(words[s + it]) }
                if (window.any { it.isEmpty() }) { s++; continue }
                val d = lev(window.joinToString(" "), target)
                if (d in 1..tol) {
                    val lastTok = words[s + nN - 1]
                    val trail = Regex("[.,!?;:]+$").find(lastTok)?.value ?: ""
                    words[s] = phrase + trail
                    for (k in 1 until nN) words[s + k] = ""
                    break
                }
                s++
            }
        }
        return words.filter { it.isNotEmpty() }.joinToString(" ").replace(Regex("\\s{2,}"), " ").trim()
    }

    fun applyDictionary(text: String, dictionary: List<String> = emptyList()): String {
        if (dictionary.isEmpty()) return text
        var t = text
        val singles = mutableListOf<String>(); val phrases = mutableListOf<String>()
        for (word in dictionary) {
            if (word.isBlank()) continue
            t = Regex("\\b" + Regex.escape(word) + "\\b", RegexOption.IGNORE_CASE).replace(t) { word }
            if (word.contains(Regex("\\s"))) phrases.add(word)
            else if (word.length >= 4) singles.add(word)
        }
        t = applyPhrases(t, phrases)
        if (singles.isNotEmpty()) {
            t = Regex("[A-Za-z][A-Za-z'’-]*").replace(t) { m ->
                val tok = m.value
                if (singles.any { it.equals(tok, ignoreCase = true) }) return@replace tok
                val low = tok.lowercase()
                var best: String? = null; var bestD = Int.MAX_VALUE
                for (w in singles) {
                    if (abs(w.length - tok.length) > 3) continue
                    val d = lev(low, w.lowercase())
                    if (d < bestD) { bestD = d; best = w }
                }
                if (best != null && bestD in 1..budget(best.length)) best!! else tok
            }
        }
        return t
    }

    /** Full pipeline driven by Settings flags (mirrors process() in JS). */
    fun process(
        raw: String?,
        punctuation: Boolean = true,
        grammar: Boolean = true,
        improve: Boolean = false,
        dictionary: List<String> = emptyList(),
    ): String {
        var t = stripNonSpeech(raw)
        if (t.isEmpty()) return ""
        if (improve) t = improveText(t)
        if (grammar) t = fixGrammar(t)
        if (punctuation) t = fixPunctuation(t)
        t = applyDictionary(t, dictionary)
        return t.trim()
    }
}
