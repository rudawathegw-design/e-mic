package iq.fib.eamic.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
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
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import iq.fib.eamic.R
import iq.fib.eamic.license.License
import iq.fib.eamic.license.LicenseState
import iq.fib.eamic.ui.components.Badge
import iq.fib.eamic.ui.theme.EMic
import iq.fib.eamic.ui.theme.Mono
import iq.fib.eamic.ui.theme.Sans
import iq.fib.eamic.ui.theme.Serif

@Composable
fun LicenseScreen(license: LicenseState, onBack: () -> Unit, onActivate: (String) -> Unit) {
    LazyColumn(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        item {
            Spacer(Modifier.height(10.dp))
            Row(Modifier.clickable(onClick = onBack).padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = EMic.textMuted, modifier = Modifier.size(18.dp))
                Text("Back", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = EMic.textMuted)
            }
            if (license == LicenseState.PRO) ProBlock() else BuyBlock(onActivate)
            Spacer(Modifier.height(18.dp))
        }
    }
}

@Composable
private fun ProBlock() {
    Box(
        Modifier.fillMaxWidth().padding(top = 4.dp).clip(RoundedCornerShape(14.dp)).background(EMic.successSoft).border(1.dp, EMic.successBorder, RoundedCornerShape(14.dp)).padding(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            Column(Modifier.weight(1f)) {
                Text("Pro — Lifetime", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, color = EMic.text)
                Text("Activated on this device", fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint)
            }
            Badge("ACTIVE")
        }
    }
    Spacer(Modifier.height(14.dp))
    listOf(
        "Unlimited dictation, forever",
        "Auto-punctuation & cleanup",
        "Fully offline & private",
        "Free updates for life",
    ).forEach { FeatureRow(it) }
}

@Composable
private fun BuyBlock(onActivate: (String) -> Unit) {
    var code by remember { mutableStateOf("") }
    var err by remember { mutableStateOf(false) }

    // Price card
    Box(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(EMic.surface2).border(1.dp, EMic.border, RoundedCornerShape(16.dp)).padding(18.dp)
    ) {
        Column {
            Text("E Mic Pro — Lifetime license", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = EMic.textMuted)
            Row(verticalAlignment = Alignment.Bottom) {
                Text("19,000", fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 40.sp, color = EMic.text)
                Text(" IQD", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = EMic.textMuted, modifier = Modifier.padding(bottom = 6.dp))
            }
            Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Filled.Check, null, tint = EMic.success, modifier = Modifier.size(13.dp))
                Text("One-time payment · free updates", fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textFaint)
            }
            Spacer(Modifier.height(14.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(EMic.border))
            Spacer(Modifier.height(14.dp))
            listOf("Unlimited dictation, no time limit", "Auto-punctuation & cleanup", "Fully offline & private").forEach { FeatureRow(it) }
        }
    }

    Spacer(Modifier.height(14.dp))
    Text("PAY WITH FIB", fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 10.5.sp, letterSpacing = 1.sp, color = EMic.textFaint)
    Spacer(Modifier.height(7.dp))

    // FIB row
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(EMic.surface2).border(1.dp, EMic.border, RoundedCornerShape(13.dp)).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(9.dp)).background(Color.White).border(1.dp, EMic.border, RoundedCornerShape(9.dp)).padding(5.dp)) {
            Image(painterResource(R.drawable.fib_logo), "FIB")
        }
        Column(Modifier.weight(1f)) {
            Text("First Iraqi Bank", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = EMic.text)
            Text("Send the payment to this number", fontFamily = Sans, fontSize = 11.sp, color = EMic.textFaint)
        }
        Text("7510593659", fontFamily = Mono, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = EMic.text)
    }

    Spacer(Modifier.height(10.dp))
    Step(1, "Pay 19,000 IQD with FIB", "Open your FIB app, choose Send money, and transfer to 7510593659.")
    Step(2, "Get your activation code", "Right after payment, your code is sent back to your FIB account.")
    CodeShot()
    Step(3, "Enter the code below", "Paste it here and tap Activate — unlocked for life.")

    Spacer(Modifier.height(10.dp))
    // Code input. The text field fills the whole box and a focus requester lets
    // a tap anywhere (or on the box border) focus it and pop the keyboard — fixes
    // the old "only the left edge is tappable when empty" problem.
    val focus = remember { androidx.compose.ui.focus.FocusRequester() }
    BasicTextField(
        value = code,
        onValueChange = { code = it.filter(Char::isDigit).take(6); err = false },
        singleLine = true,
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
        textStyle = TextStyle(fontFamily = Mono, fontSize = 16.sp, letterSpacing = 4.sp, color = EMic.text),
        cursorBrush = androidx.compose.ui.graphics.SolidColor(EMic.primary),
        modifier = Modifier.fillMaxWidth().focusRequester(focus),
        decorationBox = { inner ->
            Box(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(11.dp)).background(EMic.surface)
                    .border(1.5.dp, if (err) EMic.danger else EMic.borderStrong, RoundedCornerShape(11.dp))
                    .clickable { focus.requestFocus() }
                    .padding(horizontal = 13.dp, vertical = 14.dp),
            ) {
                if (code.isEmpty()) Text("6-digit code (e.g. 123456)", fontFamily = Sans, fontSize = 14.sp, color = EMic.textFaint)
                inner()
            }
        },
    )

    Spacer(Modifier.height(10.dp))
    // Activate button
    Box(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(EMic.primary).clickable {
            if (License.isValidKey(code)) onActivate(code) else err = true
        }.padding(13.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Outlined.VpnKey, null, tint = Color.White, modifier = Modifier.size(17.dp))
            Text("Activate", fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color.White)
        }
    }
    Spacer(Modifier.height(10.dp))
    Text(
        if (err) "That code doesn't look right — check your FIB transaction." else "Enter the code from your FIB transaction note.",
        fontFamily = Sans, fontSize = 11.5.sp, color = if (err) EMic.danger else EMic.textFaint,
        textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun FeatureRow(text: String) {
    Row(Modifier.padding(vertical = 4.5.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.size(18.dp).clip(CircleShape).background(EMic.successSoft), contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Check, null, tint = EMic.success, modifier = Modifier.size(11.dp))
        }
        Text(text, fontFamily = Sans, fontSize = 13.sp, color = EMic.textMuted)
    }
}

@Composable
private fun CodeShot() {
    // Indent under step 2 (24dp marker + 11dp gap), mirroring the prototype's
    // .code-shot nested inside the step.
    Column(
        Modifier.fillMaxWidth().padding(start = 35.dp, top = 2.dp, bottom = 6.dp)
            .clip(RoundedCornerShape(11.dp)).background(EMic.surface).border(1.dp, EMic.border, RoundedCornerShape(11.dp))
    ) {
        Image(
            painterResource(R.drawable.fib_transaction),
            "FIB transaction showing Your Code Activation",
            modifier = Modifier.fillMaxWidth(),
            contentScale = androidx.compose.ui.layout.ContentScale.FillWidth,
        )
        Box(Modifier.fillMaxWidth().background(EMic.surface2).padding(horizontal = 11.dp, vertical = 9.dp)) {
            Text(
                buildAnnotatedString {
                    append("Open the transaction in FIB and tap the red ")
                    withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = EMic.text)) { append("“Your Code Activation”") }
                    append(".")
                },
                fontFamily = Sans, fontSize = 11.5.sp, color = EMic.textMuted, lineHeight = 17.sp,
            )
        }
    }
}

@Composable
private fun Step(n: Int, title: String, body: String) {
    Row(Modifier.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
        Box(Modifier.size(24.dp).clip(CircleShape).background(EMic.primarySoft), contentAlignment = Alignment.Center) {
            Text("$n", fontFamily = Mono, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = EMic.primaryStrong)
        }
        Column {
            Text(title, fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = EMic.text)
            Text(body, fontFamily = Sans, fontSize = 12.sp, color = EMic.textMuted)
        }
    }
}
