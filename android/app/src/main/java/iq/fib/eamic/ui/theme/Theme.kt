package iq.fib.eamic.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush

private val ColorScheme = lightColorScheme(
    primary = EMic.primary,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    background = EMic.bg,
    onBackground = EMic.text,
    surface = EMic.surface,
    onSurface = EMic.text,
    error = EMic.danger,
)

/** The warm radial+linear app backdrop from the prototype's body background. */
fun appBackdrop(): Brush = Brush.linearGradient(
    colors = listOf(EMic.gradStart, EMic.gradEnd),
    start = Offset(0f, 0f),
    end = Offset(900f, 1600f),
)

@Composable
fun EMicTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ColorScheme,
        typography = AppTypography,
        content = content,
    )
}
