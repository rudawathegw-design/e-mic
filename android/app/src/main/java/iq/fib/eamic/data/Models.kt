package iq.fib.eamic.data

/** One stored transcript, mirroring the prototype's TX rows. */
data class Transcript(
    val id: Long,
    val time: String,   // e.g. "2:34 PM" or "now"
    val group: String,  // "Today" | "Yesterday" | "Earlier"
    val text: String,
)

/** User-tunable dictation/general settings (Settings screen). */
data class Settings(
    val model: String = "Balanced",       // Fast | Balanced | Accurate
    val output: String = "Insert",        // Insert | Copy only | Insert + copy
    val punctuation: Boolean = true,
    val bubble: Boolean = true,
    val startup: Boolean = true,
)

/** Aggregate home-screen stats — accumulated from real dictations, from zero. */
data class Stats(
    val words: Int = 0,
    val dictations: Int = 0,
) {
    /**
     * Minutes saved vs typing. Speaking ≈150 wpm, typing on a phone ≈30 wpm,
     * so each dictated word saves time ≈ word/30 − word/150 minutes.
     */
    val minutesSaved: Int get() = Math.round(words * (1f / 30f - 1f / 150f))
}
