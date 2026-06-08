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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Delete
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.Sans
import iq.fib.eamic.ui.theme.Serif

/**
 * Custom dictionary editor. Words/phrases added here are exact-matched (and
 * fuzzy-corrected) in every transcript — handy for names, brands, and jargon
 * Whisper tends to mishear. Mirrors the desktop app's dictionary feature.
 */
@Composable
fun DictionaryScreen(
    words: List<String>,
    onBack: () -> Unit,
    onAdd: (String) -> Unit,
    onRemove: (String) -> Unit,
) {
    var input by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Spacer(Modifier.height(10.dp))
        Row(Modifier.clickable(onClick = onBack).padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = EMic.textMuted, modifier = Modifier.size(18.dp))
            Text("Back", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = EMic.textMuted)
        }
        Text("Dictionary", fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 24.sp, color = EMic.text)
        Text("Words & names E Mic should always get right", fontFamily = Sans, fontSize = 12.sp, color = EMic.textFaint)
        Spacer(Modifier.height(14.dp))

        // Add row
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(EMic.surface).border(1.dp, EMic.border, RoundedCornerShape(12.dp)).padding(horizontal = 13.dp, vertical = 12.dp)
            ) {
                if (input.isEmpty()) Text("Add a word or name", fontFamily = Sans, fontSize = 14.sp, color = EMic.textFaint)
                BasicTextField(
                    value = input,
                    onValueChange = { input = it },
                    singleLine = true,
                    textStyle = TextStyle(fontFamily = Sans, fontSize = 14.sp, color = EMic.text),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { if (input.isNotBlank()) { onAdd(input); input = "" } }),
                )
            }
            Box(
                Modifier.size(46.dp).clip(RoundedCornerShape(12.dp)).background(EMic.primary)
                    .clickable { if (input.isNotBlank()) { onAdd(input); input = "" } },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Add, "Add", tint = Color.White, modifier = Modifier.size(22.dp)) }
        }

        Spacer(Modifier.height(8.dp))
        if (words.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
                Text("No words yet. Add names or terms E Mic keeps mishearing.", fontFamily = Sans, fontSize = 13.5.sp, color = EMic.textFaint, modifier = Modifier.padding(top = 40.dp))
            }
        } else {
            LazyColumn(Modifier.fillMaxSize()) {
                items(words, key = { it }) { w ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 11.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(w, fontFamily = Sans, fontSize = 14.5.sp, color = EMic.text, modifier = Modifier.weight(1f))
                        Icon(
                            Icons.Outlined.Delete, "Delete", tint = EMic.textFaint,
                            modifier = Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).clickable { onRemove(w) }.padding(6.dp),
                        )
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(EMic.border))
                }
            }
        }
    }
}
