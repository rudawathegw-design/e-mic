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

    private val _history = MutableStateFlow<List<Transcript>>(emptyList())
    val history = _history.asStateFlow()

    private val _dictionary = MutableStateFlow<List<String>>(emptyList())
    val dictionary = _dictionary.asStateFlow()

    init {
        scope.launch { load() }
    }

    fun addDictionaryWord(word: String) {
        val w = word.trim()
        if (w.isEmpty() || _dictionary.value.any { it.equals(w, ignoreCase = true) }) return
        _dictionary.value = _dictionary.value + w
        persist()
    }

    fun removeDictionaryWord(word: String) {
        _dictionary.value = _dictionary.value.filterNot { it == word }
        persist()
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
        val now = System.currentTimeMillis()
        val clock = java.text.SimpleDateFormat("h:mm a", java.util.Locale.getDefault()).format(java.util.Date(now))
        val t = Transcript(id = now, time = clock, group = "Today", text = text)
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
            p[K.dictionary] = JSONArray(_dictionary.value).toString()
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
        _stats.value = Stats(words = p[K.words] ?: 0, dictations = p[K.dictations] ?: 0)
        p[K.history]?.let { json -> historyFromJson(json)?.let { _history.value = it } }
        p[K.dictionary]?.let { json ->
            runCatching {
                val arr = JSONArray(json)
                _dictionary.value = (0 until arr.length()).map { arr.getString(it) }
            }
        }
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
        val dictionary = stringPreferencesKey("dictionary")
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
    }
}
