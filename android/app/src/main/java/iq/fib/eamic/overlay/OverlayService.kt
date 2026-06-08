package iq.fib.eamic.overlay

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleService
import iq.fib.eamic.MainActivity
import iq.fib.eamic.R
import iq.fib.eamic.accessibility.InsertAccessibilityService
import iq.fib.eamic.data.Repository
import iq.fib.eamic.stt.AudioRecorder
import iq.fib.eamic.stt.Punctuate
import iq.fib.eamic.stt.WhisperBridge
import kotlin.concurrent.thread
import kotlin.math.abs

/**
 * Foreground service that owns the entire floating experience — the animated
 * wave bubble AND the dictation panel — drawn as overlay windows directly over
 * whatever app is in front (including the keyboard). Nothing launches the host
 * app; tap the bubble and the panel appears in place.
 */
class OverlayService : LifecycleService() {

    private lateinit var wm: WindowManager
    private val main = Handler(Looper.getMainLooper())
    private val recorder = AudioRecorder()
    private val repo by lazy { Repository.get(this) }

    private var bubble: View? = null
    private lateinit var bubbleLp: WindowManager.LayoutParams
    private var sheet: View? = null
    private var resultText: String = ""

    override fun onCreate() {
        super.onCreate()
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        promoteForeground()
        addBubble()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        // Re-promote so that once the mic permission is granted, a subsequent
        // start() upgrades the service to the microphone foreground type.
        promoteForeground()
        return START_STICKY
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }

    /** Themed context so layout attrs like selectableItemBackground resolve. */
    private fun themed() = android.view.ContextThemeWrapper(this, R.style.Theme_EMic)

    private fun overlayType(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

    private fun promoteForeground() {
        try {
            val type = when {
                Build.VERSION.SDK_INT >= 34 ->
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                Build.VERSION.SDK_INT >= 29 -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                else -> 0
            }
            ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(), type)
        } catch (e: Exception) {
            // Mic type can be refused if permission isn't granted yet / started
            // from background. Fall back to a plain foreground service so the
            // bubble still shows; recording is gated separately.
            try { ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(),
                if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0) }
            catch (_: Exception) {}
        }
    }

    // ---------- bubble ----------
    private fun addBubble() {
        if (bubble != null) return
        val view = LayoutInflater.from(themed()).inflate(R.layout.overlay_bubble, null)
        bubbleLp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 24; y = 320
        }

        var downX = 0f; var downY = 0f; var startX = 0; var startY = 0; var moved = false
        view.setOnTouchListener { v, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> {
                    downX = e.rawX; downY = e.rawY; startX = bubbleLp.x; startY = bubbleLp.y; moved = false
                    v.animate().scaleX(0.92f).scaleY(0.92f).setDuration(120).start(); true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - downX; val dy = e.rawY - downY
                    if (abs(dx) > 8 || abs(dy) > 8) moved = true
                    bubbleLp.x = startX + dx.toInt(); bubbleLp.y = startY + dy.toInt()
                    wm.updateViewLayout(v, bubbleLp); true
                }
                MotionEvent.ACTION_UP -> {
                    v.animate().scaleX(1f).scaleY(1f).setDuration(120).start()
                    if (!moved) openSheet() else snapToEdge(v); true
                }
                else -> false
            }
        }
        bubble = view
        wm.addView(view, bubbleLp)
    }

    private fun snapToEdge(v: View) {
        val screenW = resources.displayMetrics.widthPixels
        bubbleLp.x = if (bubbleLp.x + v.width / 2 < screenW / 2) 12 else screenW - v.width - 12
        wm.updateViewLayout(v, bubbleLp)
    }

    private fun setBubbleVisible(visible: Boolean) {
        bubble?.visibility = if (visible) View.VISIBLE else View.GONE
    }

    // ---------- dictation panel ----------
    private fun openSheet() {
        if (sheet != null) return
        val v = LayoutInflater.from(themed()).inflate(R.layout.overlay_sheet, null)
        val lp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType(),
            // NOT_FOCUSABLE keeps the underlying app's text field focused, so
            // Insert can type into it; we still receive touches on our views.
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.TOP or Gravity.START }

        v.findViewById<View>(R.id.sheet_root).setOnClickListener { closeSheet() }
        v.findViewById<View>(R.id.sheet_card).setOnClickListener { /* swallow */ }
        v.findViewById<View>(R.id.btn_cancel).setOnClickListener { closeSheet() }
        v.findViewById<View>(R.id.btn_done).setOnClickListener { onDone() }
        v.findViewById<View>(R.id.btn_close).setOnClickListener { closeSheet() }
        v.findViewById<View>(R.id.btn_redo).setOnClickListener { startListening() }
        v.findViewById<View>(R.id.btn_copy).setOnClickListener { onCopy() }
        v.findViewById<View>(R.id.btn_insert).setOnClickListener { onInsert() }

        sheet = v
        setBubbleVisible(false)
        wm.addView(v, lp)
        startListening()
    }

    private fun showGroup(listening: Boolean, transcribing: Boolean, result: Boolean) {
        val v = sheet ?: return
        v.findViewById<View>(R.id.group_listening).visibility = if (listening) View.VISIBLE else View.GONE
        v.findViewById<View>(R.id.group_transcribing).visibility = if (transcribing) View.VISIBLE else View.GONE
        v.findViewById<View>(R.id.group_result).visibility = if (result) View.VISIBLE else View.GONE
    }

    private fun startListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            toast("Open E Mic once and allow the microphone")
            closeSheet(); return
        }
        showGroup(listening = true, transcribing = false, result = false)
        runCatching { recorder.start() }.onFailure { toast("Microphone unavailable"); closeSheet() }
    }

    private fun onDone() {
        showGroup(listening = false, transcribing = true, result = false)
        val punctuate = repo.settings.value.punctuation
        thread {
            val samples = recorder.stop()
            val raw = if (WhisperBridge.ensureLoaded(this)) WhisperBridge.transcribe(samples) else null
            val text = raw?.let { Punctuate.process(it, punctuation = punctuate, grammar = punctuate) }
                ?.ifBlank { "" }
                ?: "(Could not transcribe — make sure the model is bundled.)"
            main.post {
                if (sheet == null) return@post
                resultText = text
                sheet?.findViewById<TextView>(R.id.result_text)?.text = text
                showGroup(listening = false, transcribing = false, result = true)
            }
        }
    }

    private fun onCopy() {
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("E Mic", resultText))
        repo.addTranscript(resultText)
        toast("Copied to clipboard")
        closeSheet()
    }

    private fun onInsert() {
        val ok = InsertAccessibilityService.insertText(resultText)
        repo.addTranscript(resultText)
        toast(if (ok) "Inserted" else "Enable E Mic accessibility to insert")
        closeSheet()
    }

    private fun closeSheet() {
        runCatching { recorder.stop() }
        sheet?.let { runCatching { wm.removeView(it) } }
        sheet = null
        setBubbleVisible(true)
    }

    private fun toast(msg: String) = main.post { Toast.makeText(this, msg, Toast.LENGTH_SHORT).show() }

    // ---------- foreground notification ----------
    private fun buildNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL, "E Mic", NotificationManager.IMPORTANCE_MIN)
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
        val tap = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setContentTitle("E Mic")
            .setContentText("Tap the bubble anywhere to talk")
            .setSmallIcon(R.drawable.ic_brandmark)
            .setContentIntent(tap)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        closeSheet()
        bubble?.let { runCatching { wm.removeView(it) } }
        bubble = null
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "emic_overlay"
        private const val NOTIF_ID = 42

        fun start(context: Context) {
            val i = Intent(context, OverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(i)
            else context.startService(i)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, OverlayService::class.java))
        }
    }
}
