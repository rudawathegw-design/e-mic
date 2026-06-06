package iq.fib.eamic.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import iq.fib.eamic.R

private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

private fun family(name: String, vararg weights: FontWeight, italic: Boolean = false) =
    FontFamily(
        weights.flatMap { w ->
            buildList {
                add(Font(GoogleFont(name), provider, w))
                if (italic) add(Font(GoogleFont(name), provider, w, FontStyle.Italic))
            }
        }
    )

/** 'Hanken Grotesk' — the prototype's --sans (UI text). */
val Sans = family("Hanken Grotesk", FontWeight.Normal, FontWeight.Medium, FontWeight.SemiBold, FontWeight.Bold)

/** 'Newsreader' — the prototype's --serif (greetings, headings, big numbers). */
val Serif = family("Newsreader", FontWeight.Normal, FontWeight.Medium, FontWeight.SemiBold, italic = true)

/** 'JetBrains Mono' — the prototype's --mono (stat labels, timestamps, codes). */
val Mono = family("JetBrains Mono", FontWeight.Normal, FontWeight.Medium, FontWeight.SemiBold)

val AppTypography = Typography(
    bodyLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Normal, fontSize = 14.5.sp),
    bodyMedium = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Normal, fontSize = 13.5.sp),
    labelLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 15.sp),
    titleLarge = TextStyle(fontFamily = Serif, fontWeight = FontWeight.Medium, fontSize = 24.sp),
)
