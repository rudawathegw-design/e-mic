package iq.fib.eamic.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Palette copied verbatim from the design prototype's CSS :root tokens
 * (E Mic Android.html). Keep names aligned with the CSS so the mapping is
 * obvious when comparing against the handoff.
 */
object EMic {
    val bg = Color(0xFFFAF9F5)
    val surface = Color(0xFFFFFFFF)
    val surface2 = Color(0xFFF6F1E9)
    val surface3 = Color(0xFFEFE8DC)

    val border = Color(0xFFE7DFD2)
    val borderStrong = Color(0xFFD8CDB9)

    val text = Color(0xFF2B2620)
    val textMuted = Color(0xFF6E6457)
    val textFaint = Color(0xFF9C9285)

    val primary = Color(0xFFD97757)
    val primaryStrong = Color(0xFFC2603E)
    val primarySoft = Color(0xFFFAEDE6)
    val primaryBorder = Color(0xFFEBC3B2)

    val success = Color(0xFF5B8A72)
    val successSoft = Color(0xFFE9F0EA)
    val successBorder = Color(0xFFBFD6C7)

    val danger = Color(0xFFBC5247)
    val dangerSoft = Color(0xFFF8ECEA)

    // App background gradient stops (radial + linear blend in the prototype).
    val gradTop = Color(0xFFF1EADD)
    val gradBottom = Color(0xFFE6DAC8)
    val gradStart = Color(0xFFEBE3D6)
    val gradEnd = Color(0xFFE0D5C4)
}
