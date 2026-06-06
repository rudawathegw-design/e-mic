// app.jsx — EA MIC shell, dictation engine, listening pill, tweaks.
const { useState, useEffect, useRef, useCallback } = React;

/* ----- sample dictation output (with punctuation, as the AI cleanup returns it) ----- */
const SAMPLES = {
  en: [
    "Let's move the launch to next Tuesday and give QA an extra day.",
    "Can you send me the latest numbers before the standup tomorrow?",
    "Great call on the new layout — it feels much calmer already.",
    "Remind me to follow up with the finance team about the Q3 budget.",
    "I think we should ship the Arabic model first; the demand is clearly there.",
  ],
  ar: [
    "هل يمكنك إرسال العرض التقديمي قبل اجتماع الغد؟",
    "لنؤجّل الإطلاق إلى الأسبوع القادم ونمنح الفريق وقتاً إضافياً.",
    "أحسنتم العمل على التصميم الجديد، أصبح أكثر وضوحاً.",
    "ذكّرني بمتابعة الفريق المالي بشأن ميزانية الربع الثالث.",
  ],
};

const SEED = [
  { id: 1, text: "Let's lock the design review for Thursday afternoon and loop in the data team.", time: "2:34 PM", dateLabel: "Today", lang: "en" },
  { id: 2, text: "هل يمكنك إرسال التقرير المالي قبل نهاية اليوم؟", time: "1:12 PM", dateLabel: "Today", lang: "ar" },
  { id: 3, text: "The new onboarding flow cut drop-off by almost forty percent — great work, everyone.", time: "11:48 AM", dateLabel: "Today", lang: "en" },
  { id: 4, text: "لنحدّد موعد الاجتماع يوم الأحد في تمام العاشرة صباحاً.", time: "5:20 PM", dateLabel: "Yesterday", lang: "ar" },
  { id: 5, text: "Reminder: send the updated contract to legal and cc Maya.", time: "9:03 AM", dateLabel: "Yesterday", lang: "en" },
];

const ACCENTS = {
  coral: { p: "#D97757", s: "#C2603E", soft: "#FAEDE6", border: "#EBC3B2" },
  green: { p: "#5B8A72", s: "#487058", soft: "#E9F0EA", border: "#BFD6C7" },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#D97757",
  "pillStyle": "light",
  "greeting": "serif",
  "corners": "soft"
}/*EDITMODE-END*/;

const wc = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState("home");
  const [transcripts, setTranscripts] = useState(SEED);
  const [dict, setDict] = useState(["EA MIC", "Kurdistan", "Rudaw", "أربيل", "Anthropic", "Q3 roadmap"]);
  const [settings, setSettings] = useState({
    model: "Small — fastest (good on CPU)", language: "auto",
    output: "Paste (recommended)", punctuation: true, duck: "Medium (25%)",
    shortcut: ["Ctrl", "Win"], startup: true,
  });
  const [scratch, setScratch] = useState("");
  const [scratchLang, setScratchLang] = useState("en");
  const [licensed, setLicensed] = useState(false);
  const [licenseFocus, setLicenseFocus] = useState(false);
  const goLicense = (focus) => { setLicenseFocus(focus); setScreen("license"); };

  // pill: phase idle|listening|transcribing|done
  const [pill, setPill] = useState({ phase: "idle", text: "", lang: "en" });
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const capturingRef = useRef(false);
  const timers = useRef([]);
  const altLang = useRef(0);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const pickLang = () => {
    if (settings.language === "ar") return "ar";
    if (settings.language === "en") return "en";
    return (altLang.current++ % 3 === 1) ? "ar" : "en"; // auto: mostly EN, some AR
  };

  const start = useCallback(() => {
    if (capturingRef.current) return;
    if (holdingRef.current) return;
    holdingRef.current = true; setHolding(true);
    clearTimers();
    const lang = pickLang();
    setPill({ phase: "listening", text: "", lang });
  }, [settings.language]);

  const cancel = useCallback(() => {
    holdingRef.current = false; setHolding(false);
    clearTimers();
    setPill((p) => ({ ...p, phase: "idle" }));
  }, []);

  const stop = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false; setHolding(false);
    setPill((p) => {
      if (p.phase !== "listening") return p;
      const lang = p.lang;
      const pool = SAMPLES[lang];
      const text = pool[Math.floor(Math.random() * pool.length)];
      // transcribing → done
      timers.current.push(setTimeout(() => {
        setScratchLang(lang);
        if (/^(Paste|Type)/.test(settings.output)) {
          setScratch((s) => (s ? s + (lang === "ar" ? " " : " ") + text : text));
        }
        try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) {}
        const now = new Date();
        const tm = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        setTranscripts((arr) => [{ id: Date.now(), text, time: tm, dateLabel: "Today", lang }, ...arr]);
        setPill({ phase: "done", text, lang });
        timers.current.push(setTimeout(() => setPill((q) => ({ ...q, phase: "idle" })), 1900));
      }, 1250));
      return { ...p, phase: "transcribing" };
    });
  }, [settings.output]);

  // global Ctrl+Win push-to-talk
  useEffect(() => {
    const down = (e) => {
      if (capturingRef.current) return;
      if (e.repeat) return;
      if (e.key === "Escape") { cancel(); return; }
      if (e.ctrlKey && e.metaKey) { e.preventDefault(); start(); }
    };
    const up = (e) => {
      if (capturingRef.current) return;
      if (holdingRef.current && (e.key === "Control" || e.key === "Meta" || (!e.ctrlKey || !e.metaKey))) stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [start, stop, cancel]);

  // apply tweaks → css vars
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

  // derived stats (1 word ≈ matches the "Hello." baseline; time saved at ~40 wpm)
  const totalWords = transcripts.reduce((n, x) => n + wc(x.text), 0);
  const stats = { words: totalWords, dictations: transcripts.length, minutes: Math.round(totalWords / 40) };

  const NAV = [
    ["home", "Home", IconHome],
    ["history", "History", IconHistory, transcripts.length],
    ["dictionary", "Dictionary", IconBook],
    ["settings", "Settings", IconGear],
    ["updates", "Updates", IconDownload],
  ];

  const accKey = t.accent === ACCENTS.green.p ? "green" : "coral";

  return (
    <div className="desktop">
      <div className="win" data-acc={accKey}>
        {/* title bar */}
        <div className="titlebar">
          <div className="tb-brand">
            <span className="brandmark"><span></span><span></span><span></span><span></span></span>
            <span className="tb-name">EA MIC</span>
            <span className="tb-sub">· English & Arabic voice to text</span>
          </div>
          <div className="tb-spacer"></div>
          <div className="win-controls">
            <button className="win-btn" title="Minimize"><svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>
            <button className="win-btn" title="Maximize"><svg viewBox="0 0 12 12" fill="none"><rect x="2.2" y="2.2" width="7.6" height="7.6" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg></button>
            <button className="win-btn close" title="Close"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>
          </div>
        </div>

        <div className="win-body">
          {/* sidebar */}
          <aside className="sidebar">
            <div className="side-talk">
              <button
                className={"talk-btn" + (holding ? " holding" : "")}
                onPointerDown={(e) => { e.preventDefault(); start(); }}
                onPointerUp={stop}
                onPointerLeave={() => holdingRef.current && stop()}
              >
                <span className="mic-dot"></span>{holding ? "Listening…" : "Hold to talk"}
              </button>
              <div className="talk-hint">Hold <span className="kbd">Ctrl</span>+<span className="kbd">Win</span> anywhere,<br/>or press &amp; hold this button.</div>
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
              <div className="avatar">RA</div>
              <div><div className="nm">Ruda A.</div><div className="pl">{licensed ? "Licensed" : "Trial plan"}</div></div>
            </div>
          </aside>

          {/* content */}
          <main className="content">
            {screen === "home" && <HomeScreen name="Ruda" stats={stats} scratch={scratch} setScratch={setScratch} scratchLang={scratchLang} settings={settings} onTalk={start} licensed={licensed} onBuy={() => goLicense(false)} onEnterKey={() => goLicense(true)} />}
            {screen === "history" && <HistoryScreen transcripts={transcripts} onDelete={(id) => setTranscripts((a) => a.filter((x) => x.id !== id))} onClear={() => setTranscripts([])} onCopy={(txt) => { try { navigator.clipboard.writeText(txt); } catch (e) {} }} />}
            {screen === "dictionary" && <DictionaryScreen words={dict} onAdd={(w) => setDict((a) => a.includes(w) ? a : [...a, w])} onRemove={(w) => setDict((a) => a.filter((x) => x !== w))} />}
            {screen === "settings" && <SettingsScreen settings={settings} setSettings={setSettings} onCapturingChange={(v) => { capturingRef.current = v; }} />}
            {screen === "updates" && <UpdatesScreen />}
            {screen === "license" && <LicenseScreen licensed={licensed} autoFocus={licenseFocus} onBack={() => setScreen("home")} onActivated={() => { setLicensed(true); setLicenseFocus(false); }} />}
          </main>
        </div>

        {/* listening pill */}
        <div className="pill-layer">
          <Pill pill={pill} dark={t.pillStyle === "dark"} accKey={accKey} />
        </div>

        {/* tweaks */}
        <TweaksPanel>
          <TweakSection label="Theme" />
          <TweakColor label="Accent" value={t.accent} options={[ACCENTS.coral.p, ACCENTS.green.p]} onChange={(v) => setTweak("accent", v)} />
          <TweakRadio label="Corners" value={t.corners} options={["soft", "sharp"]} onChange={(v) => setTweak("corners", v)} />
          <TweakSection label="Greeting" />
          <TweakRadio label="Headings" value={t.greeting} options={["serif", "sans"]} onChange={(v) => setTweak("greeting", v)} />
          <TweakSection label="Listening pill" />
          <TweakRadio label="Style" value={t.pillStyle} options={["light", "dark"]} onChange={(v) => setTweak("pillStyle", v)} />
          <TweakButton label="Preview pill" onClick={() => { start(); setTimeout(stop, 1400); }}>Test dictation</TweakButton>
        </TweaksPanel>
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
