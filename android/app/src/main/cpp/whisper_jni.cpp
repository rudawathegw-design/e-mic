// JNI bridge between WhisperBridge.kt and whisper.cpp.
// Builds only when cpp/whisper (the whisper.cpp tree) is present.
#include <jni.h>
#include <string>
#include <vector>
#include <android/log.h>
#include "whisper.h"

#define LOG(...) __android_log_print(ANDROID_LOG_INFO, "emic-whisper", __VA_ARGS__)

extern "C"
JNIEXPORT jlong JNICALL
Java_iq_fib_eamic_stt_WhisperBridge_nativeInit(JNIEnv *env, jobject, jstring modelPath) {
    const char *path = env->GetStringUTFChars(modelPath, nullptr);
    whisper_context_params cparams = whisper_context_default_params();
    cparams.use_gpu = false;
    whisper_context *ctx = whisper_init_from_file_with_params(path, cparams);
    env->ReleaseStringUTFChars(modelPath, path);
    if (!ctx) { LOG("failed to load model"); return 0; }
    return reinterpret_cast<jlong>(ctx);
}

extern "C"
JNIEXPORT jstring JNICALL
Java_iq_fib_eamic_stt_WhisperBridge_nativeTranscribe(JNIEnv *env, jobject, jlong ctxPtr, jfloatArray samples) {
    auto *ctx = reinterpret_cast<whisper_context *>(ctxPtr);
    if (!ctx) return env->NewStringUTF("");

    jsize n = env->GetArrayLength(samples);
    std::vector<float> pcm(n);
    env->GetFloatArrayRegion(samples, 0, n, pcm.data());

    whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.print_progress = false;
    params.print_realtime = false;
    params.translate = false;
    params.language = "en";
    params.n_threads = 4;

    if (whisper_full(ctx, params, pcm.data(), (int) pcm.size()) != 0) {
        return env->NewStringUTF("");
    }

    std::string out;
    int segments = whisper_full_n_segments(ctx);
    for (int i = 0; i < segments; i++) out += whisper_full_get_segment_text(ctx, i);
    return env->NewStringUTF(out.c_str());
}

extern "C"
JNIEXPORT void JNICALL
Java_iq_fib_eamic_stt_WhisperBridge_nativeFree(JNIEnv *, jobject, jlong ctxPtr) {
    auto *ctx = reinterpret_cast<whisper_context *>(ctxPtr);
    if (ctx) whisper_free(ctx);
}
