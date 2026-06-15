// app.jsx — E Mic dashboard. Dictation itself happens in the system-wide
// overlay window; here we mirror its state in the pill and keep history/stats.
const { useState, useEffect, useRef, useCallback } = React;

const ACCENTS = {
  coral: { p: "#D97757", s: "#C2603E", soft: "#FAEDE6", border: "#EBC3B2" },
  green: { p: "#5B8A72", s: "#487058", soft: "#E9F0EA", border: "#BFD6C7" },
};

const TWEAK_DEFAULTS = { "accent": "#D97757", "pillStyle": "light", "greeting": "serif", "corners": "soft" };

const wc = (s) => s.trim().split(/\s+/).filter(Boolean).length;

// turn a Windows login name ("RudawAbdulrahman", "rudaw.a") into something human
function identity(user) {
  const pretty = String(user || "there")
    .replace(/[._\-]+/g, " ")
    .replace(/([a-z؀-ۿ])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ").trim();
  const words = pretty.split(" ").filter(Boolean);
  const firstName = words[0] || pretty;
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : pretty.slice(0, 2)).toUpperCase();
  return { firstName, fullName: pretty, initials };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState("home");
  const [transcripts, setTranscripts] = useState([]);
  const [dict, setDict] = useState([]);
  const [settings, setSettings] = useState({
    model: "Base — fast (English)",
    output: "Paste (recommended)", punctuation: true, grammar: true, improve: true, duck: "High (50%)",
    mic: "", aiPolish: false, deepseekKey: "", shortcut: ["Ctrl", "Win"], fixShortcut: ["Ctrl", "`"], startup: true,
  });
  const [scratch, setScratch] = useState("");
  const [scratchLang, setScratchLang] = useState("en");
  const [licensed, setLicensed] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(10);
  const [licenseFocus, setLicenseFocus] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState("there");
  const [apiCount, setApiCount] = useState(0);
  const goLicense = (focus) => { setLicenseFocus(focus); setScreen("license"); };
  // always show a freshly-opened page from the top (e.g. the payment steps)
  useEffect(() => { document.querySelector(".content")?.scrollTo(0, 0); }, [screen]);

  const [pill, setPill] = useState({ phase: "idle", text: "", lang: "en" });
  const [holding, setHolding] = useState(false);
  const capturingRef = useRef(false);   // true while Settings captures a shortcut
  const idleTimer = useRef(null);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ---- load persisted state ----
  useEffect(() => {
    if (!window.EA) { setLoaded(true); return; }
    window.EA.getState().then((s) => {
      setUser(s.user || "there");
      setApiCount(s.apiRequests || 0);
      setLicensed(s.licensed);
      setTrialDaysLeft(s.trialDaysLeft);
      if (s.settings) {
        setSettings(s.settings);
        // bind the recorder to the saved mic (no-op if it's the system default)
        if (s.settings.mic && window.EARecorder) window.EARecorder.setDevice(s.settings.mic).catch(() => {});
      }
      if (s.dictionary) setDict(s.dictionary);
      if (s.history) setTranscripts(s.history);
      setLoaded(true);
    });
  }, []);

  useEffect(() => { if (loaded && window.EA) window.EA.saveSettings(settings); }, [settings, loaded]);
  useEffect(() => { if (loaded && window.EA) window.EA.saveDictionary(dict); }, [dict, loaded]);
  useEffect(() => { if (loaded && window.EA) window.EA.saveHistory(transcripts); }, [transcripts, loaded]);

  // ---- this (focusable) window owns recording; the overlay is visual only ----
  useEffect(() => {
    if (!window.EA) return;
    window.EA.onPttStart(async () => {
      if (capturingRef.current) return;
      clearTimeout(idleTimer.current);
      setHolding(true);
      setPill({ phase: "listening", text: "", lang: "en" });
      try { await window.EARecorder.start(); }
      catch (e) { setHolding(false); setPill((p) => ({ ...p, phase: "idle" })); }
    });
    window.EA.onPttStop(async () => {
      if (capturingRef.current) return;
      setHolding(false);
      const { audio, peak } = window.EARecorder.stop();
      if (!audio || audio.length < 2000) {
        setPill((p) => ({ ...p, phase: "idle" }));
        window.EA.cancelDictation();
        return;
      }
      setPill((p) => ({ ...p, phase: "transcribing" }));
      let res;
      try { res = await window.EA.dictate(audio, peak); } catch (e) { res = { ok: false }; }
      if (!res || !res.ok) {
        if (res && res.reason === "trial-expired") goLicense(true);
        setPill((p) => ({ ...p, phase: "idle" }));
        return;
      }
      // NOTE: do NOT append to the scratchpad here — the OS paste already inserts
      // the text wherever the cursor is (including the scratchpad). Appending too
      // would duplicate it. We only record it in history.
      setTranscripts((arr) => [{ id: Date.now(), text: res.text, time: res.time, dateLabel: "Today", lang: "en" }, ...arr]);
      setPill({ phase: "done", text: res.text, lang: "en" });
      idleTimer.current = setTimeout(() => setPill((q) => ({ ...q, phase: "idle" })), 2000);
    });
    window.EA.onTrialExpired(() => goLicense(false));   // open payment page at the top (steps first)
    window.EA.onApiCount((n) => setApiCount(n));         // grammar-fix / dictation bumped the DeepSeek counter
  }, []);

  // the in-app "Hold to talk" button drives the same global path as Ctrl+Win.
  // pointerup AND pointerleave can both fire — dedupe so we don't start/stop twice.
  const pressedRef = useRef(false);
  const pttDown = useCallback(() => { if (pressedRef.current) return; pressedRef.current = true; window.EA && window.EA.pttStart(); }, []);
  const pttUp = useCallback(() => { if (!pressedRef.current) return; pressedRef.current = false; window.EA && window.EA.pttStop(); }, []);

  // ---- DOM fallback: when the E Mic window itself is focused, the OS-level
  // hook doesn't deliver the shortcut — but the window's own key events do. ----
  const domActiveRef = useRef(false);
  useEffect(() => {
    if (!window.EA) return;
    const parse = () => {
      const sc = settingsRef.current.shortcut || ["Ctrl", "Win"];
      const n = { ctrl: false, alt: false, shift: false, meta: false, main: null };
      for (const k of sc) {
        if (k === "Ctrl") n.ctrl = true; else if (k === "Alt") n.alt = true;
        else if (k === "Shift") n.shift = true; else if (k === "Win") n.meta = true;
        else n.main = k;
      }
      return n;
    };
    const held = (e) => {
      const n = parse();
      const modsOk = (!n.ctrl || e.ctrlKey) && (!n.alt || e.altKey) && (!n.shift || e.shiftKey) && (!n.meta || e.metaKey);
      const hasMod = n.ctrl || n.alt || n.shift || n.meta;
      const mainOk = !n.main ? true : (e.type === "keydown" && e.key && e.key.toUpperCase() === n.main.toUpperCase());
      return (hasMod || n.main) && modsOk && (n.main ? mainOk : true);
    };
    const onDown = (e) => {
      if (capturingRef.current || e.repeat) return;
      if (held(e) && !domActiveRef.current) { domActiveRef.current = true; window.EA.pttStart(); }
    };
    const onUp = (e) => {
      if (capturingRef.current) return;
      if (domActiveRef.current && !held(e)) { domActiveRef.current = false; window.EA.pttStop(); }
    };
    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
    return () => { window.removeEventListener("keydown", onDown, true); window.removeEventListener("keyup", onUp, true); };
  }, []);

  // ---- apply tweaks -> css vars ----
  useEffect(() => {
    const root = document.documentElement;
    const key = t.accent === ACCENTS.green.p ? "green" : "coral";
    const a = ACCENTS[key];
    root.style.setProperty("--accent", a.p);
    root.style.setProperty("--accent-strong", a.s);
    root.style.setProperty("--accent-soft", a.soft);
    root.style.setProperty("--accent-border", a.border);
    document.querySelector(".win")?.setAttribute("data-acc", key);
    document.querySelector(".win")?.setAttribute("data-greet", t.greeting);
    const r = t.corners === "sharp" ? ["3px", "5px", "7px", "9px"] : ["8px", "12px", "18px", "24px"];
    root.style.setProperty("--r-sm", r[0]); root.style.setProperty("--r-md", r[1]);
    root.style.setProperty("--r-lg", r[2]); root.style.setProperty("--r-xl", r[3]);
  }, [t.accent, t.corners, t.greeting]);

  const totalWords = transcripts.reduce((n, x) => n + wc(x.text), 0);
  const stats = { words: totalWords, dictations: transcripts.length, minutes: Math.round(totalWords / 40) };
  const me = identity(user);
  const active = licensed || trialDaysLeft > 0;

  const NAV = [
    ["home", "Home", IconHome],
    ["history", "History", IconHistory, transcripts.length],
    ["dictionary", "Dictionary", IconBook],
    ["settings", "Settings", IconGear],
    ["updates", "Updates", IconDownload],
  ];

  const accKey = t.accent === ACCENTS.green.p ? "green" : "coral";
  const win = (action) => () => window.EA && window.EA[action]();

  return (
    <div className="desktop">
      <div className="win" data-acc={accKey}>
        <div className="titlebar" style={{ WebkitAppRegion: "drag" }}>
          <div className="tb-brand">
            <span className="brandmark"><span></span><span></span><span></span><span></span></span>
            <span className="tb-name">E Mic</span>
            <span className="tb-sub">· English voice to text</span>
          </div>
          <div className="tb-spacer"></div>
          <div className="win-controls" style={{ WebkitAppRegion: "no-drag" }}>
            <button className="win-btn" title="Minimize" onClick={win("minimize")}><svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>
            <button className="win-btn" title="Maximize" onClick={win("maximize")}><svg viewBox="0 0 12 12" fill="none"><rect x="2.2" y="2.2" width="7.6" height="7.6" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg></button>
            <button className="win-btn close" title="Close" onClick={win("close")}><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>
          </div>
        </div>

        <div className="win-body">
          <aside className="sidebar">
            <div className="side-talk">
              <button
                className={"talk-btn" + (holding ? " holding" : "")}
                onPointerDown={(e) => { e.preventDefault(); pttDown(); }}
                onPointerUp={pttUp}
                onPointerLeave={pttUp}
              >
                <span className="mic-dot"></span>{holding ? "Listening…" : "Hold to talk"}
              </button>
              <div className="talk-hint">Hold {settings.shortcut.map((k, i) => <React.Fragment key={i}>{i ? "+" : ""}<span className="kbd">{k}</span></React.Fragment>)} anywhere,<br/>or press &amp; hold this button.</div>
            </div>
            <nav className="nav">
              <div className="nav-label">Workspace</div>
              {NAV.map(([id, label, Icon, badge]) => (
                <button key={id} className={"nav-item" + (screen === id ? " active" : "")} onClick={() => setScreen(id)}>
                  <span className="ico"><Icon /></span>{label}
                  {badge ? <span className="nav-badge">{badge}</span> : null}
                </button>
              ))}
            </nav>
            <div className="side-foot">
              <div className="avatar">{me.initials}</div>
              <div><div className="nm">{me.fullName}</div><div className="pl">{licensed ? "Licensed" : active ? "Trial plan" : "Trial ended"}</div></div>
            </div>
          </aside>

          <main className="content">
            {screen === "home" && <HomeScreen name={me.firstName} stats={stats} scratch={scratch} setScratch={setScratch} scratchLang={scratchLang} settings={settings} licensed={licensed} trialDaysLeft={trialDaysLeft} onBuy={() => goLicense(false)} onEnterKey={() => goLicense(true)} />}
            {screen === "history" && <HistoryScreen transcripts={transcripts} onDelete={(id) => setTranscripts((a) => a.filter((x) => x.id !== id))} onClear={() => setTranscripts([])} onCopy={(txt) => window.EA && window.EA.copy(txt)} />}
            {screen === "dictionary" && <DictionaryScreen words={dict} onAdd={(w) => setDict((a) => a.includes(w) ? a : [...a, w])} onRemove={(w) => setDict((a) => a.filter((x) => x !== w))} />}
            {screen === "settings" && <SettingsScreen settings={settings} setSettings={setSettings} apiCount={apiCount} onCapturingChange={(v) => { capturingRef.current = v; window.EA && window.EA.setCapturing(v); }} />}
            {screen === "updates" && <UpdatesScreen />}
            {screen === "license" && <LicenseScreen licensed={licensed} autoFocus={licenseFocus} onBack={() => setScreen("home")} onActivated={() => { setLicensed(true); setLicenseFocus(false); }} />}
          </main>
        </div>
        {/* the listening pill is the system-wide overlay window, not shown inside the dashboard */}
      </div>
    </div>
  );
}

function Pill({ pill, dark, accKey }) {
  const show = pill.phase !== "idle";
  const cls = "pill" + (show ? " show" : "") + (dark ? " dark" : "") + (accKey === "green" ? " acc-green" : "");
  return (
    <div className={cls} aria-live="polite">
      {pill.phase === "listening" && (
        <>
          <span className="pulse"></span>
          <span className="wave">{Array.from({ length: 15 }).map((_, i) => (
            <i key={i} style={{ animationDelay: (i * 0.07) + "s", animationDuration: (0.7 + (i % 4) * 0.12) + "s" }}></i>
          ))}</span>
          <span className="plang">{pill.lang === "ar" ? "ع AR" : "EN"}</span>
          <span className="esc">esc</span>
        </>
      )}
      {pill.phase === "transcribing" && (
        <>
          <span className="pulse" style={{ animation: "none", background: "var(--text-faint)" }}></span>
          <span className="pstatus"><IconSpark size={15} style={{ color: "var(--accent)" }} />Transcribing<span className="dots"><span>.</span><span>.</span><span>.</span></span></span>
          <span className="plang">{pill.lang === "ar" ? "ع AR" : "EN"}</span>
        </>
      )}
      {pill.phase === "done" && (
        <>
          <span className="pcheck"><IconCheck size={14} /></span>
          <span className={"ptext" + (pill.lang === "ar" ? " rtl" : "")}>{pill.text}</span>
          <span className="plang" style={{ color: "var(--success)", background: "var(--success-soft)", borderColor: "var(--success-border)" }}>Pasted</span>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
