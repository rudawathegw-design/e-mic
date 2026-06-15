// Stub built when cpp/whisper (whisper.cpp) is absent, so the app still
// compiles and links. nativeInit returns 0 → WhisperBridge reports the engine
// as unavailable and the UI shows a "add whisper.cpp" hint.
#include <jni.h>

extern "C"
JNIEXPORT jlong JNICALL
Java_iq_fib_eamic_stt_WhisperBridge_nativeInit(JNIEnv *, jobject, jstring) { return 0; }

extern "C"
JNIEXPORT jstring JNICALL
Java_iq_fib_eamic_stt_WhisperBridge_nativeTranscribe(JNIEnv *env, jobject, jlong, jfloatArray) {
    return env->NewStringUTF("");
}

extern "C"
JNIEXPORT void JNICALL
Java_iq_fib_eamic_stt_WhisperBridge_nativeFree(JNIEnv *, jobject, jlong) {}
