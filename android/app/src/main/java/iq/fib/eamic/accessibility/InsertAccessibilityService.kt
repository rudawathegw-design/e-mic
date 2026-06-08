package iq.fib.eamic.accessibility

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Lets E Mic type dictated text into the focused input field of whatever app is
 * in front (the "Insert" action). The user enables it once in Settings →
 * Accessibility. We never read screen content beyond locating the focused
 * editable field on demand, and only write when the user taps Insert.
 */
class InsertAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() { instance = this }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) { /* write-only */ }
    override fun onInterrupt() {}

    override fun onDestroy() {
        if (instance === this) instance = null
        super.onDestroy()
    }

    private fun setFocusedText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val node = findEditableFocus(root) ?: return false

        // 1) Append via SET_TEXT (preserves what's already typed).
        val existing = node.text?.toString() ?: ""
        val args = Bundle().apply {
            putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                if (existing.isEmpty()) text else "$existing $text",
            )
        }
        if (node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return true

        // 2) Fallback: put it on the clipboard and PASTE into the field.
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("E Mic", text))
        node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        return node.performAction(AccessibilityNodeInfo.ACTION_PASTE)
    }

    /** The input-focused node if editable, else a depth-first editable node. */
    private fun findEditableFocus(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.let { if (it.isEditable) return it }
        return firstEditable(root)
    }

    private fun firstEditable(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isEditable && node.isVisibleToUser) return node
        for (i in 0 until node.childCount) {
            firstEditable(node.getChild(i))?.let { return it }
        }
        return null
    }

    companion object {
        @Volatile private var instance: InsertAccessibilityService? = null

        /** True when the service is connected (i.e. enabled in Accessibility). */
        val isEnabled: Boolean get() = instance != null

        /** Returns true if the text was inserted into a focused field. */
        fun insertText(text: String): Boolean = instance?.setFocusedText(text) ?: false
    }
}
