package iq.fib.eamic

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import iq.fib.eamic.data.Repository
import iq.fib.eamic.license.LicenseState
import iq.fib.eamic.overlay.OverlayService
import iq.fib.eamic.ui.screens.HistoryScreen
import iq.fib.eamic.ui.screens.HomeScreen
import iq.fib.eamic.ui.screens.LicenseScreen
import iq.fib.eamic.ui.screens.SettingsScreen
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.EMicTheme
import iq.fib.eamic.ui.theme.Sans

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repo = Repository.get(this)
        setContent { EMicTheme { RootApp(repo) } }
    }
}

private enum class Tab(val label: String, val outline: ImageVector, val filled: ImageVector) {
    HOME("Home", Icons.Outlined.Home, Icons.Filled.Home),
    HISTORY("History", Icons.Outlined.History, Icons.Outlined.History),
    SETTINGS("Settings", Icons.Outlined.Settings, Icons.Outlined.Settings),
}

@Composable
private fun RootApp(repo: Repository) {
    val context = LocalContext.current
    var tab by remember { mutableStateOf(Tab.HOME) }
    var showLicense by remember { mutableStateOf(false) }

    val settings by repo.settings.collectAsState()
    val license by repo.license.collectAsState()
    val trialDays by repo.trialDays.collectAsState()
    val stats by repo.stats.collectAsState()
    val history by repo.history.collectAsState()

    fun copy(text: String) {
        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("E Mic", text))
        Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
    }

    // Reflect the "Floating bubble" setting into the actual overlay service,
    // requesting the draw-over-other-apps permission the first time it's enabled.
    LaunchedEffect(settings.bubble) {
        if (settings.bubble) {
            if (android.provider.Settings.canDrawOverlays(context)) {
                OverlayService.start(context)
            } else {
                context.startActivity(
                    Intent(
                        android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:${context.packageName}"),
                    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        } else {
            OverlayService.stop(context)
        }
    }

    Column(Modifier.fillMaxSize().background(EMic.bg)) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when {
                showLicense -> LicenseScreen(
                    license = license,
                    onBack = { showLicense = false },
                    onActivate = {
                        repo.setLicense(LicenseState.PRO)
                        showLicense = false
                        Toast.makeText(context, "Pro activated — thank you!", Toast.LENGTH_SHORT).show()
                    },
                )
                tab == Tab.HOME -> HomeScreen(
                    license, trialDays, stats, history,
                    scratchpad = "",
                    onUpgrade = { showLicense = true },
                    onSeeAll = { tab = Tab.HISTORY },
                )
                tab == Tab.HISTORY -> HistoryScreen(history, ::copy, repo::deleteTranscript)
                tab == Tab.SETTINGS -> SettingsScreen(
                    license, trialDays, settings,
                    onCycle = { key ->
                        repo.updateSettings { s ->
                            when (key) {
                                "model" -> s.copy(model = cycle(listOf("Fast", "Balanced", "Accurate"), s.model))
                                "output" -> s.copy(output = cycle(listOf("Insert", "Copy only", "Insert + copy"), s.output))
                                else -> s
                            }
                        }
                    },
                    onToggle = { key ->
                        repo.updateSettings { s ->
                            when (key) {
                                "punctuation" -> s.copy(punctuation = !s.punctuation)
                                "bubble" -> s.copy(bubble = !s.bubble)
                                "startup" -> s.copy(startup = !s.startup)
                                else -> s
                            }
                        }
                    },
                    onAccount = { showLicense = true },
                )
            }
        }
        if (!showLicense) BottomNav(tab) { tab = it }
    }
}

private fun cycle(opts: List<String>, current: String): String =
    opts[(opts.indexOf(current) + 1).mod(opts.size)]

@Composable
private fun BottomNav(current: Tab, onSelect: (Tab) -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(EMic.surface).border(1.dp, EMic.border).padding(horizontal = 8.dp, vertical = 7.dp),
        horizontalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        Tab.entries.forEach { t ->
            val on = t == current
            Column(
                Modifier.weight(1f).clickable { onSelect(t) }.padding(vertical = 5.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Icon(if (on) t.filled else t.outline, t.label, tint = if (on) EMic.primary else EMic.textFaint, modifier = Modifier.size(21.dp))
                Text(t.label, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 10.5.sp, color = if (on) EMic.primary else EMic.textFaint)
            }
        }
    }
}
