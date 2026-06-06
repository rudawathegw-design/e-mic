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

/** Aggregate home-screen stats. */
data class Stats(
    val words: Int = 1284,
    val dictations: Int = 36,
) {
    /** Minutes saved — prototype uses words/40. */
    val minutesSaved: Int get() = Math.round(words / 40f)
}
