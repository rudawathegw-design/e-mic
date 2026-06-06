package iq.fib.eamic.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import iq.fib.eamic.ui.theme.EMic

/** The 5-bar equaliser brandmark — the logo glyph from the prototype. */
@Composable
fun Brandmark(modifier: Modifier = Modifier, color: Color = EMic.primary) {
    val heights = listOf(6, 14, 9, 17, 7)
    Row(
        modifier = modifier.height(18.dp),
        horizontalArrangement = Arrangement.spacedBy(2.5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        heights.forEach { h ->
            androidx.compose.foundation.layout.Box(
                Modifier
                    .width(3.dp)
                    .height(h.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(color)
            )
        }
    }
}

/** Animated equaliser used inside the floating bubble and the listening sheet. */
@Composable
fun LiveWave(
    barCount: Int = 5,
    color: Color = EMic.primary,
    barWidth: Int = 3,
    maxHeight: Int = 22,
    modifier: Modifier = Modifier,
) {
    val transition = rememberInfiniteTransition(label = "wave")
    Row(
        modifier = modifier.height(maxHeight.dp),
        horizontalArrangement = Arrangement.spacedBy(2.5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        repeat(barCount) { i ->
            val scale by transition.animateFloat(
                initialValue = 0.5f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 700 + (i % 5) * 120, delayMillis = 0),
                    repeatMode = RepeatMode.Reverse,
                ),
                label = "bar$i",
            )
            androidx.compose.foundation.layout.Box(
                Modifier
                    .width(barWidth.dp)
                    .height(maxHeight.dp)
                    .graphicsLayer { scaleY = scale }
                    .clip(RoundedCornerShape(3.dp))
                    .background(color)
            )
        }
    }
}
