package iq.fib.eamic.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.GraphicEq
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Memory
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.TextFields
import androidx.compose.material.icons.outlined.VpnKey
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import iq.fib.eamic.data.Settings
import iq.fib.eamic.data.Stats
import iq.fib.eamic.data.Transcript
import iq.fib.eamic.license.LicenseState
import iq.fib.eamic.ui.components.Badge
import iq.fib.eamic.ui.components.Card
import iq.fib.eamic.ui.components.TrialBanner
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.Mono
import iq.fib.eamic.ui.theme.Sans
import iq.fib.eamic.ui.theme.Serif

private val Pad = 16.dp

@Composable
private fun SectionLabel(text: String, modifier: Modifier = Modifier) =
    Text(
        text.uppercase(), fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 10.5.sp,
        letterSpacing = 1.sp, color = EMic.textFaint, modifier = modifier,
    )

/* ---------------- Home ---------------- */
@Composable
fun HomeScreen(
    license: LicenseState,
    trialDays: Int,
    stats: Stats,
    recent: List<Transcript>,
    userName: String?,
    scratchpad: String,
    onUpgrade: () -> Unit,
    onSeeAll: () -> Unit,
    onDictate: () -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = Pad), contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 18.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Row {
                        Text(
                            if (userName.isNullOrBlank()) "Good evening" else "Good evening, ",
                            fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 25.sp, color = EMic.text,
                        )
                        if (!userName.isNullOrBlank()) {
                            Text(userName, fontFamily = Serif, fontWeight = FontWeight.Medium, fontStyle = FontStyle.Italic, fontSize = 25.sp, color = EMic.primaryStrong)
                        }
                    }
                    Text("Tap the bubble anywhere to talk", fontFamily = Sans, fontSize = 12.5.sp, color = EMic.textFaint)
                }
                Badge("PRIVATE", EMic.success, EMic.successSoft, EMic.successBorder)
            }
            Spacer(Modifier.height(18.dp))
            TrialBanner(license, trialDays, onUpgrade)
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                StatCard(Modifier.weight(1f), stats.words.toString(), "words", EMic.primary)
                StatCard(Modifier.weight(1f), stats.dictations.toString(), "dictations", EMic.success)
                StatCard(Modifier.weight(1f), "${stats.minutesSavedPrecise} m", "saved", EMic.primary)
            }
            Spacer(Modifier.height(16.dp))
            SectionLabel("Scratchpad")
            Spacer(Modifier.height(9.dp))
            Card(Modifier.fillMaxWidth().clickable(onClick = onDictate)) {
                Column {
                    Row(
                        Modifier.fillMaxWidth().background(EMic.surface2).padding(horizontal = 14.dp, vertical = 11.dp),
                        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(Icons.Outlined.GraphicEq, null, tint = EMic.primary, modifier = Modifier.size(14.dp))
                        Text("Tap to talk, text lands here", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = EMic.text)
                    }
                    Text(
                        scratchpad.ifEmpty { "Your dictated text will appear here…" },
                        fontFamily = Sans, fontSize = 14.5.sp,
                        color = if (scratchpad.isEmpty()) EMic.textFaint else EMic.text,
                        modifier = Modifier.padding(14.dp).fillMaxWidth().height(80.dp),
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                SectionLabel("Recent")
                Text("See all", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = EMic.primaryStrong, modifier = Modifier.clickable(onClick = onSeeAll))
            }
            Spacer(Modifier.height(4.dp))
        }
        items(recent.take(2)) { t -> TranscriptRow(t) }
    }
}

@Composable
private fun StatCard(modifier: Modifier, value: String, label: String, accent: Color) {
    Box(modifier.clip(RoundedCornerShape(14.dp)).background(EMic.surface).border(1.dp, EMic.border, RoundedCornerShape(14.dp))) {
        Box(Modifier.fillMaxWidth().height(3.dp).background(accent))
        Column(Modifier.padding(start = 12.dp, end = 12.dp, top = 16.dp, bottom = 13.dp)) {
            Text(value, fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 25.sp, color = EMic.text)
            Text(label, fontFamily = Mono, fontSize = 9.5.sp, color = EMic.textMuted, modifier = Modifier.padding(top = 6.dp))
        }
    }
}

@Composable
private fun TranscriptRow(t: Transcript) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 11.dp),
        horizontalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Text(t.time, fontFamily = Mono, fontSize = 10.5.sp, color = EMic.textFaint, modifier = Modifier.width(46.dp).padding(top = 2.dp))
        Text(t.text, fontFamily = Sans, fontSize = 13.5.sp, color = EMic.text, modifier = Modifier.weight(1f))
    }
}

/* ---------------- History ---------------- */
@Composable
fun HistoryScreen(transcripts: List<Transcript>, onCopy: (String) -> Unit, onDelete: (Long) -> Unit) {
    var q by remember { mutableStateOf("") }
    val filtered = transcripts.filter { it.text.contains(q, ignoreCase = true) }
    val order = listOf("Today", "Yesterday", "Earlier").filter { k -> filtered.any { it.group == k } }

    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(start = Pad, end = Pad, top = Pad, bottom = 8.dp)) {
            Text("History", fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 24.sp, color = EMic.text)
            Text("Stored privately on your phone", fontFamily = Sans, fontSize = 12.sp, color = EMic.textFaint)
        }
        Box(Modifier.padding(horizontal = Pad)) {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(EMic.surface).border(1.dp, EMic.border, RoundedCornerShape(12.dp)).padding(horizontal = 13.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Icon(Icons.Filled.Search, null, tint = EMic.textFaint, modifier = Modifier.size(16.dp))
                Box(Modifier.weight(1f)) {
                    if (q.isEmpty()) Text("Search transcripts", fontFamily = Sans, fontSize = 13.5.sp, color = EMic.textFaint)
                    BasicTextField(q, { q = it }, textStyle = androidx.compose.ui.text.TextStyle(fontFamily = Sans, fontSize = 13.5.sp, color = EMic.text))
                }
            }
        }
        if (filtered.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
                Text(
                    if (transcripts.isEmpty()) "No transcripts yet." else "No matches found.",
                    fontFamily = Sans, fontSize = 13.5.sp, color = EMic.textFaint, modifier = Modifier.padding(top = 50.dp),
                )
            }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(horizontal = Pad)) {
                order.forEach { k ->
                    item { SectionLabel(k, Modifier.padding(top = 14.dp, bottom = 4.dp)) }
                    items(filtered.filter { it.group == k }, key = { it.id }) { t ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                            Text(t.time, fontFamily = Mono, fontSize = 10.5.sp, color = EMic.textFaint, modifier = Modifier.width(46.dp).padding(top = 2.dp))
                            Text(t.text, fontFamily = Sans, fontSize = 13.5.sp, color = EMic.text, modifier = Modifier.weight(1f))
                            Icon(Icons.Filled.ContentCopy, "Copy", tint = EMic.textFaint, modifier = Modifier.size(28.dp).clip(RoundedCornerShape(7.dp)).clickable { onCopy(t.text) }.padding(7.dp))
                            Icon(Icons.Outlined.Delete, "Delete", tint = EMic.textFaint, modifier = Modifier.size(28.dp).clip(RoundedCornerShape(7.dp)).clickable { onDelete(t.id) }.padding(7.dp))
                        }
                    }
                }
            }
        }
    }
}

/* ---------------- Settings ---------------- */
@Composable
fun SettingsScreen(
    license: LicenseState,
    trialDays: Int,
    settings: Settings,
    onCycle: (String) -> Unit,
    onToggle: (String) -> Unit,
    onAccount: () -> Unit,
    onDictionary: () -> Unit,
) {
    val acctText = when (license) {
        LicenseState.PRO -> "Pro · Lifetime"
        LicenseState.EXPIRED -> "Trial ended — tap to upgrade"
        LicenseState.TRIAL -> "Trial · $trialDays days left"
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = Pad)) {
        item {
            Column(Modifier.padding(top = Pad, bottom = 8.dp)) {
                Text("Settings", fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 24.sp, color = EMic.text)
                Text("Everything runs on your device", fontFamily = Sans, fontSize = 12.sp, color = EMic.textFaint)
            }
            SectionLabel("Account", Modifier.padding(top = 16.dp, bottom = 7.dp))
            Card(Modifier.fillMaxWidth()) {
                SettingRow(Icons.Outlined.VpnKey, "License", acctText, valueText = null, onClick = onAccount)
            }
            SectionLabel("Dictation", Modifier.padding(top = 16.dp, bottom = 7.dp))
            Card(Modifier.fillMaxWidth()) {
                Column {
                    SettingRow(Icons.Outlined.Language, "Language", "More languages soon", "English", divider = true)
                    SettingRow(Icons.Outlined.TextFields, "Output", "What happens after you speak", settings.output) { onCycle("output") }
                    SettingRow(Icons.Outlined.Book, "Dictionary", "Fix names & special words", null, divider = true, onClick = onDictionary)
                    SettingToggle(Icons.Outlined.AutoAwesome, "Auto-punctuation", "Add commas & periods", settings.punctuation, last = true) { onToggle("punctuation") }
                }
            }
            SectionLabel("General", Modifier.padding(top = 16.dp, bottom = 7.dp))
            Card(Modifier.fillMaxWidth()) {
                Column {
                    SettingToggle(Icons.Outlined.GraphicEq, "Floating bubble", "Show the mic over other apps", settings.bubble) { onToggle("bubble") }
                    SettingToggle(Icons.Outlined.Refresh, "Start on boot", "Launch E Mic when phone starts", settings.startup, last = true) { onToggle("startup") }
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SettingRow(icon: ImageVector, title: String, subtitle: String, valueText: String?, divider: Boolean = false, onClick: (() -> Unit)? = null) {
    Column {
        Row(
            Modifier.fillMaxWidth().let { if (onClick != null) it.clickable(onClick = onClick) else it }.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(EMic.surface2), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = EMic.textMuted, modifier = Modifier.size(16.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = EMic.text)
                Text(subtitle, fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint)
            }
            if (valueText != null) Text(valueText, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = EMic.textMuted)
            Icon(Icons.Filled.ChevronRight, null, tint = EMic.textFaint, modifier = Modifier.size(16.dp))
        }
        if (divider) Box(Modifier.fillMaxWidth().height(1.dp).background(EMic.border))
    }
}

@Composable
private fun SettingToggle(icon: ImageVector, title: String, subtitle: String, on: Boolean, last: Boolean = false, onToggle: () -> Unit) {
    Column {
        if (!last) {} // dividers handled by sibling rows visually
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(EMic.surface2), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = EMic.textMuted, modifier = Modifier.size(16.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = EMic.text)
                Text(subtitle, fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint)
            }
            Toggle(on, onToggle)
        }
        if (!last) Box(Modifier.fillMaxWidth().height(1.dp).background(EMic.border))
    }
}

@Composable
private fun Toggle(on: Boolean, onToggle: () -> Unit) {
    Box(
        Modifier.size(width = 42.dp, height = 25.dp).clip(RoundedCornerShape(20.dp)).background(if (on) EMic.success else EMic.borderStrong).clickable(onClick = onToggle),
        contentAlignment = if (on) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(Modifier.padding(2.dp).size(21.dp).clip(CircleShape).background(Color.White))
    }
}
