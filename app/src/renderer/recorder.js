// recorder.js — captures the microphone as mono 16 kHz Float32 PCM (what Whisper
// expects). The mic stream is opened ONCE up front and kept alive, so pressing
// the hotkey starts capturing instantly (no getUserMedia latency that would clip
// the first word and yield "[BLANK_AUDIO]"). Exposed on window.EARecorder.
//
// The user can pick which input device to record from (Settings → Microphone).
// When a headset is plugged in after launch, the cached stream stays bound to the
// old (now-dead) device — so we expose setDevice()/refresh() to tear the stream
// down and reopen it on the chosen mic, fixing "connected headphones, hears
// nothing". An empty deviceId means "follow the system default".
(function () {
  const TARGET_RATE = 16000;
  let ctx = null, stream = null, source = null, node = null;
  let chunks = [];
  let recording = false;
  let ready = null;
  let deviceId = "";   // "" = system default

  function constraints() {
    const audio = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    if (deviceId) audio.deviceId = { exact: deviceId };
    return { audio };
  }

  function teardown() {
    try { if (node) node.disconnect(); } catch {}
    try { if (source) source.disconnect(); } catch {}
    try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch {}
    node = source = stream = null;
    ready = null;
  }

  async function ensure() {
    if (ready) return ready;
    ready = (async () => {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: TARGET_RATE });
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints());
      } catch (e) {
        // the chosen device is gone (e.g. headset unplugged) — fall back to default
        if (deviceId) { deviceId = ""; stream = await navigator.mediaDevices.getUserMedia(constraints()); }
        else throw e;
      }
      source = ctx.createMediaStreamSource(stream);
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        if (!recording) return;
        chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(ctx.destination); // required for the processor to fire
    })();
    // never cache a failed open — otherwise every later start() returns the same
    // rejected promise and recording stays dead even once the mic comes back
    ready.catch(() => { ready = null; });
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

  // List available input mics. Labels are only populated after mic permission has
  // been granted (which ensure() does), so we prime first.
  async function listDevices() {
    try { await ensure(); } catch {}
    const all = await navigator.mediaDevices.enumerateDevices();
    return all
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({ id: d.deviceId, label: d.label || "Microphone" }));
  }

  // Switch to a specific device ("" = system default) and reopen the stream.
  async function setDevice(id) {
    if (recording) stop();
    deviceId = id || "";
    teardown();
    await ensure();
  }

  // Re-scan after plugging in / unplugging a headset: reopen the stream on the
  // currently-selected device so capture binds to live hardware again.
  async function refresh() {
    if (recording) stop();
    teardown();
    await ensure();
    return listDevices();
  }

  // open the mic as soon as the app loads so the first hold is instant
  ensure().catch((e) => console.warn("mic prime failed (will retry on first use):", e?.message));

  window.EARecorder = { start, stop, ensure, listDevices, setDevice, refresh, getDevice: () => deviceId };
})();
