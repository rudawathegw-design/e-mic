package iq.fib.eamic.overlay

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator
import kotlin.math.sin

/**
 * Animated equaliser of vertical rounded bars — the website/prototype "wave"
 * mark. Used as the floating-bubble icon and inside the listening panel.
 */
class WaveformView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyle: Int = 0,
) : View(context, attrs, defStyle) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFD97757.toInt() }
    private val rect = RectF()

    var barCount = 5
        set(v) { field = v; invalidate() }
    var barColor: Int
        get() = paint.color
        set(v) { paint.color = v; invalidate() }
    private val density = resources.displayMetrics.density
    var barWidthDp = 3f
    var gapDp = 2.5f
    /** 0..1 minimum height fraction of the available height. */
    var minFraction = 0.25f

    private var phase = 0f
    private val animator = ValueAnimator.ofFloat(0f, (2 * Math.PI).toFloat()).apply {
        duration = 1100
        repeatCount = ValueAnimator.INFINITE
        interpolator = LinearInterpolator()
        addUpdateListener { phase = it.animatedValue as Float; invalidate() }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!animator.isStarted) animator.start()
    }

    override fun onDetachedFromWindow() {
        animator.cancel()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val bw = barWidthDp * density
        val gap = gapDp * density
        val totalW = barCount * bw + (barCount - 1) * gap
        var x = (width - totalW) / 2f
        val cy = height / 2f
        val maxH = height.toFloat()
        val radius = bw / 2f
        for (i in 0 until barCount) {
            // Each bar offset in phase so the wave travels across the bars.
            val s = (sin(phase + i * 0.9f) + 1f) / 2f          // 0..1
            val frac = minFraction + (1f - minFraction) * s
            val h = maxH * frac
            rect.set(x, cy - h / 2f, x + bw, cy + h / 2f)
            canvas.drawRoundRect(rect, radius, radius, paint)
            x += bw + gap
        }
    }

    companion object {
        const val PRIMARY = 0xFFD97757.toInt()
        @Suppress("unused") val WHITE = Color.WHITE
    }
}
