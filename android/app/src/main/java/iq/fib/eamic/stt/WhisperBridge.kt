package iq.fib.eamic.stt

import android.content.Context
import java.io.File

/**
 * Kotlin ↔ whisper.cpp bridge. The native library is built from
 * src/main/cpp (see CMakeLists.txt) and links whisper.cpp + ggml.
 *
 * Model: ship a GGML/GGUF English model (e.g. ggml-base.en.bin, q5 quantised)
 * in app/src/main/assets/models/ and it is copied to internal storage on first
 * run. This matches the desktop app's whisper-base.en default.
 */
object WhisperBridge {

    @Volatile private var ctxPtr: Long = 0L
    private var loaded = false

    init {
        runCatching { System.loadLibrary("emic-whisper") }.onFailure { loaded = false }
        loaded = runCatching { System.loadLibrary("emic-whisper"); true }.getOrDefault(false)
    }

    /** True once the .so is present (i.e. whisper.cpp sources were added & built). */
    val nativeAvailable: Boolean get() = loaded

    /** Copy the bundled model out of assets and init the whisper context once. */
    @Synchronized
    fun ensureLoaded(context: Context, modelAsset: String = "models/ggml-base.en.bin"): Boolean {
        if (!loaded) return false
        if (ctxPtr != 0L) return true
        val modelFile = File(context.filesDir, modelAsset.substringAfterLast('/'))
        if (!modelFile.exists()) {
            runCatching {
                context.assets.open(modelAsset).use { input ->
                    modelFile.outputStream().use { input.copyTo(it) }
                }
            }.getOrElse { return false }
        }
        ctxPtr = nativeInit(modelFile.absolutePath)
        return ctxPtr != 0L
    }

    /**
     * Transcribe 16 kHz mono float PCM (range -1..1). Returns the recognized
     * text, or null if the engine is unavailable.
     */
    fun transcribe(samples: FloatArray): String? {
        if (ctxPtr == 0L) return null
        return nativeTranscribe(ctxPtr, samples).trim()
    }

    fun release() {
        if (ctxPtr != 0L) { nativeFree(ctxPtr); ctxPtr = 0L }
    }

    // ---- native methods (implemented in cpp/whisper_jni.cpp) ----
    private external fun nativeInit(modelPath: String): Long
    private external fun nativeTranscribe(ctx: Long, samples: FloatArray): String
    private external fun nativeFree(ctx: Long)
}
