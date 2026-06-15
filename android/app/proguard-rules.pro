# whisper.cpp JNI bridge: the native library resolves these by their fully
# qualified Java name (Java_iq_fib_eamic_stt_WhisperBridge_native*). R8 must
# NOT rename the class or its native methods, or the lookup fails at runtime.
-keepclasseswithmembernames,includedescriptorclasses class iq.fib.eamic.stt.WhisperBridge {
    native <methods>;
}
-keep class iq.fib.eamic.stt.WhisperBridge { *; }

# Keep any class that declares native methods (defensive).
-keepclasseswithmembernames class * {
    native <methods>;
}

# Compose tooling/runtime is handled by the AGP-bundled rules; nothing extra
# needed for Material3 / Navigation. DataStore + kotlinx-coroutines ship their
# own consumer rules.
