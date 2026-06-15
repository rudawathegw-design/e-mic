package iq.fib.eamic.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import iq.fib.eamic.license.LicenseState
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.Sans

/** Small pill badge, e.g. "● PRIVATE" / "● ACTIVE". */
@Composable
fun Badge(text: String, color: Color = EMic.success, soft: Color = EMic.successSoft, border: Color = EMic.successBorder) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(soft)
            .border(1.dp, border, RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(color))
        Text(text, fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 10.5.sp, color = color, letterSpacing = 0.5.sp)
    }
}

/** White rounded card matching the prototype's .st / .note / .set-card surfaces. */
@Composable
fun Card(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(EMic.surface)
            .border(1.dp, EMic.border, RoundedCornerShape(14.dp))
    ) { content() }
}

/** The trial / expired / pro banner from the prototype's TrialBanner. */
@Composable
fun TrialBanner(license: LicenseState, trialDays: Int, onUpgrade: () -> Unit) {
    when (license) {
        LicenseState.PRO -> Card(Modifier.fillMaxWidth()) {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Pro — Lifetime", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = EMic.text)
                    Text("All features unlocked. Thank you!", fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint)
                }
                Badge("ACTIVE")
            }
        }
        LicenseState.EXPIRED -> Box(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(EMic.dangerSoft)
                .border(1.dp, Color(0xFFE8C7C2), RoundedCornerShape(14.dp))
        ) {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Trial ended", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = EMic.text)
                    Text("Upgrade to Pro to keep dictating", fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint)
                }
                UpgradeButton("Upgrade to Pro", onUpgrade)
            }
        }
        LicenseState.TRIAL -> Card(Modifier.fillMaxWidth()) {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Free trial", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = EMic.text)
                    Text("$trialDays days left", fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint)
                    Spacer(Modifier.size(7.dp))
                    Box(
                        Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(5.dp)).background(EMic.surface3)
                    ) {
                        Box(Modifier.fillMaxWidth((trialDays / 10f).coerceIn(0f, 1f)).height(5.dp).clip(RoundedCornerShape(5.dp)).background(EMic.primary))
                    }
                }
                UpgradeButton("Upgrade", onUpgrade)
            }
        }
    }
}

@Composable
fun UpgradeButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = EMic.primary),
        shape = RoundedCornerShape(9.dp),
    ) {
        Text(text, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, color = Color.White)
    }
}
