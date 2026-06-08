package iq.fib.eamic.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.Sans
import iq.fib.eamic.update.Updater

/**
 * Full-screen update gate. Shown over everything when a newer release exists.
 * Mandatory updates have no dismiss button; optional ones offer "Later".
 */
@Composable
fun UpdatePrompt(
    release: Updater.Release,
    downloading: Boolean,
    progress: Int,
    onUpdate: () -> Unit,
    onLater: () -> Unit,
) {
    Box(
        Modifier.fillMaxSize().background(EMic.bg.copy(alpha = 0.96f)).padding(28.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp))
                .background(EMic.surface).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                if (release.isMandatory) "Update required" else "Update available",
                fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = EMic.text,
            )
            Text(
                "E Mic ${release.versionName} is ready." +
                    if (release.isMandatory) " You need to update to keep using the app." else "",
                fontFamily = Sans, fontSize = 13.5.sp, color = EMic.textFaint,
            )

            if (downloading) {
                if (progress >= 0) {
                    LinearProgressIndicator(
                        progress = progress / 100f,
                        modifier = Modifier.fillMaxWidth(),
                        color = EMic.primary,
                    )
                    Text("$progress%", fontFamily = Sans, fontSize = 12.sp, color = EMic.textFaint)
                } else {
                    LinearProgressIndicator(Modifier.fillMaxWidth(), color = EMic.primary)
                    Text("Downloading…", fontFamily = Sans, fontSize = 12.sp, color = EMic.textFaint)
                }
            } else {
                Button(
                    onClick = onUpdate,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = EMic.primary),
                ) { Text("Update now", fontFamily = Sans, fontWeight = FontWeight.SemiBold) }

                if (!release.isMandatory) {
                    TextButton(onClick = onLater, modifier = Modifier.fillMaxWidth()) {
                        Text("Later", fontFamily = Sans, color = EMic.textFaint)
                    }
                }
            }
        }
    }
}
