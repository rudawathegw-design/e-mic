package iq.fib.eamic.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import iq.fib.eamic.license.LicenseState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private val Context.dataStore by preferencesDataStore(name = "emic")

/**
 * Single source of truth for the whole app — settings, license, stats, and
 * transcript history. Backed by DataStore; history is stored as a JSON string.
 * Exposed as StateFlows so both the Compose UI and the overlay service observe
 * the same state.
 */
class Repository private constructor(private val appContext: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _settings = MutableStateFlow(Settings())
    val settings = _settings.asStateFlow()

    private val _license = MutableStateFlow(LicenseState.TRIAL)
    val license = _license.asStateFlow()

    private val _trialDays = MutableStateFlow(10)
    val trialDays = _trialDays.asStateFlow()

    private val _stats = MutableStateFlow(Stats())
    val stats = _stats.asStateFlow()

    private val _history = MutableStateFlow(seedHistory())
    val history = _history.asStateFlow()

    init {
        scope.launch { load() }
    }

    // ---- mutations -------------------------------------------------------

    fun updateSettings(transform: (Settings) -> Settings) {
        _settings.value = transform(_settings.value)
        persist()
    }

    fun setLicense(state: LicenseState) {
        _license.value = state
        persist()
    }

    fun addTranscript(text: String) {
        val t = Transcript(id = System.currentTimeMillis(), time = "now", group = "Today", text = text)
        _history.value = listOf(t) + _history.value
        _stats.value = _stats.value.copy(
            words = _stats.value.words + text.trim().split(Regex("\\s+")).size,
            dictations = _stats.value.dictations + 1,
        )
        persist()
    }

    fun deleteTranscript(id: Long) {
        _history.value = _history.value.filterNot { it.id == id }
        persist()
    }

    // ---- persistence -----------------------------------------------------

    private fun persist() = scope.launch {
        appContext.dataStore.edit { p ->
            val s = _settings.value
            p[K.model] = s.model
            p[K.output] = s.output
            p[K.punct] = s.punctuation
            p[K.bubble] = s.bubble
            p[K.startup] = s.startup
            p[K.license] = _license.value.name
            p[K.words] = _stats.value.words
            p[K.dictations] = _stats.value.dictations
            p[K.history] = historyToJson(_history.value)
        }
    }

    private suspend fun load() {
        val p = appContext.dataStore.data.first()
        _settings.value = Settings(
            model = p[K.model] ?: "Balanced",
            output = p[K.output] ?: "Insert",
            punctuation = p[K.punct] ?: true,
            bubble = p[K.bubble] ?: true,
            startup = p[K.startup] ?: true,
        )
        _license.value = p[K.license]?.let { runCatching { LicenseState.valueOf(it) }.getOrNull() } ?: LicenseState.TRIAL
        _stats.value = Stats(words = p[K.words] ?: 1284, dictations = p[K.dictations] ?: 36)
        p[K.history]?.let { json -> historyFromJson(json)?.let { _history.value = it } }
    }

    private object K {
        val model = stringPreferencesKey("model")
        val output = stringPreferencesKey("output")
        val punct = booleanPreferencesKey("punctuation")
        val bubble = booleanPreferencesKey("bubble")
        val startup = booleanPreferencesKey("startup")
        val license = stringPreferencesKey("license")
        val words = intPreferencesKey("words")
        val dictations = intPreferencesKey("dictations")
        val history = stringPreferencesKey("history")
    }

    companion object {
        @Volatile private var instance: Repository? = null
        fun get(context: Context): Repository =
            instance ?: synchronized(this) {
                instance ?: Repository(context.applicationContext).also { instance = it }
            }

        private fun historyToJson(list: List<Transcript>): String {
            val arr = JSONArray()
            list.forEach { t ->
                arr.put(JSONObject().apply {
                    put("id", t.id); put("time", t.time); put("group", t.group); put("text", t.text)
                })
            }
            return arr.toString()
        }

        private fun historyFromJson(json: String): List<Transcript>? = runCatching {
            val arr = JSONArray(json)
            (0 until arr.length()).map {
                val o = arr.getJSONObject(it)
                Transcript(o.getLong("id"), o.getString("time"), o.getString("group"), o.getString("text"))
            }
        }.getOrNull()

        private fun seedHistory() = listOf(
            Transcript(1, "2:34 PM", "Today", "Let's lock the design review for Thursday and loop in the data team."),
            Transcript(2, "1:12 PM", "Today", "Can you send me the latest numbers before the standup tomorrow?"),
            Transcript(3, "11:48 AM", "Today", "The new onboarding flow cut drop-off by almost forty percent — great work."),
            Transcript(4, "5:20 PM", "Yesterday", "Reminder: send the updated contract to legal and CC Maya."),
            Transcript(5, "9:03 AM", "Yesterday", "Let's confirm the order on Tuesday, and I'll send over the invoice."),
        )
    }
}
