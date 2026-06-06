// transcribe.js — local Whisper (English-only) via @huggingface/transformers
// (onnxruntime-node). English-only checkpoints are faster and more accurate for
// English than the multilingual ones. Fully offline after the first download.
import { app } from "electron";
import path from "node:path";

let transcriberPromise = null;

const MODEL_FOR = {
  "Base — fast (English)": "Xenova/whisper-base.en",
  "Small — balanced (English)": "Xenova/whisper-small.en",
  "Medium — accurate (English)": "Xenova/whisper-medium.en",
};
const DEFAULT_MODEL = "Xenova/whisper-base.en";

async function getTranscriber(modelName) {
  if (transcriberPromise) return transcriberPromise;
  transcriberPromise = (async () => {
    const tf = await import("@huggingface/transformers");
    tf.env.cacheDir = path.join(app.getPath("userData"), "models");
    tf.env.allowLocalModels = false;
    const model = MODEL_FOR[modelName] || DEFAULT_MODEL;
    return tf.pipeline("automatic-speech-recognition", model, { dtype: "q8" });
  })();
  return transcriberPromise;
}

export function resetModel() {
  transcriberPromise = null;
}

/**
 * @param {Float32Array} audio  mono PCM at 16 kHz
 * @param {string} modelName
 * @returns {Promise<{text:string}>}
 */
export async function transcribe(audio, modelName) {
  const asr = await getTranscriber(modelName);
  // English-only models must NOT receive a `language`/`task` argument.
  const out = await asr(audio, { chunk_length_s: 30, stride_length_s: 5 });
  return { text: (out?.text || "").trim() };
}
