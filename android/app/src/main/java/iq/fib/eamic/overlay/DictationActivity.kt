package iq.fib.eamic.overlay

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import iq.fib.eamic.accessibility.InsertAccessibilityService
import iq.fib.eamic.data.Repository
import iq.fib.eamic.stt.AudioRecorder
import iq.fib.eamic.stt.Punctuate
import iq.fib.eamic.stt.WhisperBridge
import iq.fib.eamic.ui.components.LiveWave
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.EMicTheme
import iq.fib.eamic.ui.theme.Sans
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private enum class Flow { LISTENING, TRANSCRIBING, RESULT }

class DictationActivity : ComponentActivity() {

    private val recorder = AudioRecorder()

    private val micPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) recorder.start() else { Toast.makeText(this, "Microphone permission needed", Toast.LENGTH_SHORT).show(); finish() }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = Repository.get(this)

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) recorder.start()
        else micPermission.launch(Manifest.permission.RECORD_AUDIO)

        setContent {
            EMicTheme {
                var flow by remember { mutableStateOf(Flow.LISTENING) }
                var result by remember { mutableStateOf("") }
                val context = LocalContext.current

                suspend fun runTranscription() {
                    val samples = recorder.stop()
                    val punctuate = repo.settings.value.punctuation
                    val text = withContext(Dispatchers.Default) {
                        val raw = if (WhisperBridge.ensureLoaded(context)) WhisperBridge.transcribe(samples) else null
                        raw?.let {
                            // Same rules-only cleanup as the desktop app, gated by the
                            // Auto-punctuation toggle (grammar rides along with it).
                            Punctuate.process(it, punctuation = punctuate, grammar = punctuate)
                        }
                    }
                    result = text?.ifBlank { "" }
                        ?: "(Add whisper.cpp + a model to enable on-device transcription — see android/README.)"
                    flow = Flow.RESULT
                }

                Box(Modifier.fillMaxSize().background(Color(0x57130E08)).clickable { finish() }, contentAlignment = Alignment.BottomCenter) {
                    Sheet {
                        when (flow) {
                            Flow.LISTENING -> Listening(
                                onCancel = { recorder.stop(); finish() },
                                onDone = { flow = Flow.TRANSCRIBING },
                            )
                            Flow.TRANSCRIBING -> {
                                LaunchedEffect(Unit) { runTranscription() }
                                Transcribing()
                            }
                            Flow.RESULT -> ResultSheet(
                                text = result,
                                onClose = { finish() },
                                onRedo = { recorder.start(); flow = Flow.LISTENING },
                                onCopy = {
                                    val cm = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
                                    cm.setPrimaryClip(android.content.ClipData.newPlainText("E Mic", result))
                                    repo.addTranscript(result)
                                    Toast.makeText(this@DictationActivity, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                                    finish()
                                },
                                onInsert = {
                                    val ok = InsertAccessibilityService.insertText(result)
                                    repo.addTranscript(result)
                                    Toast.makeText(this@DictationActivity, if (ok) "Inserted" else "Enable E Mic accessibility to insert", Toast.LENGTH_SHORT).show()
                                    finish()
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Sheet(content: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(10.dp).clip(RoundedCornerShape(24.dp)).background(EMic.surface).border(1.dp, EMic.border, RoundedCornerShape(24.dp)).padding(18.dp),
    ) {
        Box(Modifier.size(width = 38.dp, height = 4.dp).clip(RoundedCornerShape(3.dp)).background(EMic.borderStrong).align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(14.dp))
        content()
    }
}

@Composable
private fun Listening(onCancel: () -> Unit, onDone: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
        Box(Modifier.size(9.dp).clip(CircleShape).background(EMic.primary))
        Text("Listening…", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = EMic.text, modifier = Modifier.weight(1f))
        Text("EN", fontFamily = iq.fib.eamic.ui.theme.Mono, fontWeight = FontWeight.SemiBold, fontSize = 10.5.sp, color = EMic.primaryStrong,
            modifier = Modifier.clip(RoundedCornerShape(7.dp)).background(EMic.primarySoft).border(1.dp, EMic.primaryBorder, RoundedCornerShape(7.dp)).padding(horizontal = 8.dp, vertical = 3.dp))
    }
    Spacer(Modifier.height(14.dp))
    Box(Modifier.fillMaxWidth().height(46.dp), contentAlignment = Alignment.Center) {
        LiveWave(barCount = 21, barWidth = 3, maxHeight = 42)
    }
    Spacer(Modifier.height(20.dp))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        CircleButton("Cancel", Icons.Filled.Close, filled = false, onClick = onCancel)
        Spacer(Modifier.size(40.dp))
        CircleButton("Done", Icons.Filled.Check, filled = true, onClick = onDone)
    }
    Spacer(Modifier.height(6.dp))
}

@Composable
private fun CircleButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, filled: Boolean, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Box(
            Modifier.size(62.dp).clip(CircleShape)
                .background(if (filled) EMic.primary else EMic.surface)
                .border(if (filled) 0.dp else 1.5.dp, EMic.borderStrong, CircleShape)
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, label, tint = if (filled) Color.White else EMic.textMuted, modifier = Modifier.size(26.dp)) }
        Text(label, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = if (filled) EMic.primaryStrong else EMic.textMuted)
    }
}

@Composable
private fun Transcribing() {
    Row(Modifier.fillMaxWidth().padding(vertical = 20.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator(color = EMic.primary, strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp))
        Spacer(Modifier.size(11.dp))
        Text("Transcribing & adding punctuation…", fontFamily = Sans, fontWeight = FontWeight.Medium, fontSize = 14.5.sp, color = EMic.textMuted)
    }
}

@Composable
private fun ResultSheet(text: String, onClose: () -> Unit, onRedo: () -> Unit, onCopy: () -> Unit, onInsert: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text("Your text", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = EMic.text, modifier = Modifier.weight(1f))
        Box(Modifier.size(30.dp).clip(CircleShape).background(EMic.surface3).clickable(onClick = onClose), contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Close, "Close", tint = EMic.textMuted, modifier = Modifier.size(15.dp))
        }
    }
    Spacer(Modifier.height(14.dp))
    Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(EMic.surface).border(1.dp, EMic.border, RoundedCornerShape(14.dp)).padding(14.dp)) {
        Text(text, fontFamily = Sans, fontSize = 15.5.sp, color = EMic.text)
    }
    Spacer(Modifier.height(8.dp))
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.weight(1f)) {
            Icon(Icons.Filled.Check, null, tint = EMic.success, modifier = Modifier.size(13.dp))
            Text("Cleaned & punctuated", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = EMic.success)
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.clickable(onClick = onRedo)) {
            Icon(Icons.Outlined.Refresh, null, tint = EMic.primaryStrong, modifier = Modifier.size(13.dp))
            Text("Redo", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp, color = EMic.primaryStrong)
        }
    }
    Spacer(Modifier.height(14.dp))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
        OptButton("Copy", Icons.Filled.ContentCopy, primary = false, modifier = Modifier.weight(1f), onClick = onCopy)
        OptButton("Insert", Icons.Filled.Check, primary = true, modifier = Modifier.weight(1f), onClick = onInsert)
    }
}

@Composable
private fun OptButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, primary: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Row(
        modifier.clip(RoundedCornerShape(13.dp))
            .background(if (primary) EMic.primary else EMic.surface)
            .border(if (primary) 0.dp else 1.5.dp, EMic.borderStrong, RoundedCornerShape(13.dp))
            .clickable(onClick = onClick).padding(14.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = if (primary) Color.White else EMic.text, modifier = Modifier.size(18.dp))
        Spacer(Modifier.size(9.dp))
        Text(label, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = if (primary) Color.White else EMic.text)
    }
}
