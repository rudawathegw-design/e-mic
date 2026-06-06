package iq.fib.eamic.accessibility

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Lets E Mic type dictated text into the focused input field of whatever app is
 * in front (the prototype's "Insert into message"). The user enables it once in
 * Settings → Accessibility. We never read screen content — we only write into
 * the currently focused editable node on demand.
 */
class InsertAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) { /* write-only */ }
    override fun onInterrupt() {}

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    private fun setFocusedText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val node = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return false
        // Append to any existing text, like a keyboard would.
        val existing = node.text?.toString() ?: ""
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, existing + text)
        }
        return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    companion object {
        @Volatile private var instance: InsertAccessibilityService? = null

        val isEnabled: Boolean get() = instance != null

        /** Returns true if the text was inserted into a focused field. */
        fun insertText(text: String): Boolean = instance?.setFocusedText(text) ?: false
    }
}
