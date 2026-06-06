// recorder.js — captures the microphone as mono 16 kHz Float32 PCM (what Whisper
// expects). The mic stream is opened ONCE up front and kept alive, so pressing
// the hotkey starts capturing instantly (no getUserMedia latency that would clip
// the first word and yield "[BLANK_AUDIO]"). Exposed on window.EARecorder.
(function () {
  const TARGET_RATE = 16000;
  let ctx = null, stream = null, source = null, node = null;
  let chunks = [];
  let recording = false;
  let ready = null;

  async function ensure() {
    if (ready) return ready;
    ready = (async () => {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: TARGET_RATE });
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      source = ctx.createMediaStreamSource(stream);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        if (!recording) return;
        chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(ctx.destination); // required for the processor to fire
    })();
    return ready;
  }

  async function start() {
    await ensure();
    if (ctx.state === "suspended") await ctx.resume();
    chunks = [];
    recording = true;
  }

  // returns { audio: Float32Array, peak: number } of everything captured
  function stop() {
    recording = false;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Float32Array(total);
    let off = 0, peak = 0;
    for (const c of chunks) {
      out.set(c, off); off += c.length;
      for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > peak) peak = a; }
    }
    chunks = [];
    return { audio: out, peak };
  }

  // open the mic as soon as the app loads so the first hold is instant
  ensure().catch((e) => console.warn("mic prime failed (will retry on first use):", e?.message));

  window.EARecorder = { start, stop, ensure };
})();
