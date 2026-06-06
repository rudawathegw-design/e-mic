// screens.jsx — page components for EA MIC. Exported to window.
const { useState, useEffect, useRef } = React;

/* ---------------- HOME ---------------- */
function HomeScreen({ name, stats, scratch, setScratch, scratchLang, settings, onTalk, onBuy, onEnterKey, licensed }) {
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const fmt = (n) => n.toLocaleString("en-US");
  return (
    <div className="page" data-screen-label="Home">
      <div className="page-head">
        <div>
          <h1 className="greet">{greet}, <em>{name}</em></h1>
          <p className="sub">Hold <span className="kbd">Ctrl</span> + <span className="kbd">Win</span>, speak, release. EA&nbsp;MIC cleans it up locally.</p>
        </div>
        <span className="badge-private"><span className="dot"></span>PRIVATE</span>
      </div>

      {licensed ? (
        <div className="banner lic">
          <div className="bicon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><IconCheck size={18} /></div>
          <div className="btxt"><b>Licensed — Lifetime</b><span>Thanks for supporting EA MIC. All features unlocked.</span></div>
          <span className="badge-private"><span className="dot"></span>ACTIVE</span>
        </div>
      ) : (
        <div className="banner">
          <div className="bicon"><IconSpark size={18} /></div>
          <div className="btxt"><b>Trial — 14 days left</b><span>Unlock unlimited dictation and Arabic models.</span></div>
          <button className="btn sm" onClick={onEnterKey}><IconKey size={14} />Enter key</button>
          <button className="btn primary sm" onClick={onBuy}>Buy a license</button>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="lab"><IconType size={13} />Total words dictated</div>
          <div className="val">{fmt(stats.words)}</div>
        </div>
        <div className="stat">
          <div className="lab"><IconWave size={13} />Dictations</div>
          <div className="val">{fmt(stats.dictations)}</div>
        </div>
        <div className="stat">
          <div className="lab"><IconClock size={13} />Typing time saved</div>
          <div className="val">{stats.minutes}<small> min</small></div>
        </div>
      </div>

      <div className={"scratch" + (scratchLang === "ar" ? " rtl" : "")}>
        <div className="scratch-head">
          <IconWave size={15} style={{ color: "var(--accent)" }} />
          <span className="lab">Scratchpad</span>
          <span className="tip">Click here, then hold to talk — your words land where the cursor is.</span>
        </div>
        <textarea
          value={scratch}
          onChange={(e) => setScratch(e.target.value)}
          placeholder={scratchLang === "ar" ? "اضغط هنا ثم تحدّث…" : "Place your cursor here, then hold Ctrl + Win and speak…"} />
      </div>
    </div>
  );
}

/* ---------------- HISTORY ---------------- */
function HistoryScreen({ transcripts, onDelete, onClear, onCopy }) {
  const [q, setQ] = useState("");
  const filtered = transcripts.filter((t) => t.text.toLowerCase().includes(q.toLowerCase()));
  const groups = {};
  filtered.forEach((t) => { (groups[t.dateLabel] = groups[t.dateLabel] || []).push(t); });
  const order = ["Today", "Yesterday", "Earlier"];
  const keys = Object.keys(groups).sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return (
    <div className="page" data-screen-label="History">
      <div className="page-head">
        <div>
          <h1 className="page-title">History</h1>
          <p className="sub">All transcripts are private and stored locally on your machine.</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div className="search" style={{ flex: 1 }}>
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcripts" />
        </div>
        {transcripts.length > 0 && <button className="btn danger" onClick={onClear}>Clear all</button>}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="ei"><IconHistory size={24} /></div>
          <p>{transcripts.length === 0 ? "No transcripts yet." : "No matches found."}</p>
          {transcripts.length === 0 && <p style={{ fontSize: 13 }}>Hold Ctrl + Win anywhere to start dictating.</p>}
        </div>
      ) : keys.map((k) => (
        <div key={k}>
          <div className="section-title">{k}</div>
          <div>
            {groups[k].map((t) => (
              <div key={t.id} className={"trow" + (t.lang === "ar" ? " rtl" : "")}>
                <div className="ttime">{t.time}</div>
                <div className="ttext">{t.text}</div>
                <div className="tlang">{t.lang.toUpperCase()}</div>
                <div className="tactions">
                  <button className="tact" title="Copy" onClick={() => onCopy(t.text)}><IconCopy /></button>
                  <button className="tact" title="Delete" onClick={() => onDelete(t.id)}><IconTrash /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- DICTIONARY ---------------- */
function DictionaryScreen({ words, onAdd, onRemove }) {
  const [val, setVal] = useState("");
  const isAr = (s) => /[\u0600-\u06FF]/.test(s);
  const submit = () => { const v = val.trim(); if (v) { onAdd(v); setVal(""); } };
  return (
    <div className="page page-narrow" data-screen-label="Dictionary">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dictionary</h1>
          <p className="sub">Words the AI cleanup must always spell correctly — names, brands, technical terms, in English or Arabic.</p>
        </div>
      </div>
      <div className="dict-input">
        <input value={val} onChange={(e) => setVal(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && submit()}
               placeholder="Add a word or phrase…" dir="auto" />
        <button className="btn primary" onClick={submit}><IconPlus size={15} />Add</button>
      </div>
      {words.length === 0 ? (
        <div className="empty"><div className="ei"><IconBook size={24} /></div><p>No custom words yet.</p></div>
      ) : (
        <div className="chips">
          {words.map((w) => (
            <span key={w} className={"chip" + (isAr(w) ? " rtl" : "")}>
              {w}
              <button className="x" onClick={() => onRemove(w)} title="Remove">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- SETTINGS ---------------- */
function SettingsScreen({ settings, setSettings, onCapturingChange }) {
  const [saved, setSaved] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 1600); };

  useEffect(() => {
    onCapturingChange && onCapturingChange(capturing);
    if (!capturing) return;
    const fmtKey = (e) => {
      const parts = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.metaKey) parts.push("Win");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      const k = e.key;
      if (!["Control", "Meta", "Alt", "Shift"].includes(k))
        parts.push(k === " " ? "Space" : k.length === 1 ? k.toUpperCase() : k);
      return parts;
    };
    const onKey = (e) => {
      e.preventDefault();
      const parts = fmtKey(e);
      if (parts.length >= 2 || (parts.length === 1 && !["Ctrl", "Win", "Alt", "Shift"].includes(parts[0]))) {
        set("shortcut", parts);
        setCapturing(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing]);

  const Select = ({ k, options }) => (
    <div className="selectwrap">
      <select value={settings[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="chev"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
    </div>
  );

  return (
    <div className="page" data-screen-label="Settings">
      <div className="page-head"><div><h1 className="page-title">Settings</h1><p className="sub">Everything runs on-device. No audio ever leaves your computer.</p></div></div>

      <div className="card">
        <div className="fieldrow">
          <div className="flabel"><b>Model</b><span>Bigger is more accurate, slower on CPU.</span></div>
          <div className="fctl"><Select k="model" options={["Small — fastest (good on CPU)", "Medium — balanced", "Large — most accurate", "Arabic-tuned (beta)"]} /></div>
        </div>
        <div className="fieldrow">
          <div className="flabel"><b>Dictation language</b><span>Auto detects EN / AR per phrase.</span></div>
          <div className="fctl">
            <div className="lang-seg">
              {[["en", "English"], ["ar", "العربية"], ["auto", "Auto"]].map(([v, l]) => (
                <button key={v} className={settings.language === v ? "on" : ""} onClick={() => set("language", v)}>
                  <span className={v === "ar" ? "ar" : ""}>{l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="fieldrow">
          <div className="flabel"><b>Output mode</b><span>How transcripts reach your app.</span></div>
          <div className="fctl"><Select k="output" options={["Paste (recommended)", "Type character-by-character", "Copy to clipboard only"]} /></div>
        </div>
        <div className="fieldrow">
          <div className="flabel"><b>Auto-punctuation</b><span>Add commas, periods & question marks.</span></div>
          <div className="fctl"><button className={"toggle" + (settings.punctuation ? " on" : "")} onClick={() => set("punctuation", !settings.punctuation)}></button></div>
        </div>
        <div className="fieldrow">
          <div className="flabel"><b>Lower other audio</b><span>Duck music & calls while you talk.</span></div>
          <div className="fctl"><Select k="duck" options={["Off", "Low (10%)", "Medium (25%)", "High (50%)"]} /></div>
        </div>
        <div className="fieldrow">
          <div className="flabel"><b>Push-to-talk shortcut</b><span>Hold to record, release to paste.</span></div>
          <div className="fctl" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="shortcut-field">
              <div className="keys">
                {capturing
                  ? <span style={{ color: "var(--accent-strong)", fontSize: 13, fontWeight: 600 }}>Press keys…</span>
                  : settings.shortcut.map((k, i) => <span key={i} className="kbd">{k}</span>)}
              </div>
            </div>
            <button className="btn sm" onClick={() => setCapturing((c) => !c)}>{capturing ? "Cancel" : "Change"}</button>
            <button className={"btn sm" + (saved ? " primary" : "")} onClick={save}>{saved ? <><IconCheck size={14} />Saved</> : "Save"}</button>
          </div>
        </div>
        <div className="fieldrow">
          <div className="flabel"><b>Launch on startup</b><span>Open EA MIC when Windows starts.</span></div>
          <div className="fctl"><button className={"toggle" + (settings.startup ? " on" : "")} onClick={() => set("startup", !settings.startup)}></button></div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UPDATES ---------------- */
function UpdatesScreen() {
  const [state, setState] = useState("idle"); // idle | checking | available | downloading | done
  const [pct, setPct] = useState(0);
  const check = () => {
    setState("checking");
    setTimeout(() => setState("available"), 1300);
  };
  const install = () => {
    setState("downloading"); setPct(0);
    const id = setInterval(() => {
      setPct((p) => {
        if (p >= 100) { clearInterval(id); setState("done"); return 100; }
        return p + 8;
      });
    }, 130);
  };
  return (
    <div className="page page-narrow" data-screen-label="Updates">
      <div className="page-head"><div><h1 className="page-title">Updates</h1><p className="sub">Check for a newer EA MIC build.</p></div></div>

      <div className="card update-box">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h3>EA MIC</h3>
          <span className="ver-pill">v2.4.1</span>
          {state === "available" && <span className="ver-pill" style={{ color: "var(--success)", borderColor: "var(--success-border)", background: "var(--success-soft)" }}>v2.5.0 available</span>}
        </div>
        <p className="sub" style={{ maxWidth: 520 }}>Your transcripts, license, settings, and downloaded models stay in the local data folder across updates.</p>

        {state === "downloading" && <div className="progress"><div style={{ width: pct + "%" }}></div></div>}
        {state === "done" && <p className="sub" style={{ color: "var(--success)", marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}><IconCheck size={16} />Updated to v2.5.0 — restart to apply.</p>}

        <div className="update-actions">
          {state === "idle" && <button className="btn" onClick={check}><IconRefresh size={15} />Check for updates</button>}
          {state === "checking" && <button className="btn" disabled style={{ opacity: .7 }}><IconRefresh size={15} />Checking…</button>}
          {state === "available" && <button className="btn primary" onClick={install}><IconDownload size={15} />Download and install</button>}
          {state === "downloading" && <button className="btn primary" disabled style={{ opacity: .8 }}>Downloading… {pct}%</button>}
          {state === "done" && <button className="btn" onClick={() => { setState("idle"); setPct(0); }}>Restart now</button>}
        </div>
      </div>

      <div className="card update-box" style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div className="bicon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><IconShield size={18} /></div>
        <div>
          <h3 style={{ marginBottom: 4 }}>Fully private</h3>
          <p className="sub" style={{ margin: 0, maxWidth: 520 }}>EA MIC transcribes offline. Audio is processed on your device and discarded the moment your text is ready.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- LICENSE / ACTIVATION ---------------- */
const FIB_NUMBER = "7510593659";
const PRICE = "19,000";

function LicenseScreen({ licensed, onActivated, onBack, autoFocus }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | error | activating
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (autoFocus && !licensed && inputRef.current) {
      inputRef.current.focus();
      formRef.current && formRef.current.style.setProperty("scroll-margin-top", "20px");
    }
  }, [autoFocus, licensed]);

  const copyNum = () => {
    try { navigator.clipboard.writeText(FIB_NUMBER); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const activate = () => {
    const c = code.trim();
    if (c.replace(/[^a-z0-9]/gi, "").length < 6) { setStatus("error"); return; }
    setStatus("activating");
    setTimeout(() => { onActivated && onActivated(); }, 800);
  };

  if (licensed) {
    return (
      <div className="page page-narrow" data-screen-label="License">
        <button className="lic-back" onClick={onBack}><IconArrowLeft size={16} />Home</button>
        <div className="page-head"><div><h1 className="page-title">Your license</h1><p className="sub">EA MIC is fully activated on this device.</p></div></div>
        <div className="lic-ok">
          <div className="lk"><IconCheck size={22} /></div>
          <div className="lt"><b>License activated</b><span>Lifetime · unlimited dictation · English &amp; Arabic models</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow" data-screen-label="License">
      <button className="lic-back" onClick={onBack}><IconArrowLeft size={16} />Home</button>
      <div className="page-head">
        <div>
          <h1 className="page-title">Buy a license</h1>
          <p className="sub">A one-time payment unlocks EA MIC forever. Pay from any Iraqi bank with FIB.</p>
        </div>
      </div>

      {/* price */}
      <div className="price-card">
        <div className="pc-left">
          <div className="pc-name">EA MIC — Lifetime license</div>
          <div className="pc-tag">One device · free updates</div>
          <ul className="pc-feat">
            <li><span className="tick"><IconCheck size={12} /></span>Unlimited dictation</li>
            <li><span className="tick"><IconCheck size={12} /></span>English &amp; Arabic models</li>
            <li><span className="tick"><IconCheck size={12} /></span>Fully offline &amp; private</li>
          </ul>
        </div>
        <div className="price-tag">
          <div><span className="amt">{PRICE}</span><span className="cur">IQD</span></div>
          <div className="once">one-time payment</div>
        </div>
      </div>

      {/* FIB payment */}
      <div className="card sec-card">
        <div className="fib-head">
          <div className="fib-logo"><img src="assets/fib-logo.png" alt="FIB" /></div>
          <div>
            <div className="fh-name">First Iraqi Bank (FIB)</div>
            <div className="fh-sub">Instant transfer · fees-free</div>
          </div>
          <span className="iq-badge">
            <span className="fl"><i style={{ background: "#CE1126" }}></i><i style={{ background: "#fff" }}></i><i style={{ background: "#000" }}></i></span>
            Iraq only
          </span>
        </div>
        <div className="pay-number">
          <div>
            <div className="pn-label">Send to FIB number</div>
            <div className="pn-num">{FIB_NUMBER}</div>
          </div>
          <button className={"btn pn-copy" + (copied ? " primary" : "")} onClick={copyNum}>
            {copied ? <><IconCheck size={15} />Copied</> : <><IconCopy size={15} />Copy number</>}
          </button>
        </div>
      </div>

      {/* steps */}
      <div className="card sec-card">
        <div className="sec-head"><b>How it works</b><span>Two minutes — pay first, then activate.</span></div>
        <ol className="steps">
          <li><div><div className="st-b">Pay {PRICE} IQD with FIB</div><div className="st-s">Open your FIB app, choose <b>Send money</b>, and transfer <b>{PRICE} IQD</b> to <b>{FIB_NUMBER}</b>.</div></div></li>
          <li>
            <div style={{ flex: 1 }}>
              <div className="st-b">Get your activation code</div>
              <div className="st-s">Right after payment, your code is sent back to your FIB account. Open the transaction in FIB and reveal <b>“Your Code Activation.”</b></div>
              <div className="code-illus">
                <img src="assets/fib-transaction.png" alt="FIB Transaction Details showing Your Code Activation" />
                <div className="ci-cap"><IconLock size={13} />In your FIB transaction, tap the red <b>“Your Code Activation”</b> sticker to reveal the code.</div>
              </div>
            </div>
          </li>
          <li><div><div className="st-b">Enter the code below</div><div className="st-s">Type the code from FIB into the box and press <b>Activate</b>. You’re done — unlocked for life.</div></div></li>
        </ol>
      </div>

      {/* activation */}
      <div className="card sec-card" ref={formRef}>
        <div className="sec-head"><b>Enter activation code</b><span>From your FIB transaction note.</span></div>
        <div className="activate-form">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => { setCode(e.target.value); if (status === "error") setStatus("idle"); }}
            onKeyDown={(e) => e.key === "Enter" && activate()}
            className={status === "error" ? "err" : ""}
            placeholder="e.g. EA-7K9P-2M4Q"
            spellCheck="false" autoComplete="off" />
          <button className="btn primary" onClick={activate} disabled={status === "activating"} style={status === "activating" ? { opacity: .8 } : null}>
            <IconKey size={15} />{status === "activating" ? "Activating…" : "Activate"}
          </button>
        </div>
        {status === "error" && <div className="activate-msg err">That code doesn’t look right — check your FIB transaction and try again.</div>}
        {status !== "error" && <div className="activate-msg" style={{ color: "var(--text-faint)" }}>Haven’t paid yet? Complete steps 1–2 above first.</div>}
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, HistoryScreen, DictionaryScreen, SettingsScreen, UpdatesScreen, LicenseScreen });
