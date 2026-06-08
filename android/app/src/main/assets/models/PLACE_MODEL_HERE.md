# Speech model goes here

Drop a whisper.cpp GGML model named **`ggml-model.bin`** in this folder
(English-only, matches the desktop default). The app copies it to internal
storage on first run — see `stt/WhisperBridge.kt`.

Recommended: `ggml-model.bin` (q5_1, ~57 MB) from the whisper.cpp model list:
https://huggingface.co/ggerganov/whisper.cpp/tree/main

To change the filename, update `modelAsset` in `WhisperBridge.ensureLoaded`.
This `.md` file is just a placeholder so the folder exists; the `.bin` is
gitignored (too large to commit).
