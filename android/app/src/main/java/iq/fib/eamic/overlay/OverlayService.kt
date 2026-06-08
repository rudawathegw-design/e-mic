package iq.fib.eamic.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.lifecycle.LifecycleService
import iq.fib.eamic.MainActivity
import iq.fib.eamic.R
import kotlin.math.abs

/**
 * Foreground service that draws the always-on floating mic bubble over other
 * apps (the prototype's .bubble). Dragging repositions it; a tap (no drag)
 * launches the translucent [DictationActivity] which runs the listen →
 * transcribe → result flow.
 */
class OverlayService : LifecycleService() {

    private lateinit var wm: WindowManager
    private var bubble: View? = null
    private lateinit var lp: WindowManager.LayoutParams

    override fun onCreate() {
        super.onCreate()
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        try {
            val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
            ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(), type)
        } catch (e: Exception) {
            // If the foreground promotion is refused for any reason, still try to
            // show the bubble rather than crashing the whole app.
        }
        addBubble()
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }

    private fun addBubble() {
        if (bubble != null) return
        val view = View.inflate(this, R.layout.overlay_bubble, null)
        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        lp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
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
                    downX = e.rawX; downY = e.rawY; startX = lp.x; startY = lp.y; moved = false
                    v.animate().scaleX(0.92f).scaleY(0.92f).setDuration(120).start()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (e.rawX - downX); val dy = (e.rawY - downY)
                    if (abs(dx) > 8 || abs(dy) > 8) moved = true
                    lp.x = startX + dx.toInt(); lp.y = startY + dy.toInt()
                    wm.updateViewLayout(v, lp)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    v.animate().scaleX(1f).scaleY(1f).setDuration(120).start()
                    if (!moved) openDictation() else snapToEdge(v)
                    true
                }
                else -> false
            }
        }
        bubble = view
        wm.addView(view, lp)
    }

    private fun snapToEdge(v: View) {
        val screenW = resources.displayMetrics.widthPixels
        lp.x = if (lp.x + v.width / 2 < screenW / 2) 12 else screenW - v.width - 12
        wm.updateViewLayout(v, lp)
    }

    private fun openDictation() {
        startActivity(Intent(this, DictationActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

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
