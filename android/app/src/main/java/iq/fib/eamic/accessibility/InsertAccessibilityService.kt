package iq.fib.eamic.accessibility

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
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

        // Always stage on the clipboard first — needed for PASTE, and a safety
        // net if every programmatic route fails (the user can paste manually).
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("E Mic", text))

        // 1) Preferred: SET_TEXT on the focused editable field, appending to any
        //    real text. Ignore the field's placeholder/hint (e.g. WhatsApp's
        //    "Message") — some apps report it via text, others via hintText.
        val editable = findEditableFocus(root)
        if (editable != null) {
            val hint = if (Build.VERSION.SDK_INT >= 26) editable.hintText?.toString() else null
            val desc = editable.contentDescription?.toString()
            val current = editable.text?.toString() ?: ""
            val showingHint =
                (Build.VERSION.SDK_INT >= 26 && editable.isShowingHintText) ||
                    (hint != null && current == hint) ||
                    (desc != null && current == desc) ||
                    // Some apps (WhatsApp) draw the placeholder as real text with
                    // no hint API. Strip a known short placeholder when the field
                    // has no selection set (i.e. the user hasn't typed/caret-placed).
                    (current.isNotEmpty() &&
                        editable.textSelectionStart < 0 &&
                        KNOWN_PLACEHOLDERS.any { current.equals(it, ignoreCase = true) })
            val existing = if (showingHint) "" else current
            val args = Bundle().apply {
                putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    if (existing.isEmpty()) text else "$existing $text",
                )
            }
            if (editable.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return true
            editable.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            if (editable.performAction(AccessibilityNodeInfo.ACTION_PASTE)) return true
        }

        // 2) Force-paste: some apps (Outlook, web views) don't expose an
        //    editable node, but the focused node — or an ancestor — still
        //    accepts PASTE. Walk up a few levels trying each.
        var node = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: root.findFocus(AccessibilityNodeInfo.FOCUS_ACCESSIBILITY)
            // Web views (Outlook) often expose no focus at all — fall back to the
            // first paste-capable node anywhere in the tree.
            ?: firstPasteable(root)
        var hops = 0
        while (node != null && hops < 6) {
            // Click to (re)focus the field, then try to paste — covers fields
            // that lost focus to our overlay.
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            if (node.performAction(AccessibilityNodeInfo.ACTION_PASTE)) return true
            node = node.parent
            hops++
        }
        return false
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

    /** First visible node that advertises the PASTE action (web views etc.). */
    private fun firstPasteable(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isVisibleToUser &&
            node.actionList.any { it.id == AccessibilityNodeInfo.ACTION_PASTE }
        ) return node
        for (i in 0 until node.childCount) {
            firstPasteable(node.getChild(i))?.let { return it }
        }
        return null
    }

    companion object {
        @Volatile private var instance: InsertAccessibilityService? = null

        /** Placeholder strings some apps expose as real text (no hint API). */
        private val KNOWN_PLACEHOLDERS = listOf(
            "Message", "Type a message", "Message…", "Write a message",
            "Aa", "Send a message", "Type a message…",
        )

        /** True when the service is connected (i.e. enabled in Accessibility). */
        val isEnabled: Boolean get() = instance != null

        /** Returns true if the text was inserted into a focused field. */
        fun insertText(text: String): Boolean = instance?.setFocusedText(text) ?: false
    }
}
