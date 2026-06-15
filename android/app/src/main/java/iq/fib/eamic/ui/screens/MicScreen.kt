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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.Refresh
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import iq.fib.eamic.stt.AudioDevices
import iq.fib.eamic.stt.MicOption
import iq.fib.eamic.ui.components.Card
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.Sans
import iq.fib.eamic.ui.theme.Serif

/**
 * Microphone picker. Lets the user choose which input E Mic records from — the
 * fix for "I connected my headphones and the app stopped hearing me". Refresh
 * re-scans so a mic plugged in after opening this screen shows up.
 */
@Composable
fun MicScreen(
    selectedType: Int,
    onBack: () -> Unit,
    onSelect: (MicOption) -> Unit,
) {
    val context = LocalContext.current
    // Bumping this key forces a re-scan when the user taps Refresh.
    var refresh by remember { mutableStateOf(0) }
    val mics = remember(refresh) { AudioDevices.list(context) }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Spacer(Modifier.height(10.dp))
        Row(Modifier.clickable(onClick = onBack).padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = EMic.textMuted, modifier = Modifier.size(18.dp))
            Text("Back", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = EMic.textMuted)
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text("Microphone", fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 24.sp, color = EMic.text)
                Text("Pick which mic E Mic listens to", fontFamily = Sans, fontSize = 12.sp, color = EMic.textFaint)
            }
            Row(
                Modifier.clip(RoundedCornerShape(10.dp)).background(EMic.surface).border(1.dp, EMic.border, RoundedCornerShape(10.dp))
                    .clickable { refresh++ }.padding(horizontal = 11.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(Icons.Outlined.Refresh, null, tint = EMic.primary, modifier = Modifier.size(15.dp))
                Text("Refresh", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = EMic.primary)
            }
        }
        Spacer(Modifier.height(14.dp))

        Card(Modifier.fillMaxWidth()) {
            Column {
                mics.forEachIndexed { i, mic ->
                    MicRow(mic = mic, selected = mic.type == selectedType, onClick = { onSelect(mic) })
                    if (i != mics.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(EMic.border))
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Text(
            "If a headset isn't listening, connect it, tap Refresh, then select it here.",
            fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint,
        )
    }
}

@Composable
private fun MicRow(mic: MicOption, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(EMic.surface2), contentAlignment = Alignment.Center) {
            Icon(Icons.Outlined.Mic, null, tint = EMic.textMuted, modifier = Modifier.size(16.dp))
        }
        Text(mic.label, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = EMic.text, modifier = Modifier.weight(1f))
        // Radio indicator
        Box(
            Modifier.size(20.dp).clip(CircleShape)
                .border(2.dp, if (selected) EMic.primary else EMic.borderStrong, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (selected) Box(Modifier.size(10.dp).clip(CircleShape).background(EMic.primary))
        }
    }
}
