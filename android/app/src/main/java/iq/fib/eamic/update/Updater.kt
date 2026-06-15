package iq.fib.eamic.update

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Uri
import androidx.core.content.FileProvider
import iq.fib.eamic.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Free, store-less self-updater. Checks the project's GitHub Releases for a
 * newer build, downloads the APK, and hands it to the system installer.
 *
 * Release convention (set these when you publish a release on GitHub):
 *   - Attach the signed APK as a release asset (any *.apk name).
 *   - Put the new version code in the release body as:  versionCode=N
 *   - Optionally force everyone below a floor with:      min=N
 *     (when the installed versionCode < min, the update is mandatory).
 *
 * No server, no Play Console, no extra dependencies — just HttpURLConnection
 * against api.github.com (which is free and unauthenticated for public repos).
 */
object Updater {

    private const val OWNER = "rudawathegw-design"
    // Android releases live in their own repo so they don't collide with the
    // desktop app's electron-updater "latest release" lookup in the main repo.
    private const val REPO = "e-mic-android"
    private const val LATEST = "https://api.github.com/repos/$OWNER/$REPO/releases/latest"

    data class Release(
        val versionCode: Int,
        val versionName: String,
        val apkUrl: String,
        val notes: String,
        val minCode: Int,
    ) {
        val isNewer: Boolean get() = versionCode > BuildConfig.VERSION_CODE
        /** True when the running build is below the mandatory floor. */
        val isMandatory: Boolean get() = BuildConfig.VERSION_CODE < minCode
    }

    fun hasInternet(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /** Returns the latest release if it is newer than this build, else null. */
    suspend fun check(context: Context): Release? = withContext(Dispatchers.IO) {
        if (!hasInternet(context)) return@withContext null
        runCatching {
            val json = httpGet(LATEST) ?: return@runCatching null
            val o = JSONObject(json)
            val body = o.optString("body", "")
            val tag = o.optString("tag_name", "")
            val apk = firstApkUrl(o) ?: return@runCatching null
            val code = parseInt(body, "versionCode") ?: return@runCatching null
            val min = parseInt(body, "min") ?: 0
            Release(
                versionCode = code,
                versionName = o.optString("name", tag).ifBlank { tag },
                apkUrl = apk,
                notes = body,
                minCode = min,
            )
        }.getOrNull()?.takeIf { it.isNewer }
    }

    /**
     * Downloads the APK to external cache and launches the system installer.
     * [onProgress] reports 0..100 (or -1 when the total size is unknown).
     * Returns false if the download failed.
     */
    suspend fun downloadAndInstall(
        context: Context,
        release: Release,
        onProgress: (Int) -> Unit = {},
    ): Boolean = withContext(Dispatchers.IO) {
        val dir = File(context.externalCacheDir, "updates").apply { mkdirs() }
        val apk = File(dir, "e-mic-${release.versionCode}.apk")
        val ok = runCatching {
            val conn = (URL(release.apkUrl).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = true
                connectTimeout = 20_000
                readTimeout = 60_000
            }
            conn.inputStream.use { input ->
                val total = conn.contentLength
                apk.outputStream().use { out ->
                    val buf = ByteArray(64 * 1024)
                    var read: Int
                    var done = 0L
                    while (input.read(buf).also { read = it } >= 0) {
                        out.write(buf, 0, read)
                        done += read
                        onProgress(if (total > 0) ((done * 100) / total).toInt() else -1)
                    }
                }
            }
            true
        }.getOrDefault(false)
        if (!ok || !apk.exists()) return@withContext false

        withContext(Dispatchers.Main) { launchInstaller(context, apk) }
        true
    }

    private fun launchInstaller(context: Context, apk: File) {
        val uri: Uri = FileProvider.getUriForFile(
            context, "${context.packageName}.fileprovider", apk,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        runCatching { context.startActivity(intent) }
    }

    // ---- helpers ---------------------------------------------------------

    private fun firstApkUrl(release: JSONObject): String? {
        val assets = release.optJSONArray("assets") ?: return null
        for (i in 0 until assets.length()) {
            val a = assets.getJSONObject(i)
            if (a.optString("name").endsWith(".apk", ignoreCase = true)) {
                return a.optString("browser_download_url").takeIf { it.isNotBlank() }
            }
        }
        return null
    }

    /** Finds `key=123` (or `key: 123`) anywhere in the release notes. */
    private fun parseInt(text: String, key: String): Int? =
        Regex("$key\\s*[:=]\\s*(\\d+)", RegexOption.IGNORE_CASE)
            .find(text)?.groupValues?.get(1)?.toIntOrNull()

    private fun httpGet(url: String): String? {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("Accept", "application/vnd.github+json")
            setRequestProperty("User-Agent", "e-mic-updater")
            connectTimeout = 15_000
            readTimeout = 20_000
        }
        return conn.inputStream.use { it.bufferedReader().readText() }
            .takeIf { conn.responseCode in 200..299 }
    }
}
