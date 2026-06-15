package iq.fib.eamic.stt

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import java.io.ByteArrayOutputStream

/** One selectable microphone. [type] 0 means "Automatic" (let Android choose). */
data class MicOption(val type: Int, val label: String)

/**
 * Enumerates the phone's audio inputs so the user can pick which mic E Mic
 * listens to. Without this, connecting a headset silently reroutes capture to a
 * mic that often doesn't work — the app then "hears nothing".
 */
object AudioDevices {

    /** Automatic first, then every distinct input device with a friendly name. */
    fun list(context: Context): List<MicOption> {
        val out = mutableListOf(MicOption(0, "Automatic"))
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val seen = HashSet<Int>()
        am.getDevices(AudioManager.GET_DEVICES_INPUTS).forEach { d ->
            if (!d.isSource || seen.contains(d.type)) return@forEach
            val label = labelFor(d) ?: return@forEach
            seen.add(d.type)
            out.add(MicOption(d.type, label))
        }
        return out
    }

    /** Human label for a mic [type], or the option's stored label as fallback. */
    fun labelForType(context: Context, type: Int, fallback: String): String =
        list(context).firstOrNull { it.type == type }?.label ?: fallback

    private fun labelFor(d: AudioDeviceInfo): String? = when (d.type) {
        AudioDeviceInfo.TYPE_BUILTIN_MIC -> "Phone microphone"
        AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth headset" + nameSuffix(d)
        AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired headset mic"
        AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_DEVICE -> "USB microphone" + nameSuffix(d)
        else -> d.productName?.toString()?.trim()?.takeIf { it.isNotEmpty() }
    }

    private fun nameSuffix(d: AudioDeviceInfo): String {
        val n = d.productName?.toString()?.trim().orEmpty()
        return if (n.isEmpty()) "" else " ($n)"
    }
}

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
    private var audioManager: AudioManager? = null
    private var startedSco = false

    @SuppressLint("MissingPermission") // RECORD_AUDIO must be granted by caller
    fun start(context: Context, micType: Int = 0) {
        if (recording) return
        recording = true
        pcm.reset()

        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager = am

        // The chosen input device, if it's currently present. Falls back to
        // automatic routing when the selected mic isn't connected.
        val chosen = if (micType == 0) null
            else am.getDevices(AudioManager.GET_DEVICES_INPUTS).firstOrNull { it.type == micType && it.isSource }

        // A Bluetooth headset mic only works once the SCO link is up.
        if (chosen?.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
            runCatching {
                am.startBluetoothSco()
                am.isBluetoothScoOn = true
                startedSco = true
            }
        }

        val record = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
            maxOf(minBuf, sampleRate * 2),
        )
        if (chosen != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            runCatching { record.preferredDevice = chosen }
        }
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
        if (startedSco) {
            runCatching {
                audioManager?.isBluetoothScoOn = false
                audioManager?.stopBluetoothSco()
            }
            startedSco = false
        }
        audioManager = null
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
