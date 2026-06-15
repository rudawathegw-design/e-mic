cmake_minimum_required(VERSION 3.22.1)
project(emic-whisper)

set(CMAKE_CXX_STANDARD 17)

# whisper.cpp is vendored under cpp/whisper (a git submodule or copied tree).
# Clone with:  git submodule add https://github.com/ggerganov/whisper.cpp \
#                  android/app/src/main/cpp/whisper
# If the folder is missing, the JNI bridge still builds but does nothing useful;
# WhisperBridge.nativeAvailable will be false at runtime.
set(WHISPER_DIR ${CMAKE_CURRENT_SOURCE_DIR}/whisper)

if (EXISTS ${WHISPER_DIR}/CMakeLists.txt)
    # Build whisper + ggml as static libs (no examples/tests).
    set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    add_subdirectory(${WHISPER_DIR} ${CMAKE_CURRENT_BINARY_DIR}/whisper EXCLUDE_FROM_ALL)
    add_library(emic-whisper SHARED whisper_jni.cpp)
    target_include_directories(emic-whisper PRIVATE ${WHISPER_DIR} ${WHISPER_DIR}/include ${WHISPER_DIR}/ggml/include)
    target_link_libraries(emic-whisper whisper android log)
else()
    message(WARNING "whisper.cpp not found at ${WHISPER_DIR} — building a stub library.")
    add_library(emic-whisper SHARED whisper_jni_stub.cpp)
    target_link_libraries(emic-whisper android log)
endif()
