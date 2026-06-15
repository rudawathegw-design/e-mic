package iq.fib.eamic

import android.app.Application
import iq.fib.eamic.data.Repository

class EaMicApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Warm the repository (loads persisted settings/history) on launch.
        Repository.get(this)
    }
}
