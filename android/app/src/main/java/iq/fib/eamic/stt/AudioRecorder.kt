package iq.fib.eamic.stt

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.ByteArrayOutputStream

/**
 * Captures 16 kHz mono PCM from the mic — the format whisper.cpp expects.
 * Records until [stop] is called, then returns normalized float samples.
 */
class AudioRecorder {
    private val sampleRate = 16_000
    private val minBuf = AudioRecord.getMinBufferSize(
        sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
    )

    @Volatile private var recording = false
    private var thread: Thread? = null
    private val pcm = ByteArrayOutputStream()

    @SuppressLint("MissingPermission") // RECORD_AUDIO must be granted by caller
    fun start() {
        if (recording) return
        recording = true
        pcm.reset()
        val record = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
            maxOf(minBuf, sampleRate * 2),
        )
        thread = Thread {
            val buf = ShortArray(minBuf)
            record.startRecording()
            while (recording) {
                val n = record.read(buf, 0, buf.size)
                for (i in 0 until n) {
                    val s = buf[i].toInt()
                    pcm.write(s and 0xFF)
                    pcm.write((s shr 8) and 0xFF)
                }
            }
            record.stop()
            record.release()
        }.also { it.start() }
    }

    /** Stop and return the captured audio as normalized float samples (-1..1). */
    fun stop(): FloatArray {
        recording = false
        thread?.join(2000)
        thread = null
        val bytes = pcm.toByteArray()
        val out = FloatArray(bytes.size / 2)
        for (i in out.indices) {
            val lo = bytes[i * 2].toInt() and 0xFF
            val hi = bytes[i * 2 + 1].toInt()
            out[i] = ((hi shl 8) or lo) / 32768f
        }
        return out
    }
}
