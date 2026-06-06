package iq.fib.eamic.overlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Settings
import iq.fib.eamic.data.Repository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

/** Re-shows the floating bubble after reboot when "Start on boot" is enabled. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val repo = Repository.get(context)
        val startup = runBlocking { repo.settings.first().startup }
        val canOverlay = Settings.canDrawOverlays(context)
        if (startup && canOverlay) OverlayService.start(context)
    }
}
