// E Mic — marketing site interactions
(function () {
  "use strict";

  /* ---- scroll-driven app switcher ---- */
  var swapTrack = document.querySelector(".appswap-track");
  if (swapTrack) {
    var swCards = [].slice.call(swapTrack.querySelectorAll(".appswap-card"));
    var swDots = [].slice.call(swapTrack.querySelectorAll(".appswap-dot"));
    var swN = swCards.length;
    var swCur = -1;
    var setSwap = function (i) {
      if (i === swCur) return;
      swCur = i;
      swCards.forEach(function (c, idx) {
        c.classList.toggle("on", idx === i);
        c.classList.toggle("prev", idx < i);
      });
      swDots.forEach(function (d, idx) { d.classList.toggle("on", idx === i); });
    };
    var swapUpdate = function () {
      var r = swapTrack.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      setSwap(Math.min(swN - 1, Math.floor(p * swN * 0.999)));
    };
    (function swapLoop() { swapUpdate(); requestAnimationFrame(swapLoop); })();
    window.addEventListener("scroll", swapUpdate, { passive: true });
    window.addEventListener("resize", swapUpdate);
  }

  /* ---- sticky nav shadow ---- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (window.scrollY > 8) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- 3D hero: scroll-driven morph + mouse parallax tilt ---- */
  var deck = document.querySelector(".hero-deck");
  var heroVisual = document.querySelector(".hero-visual");
  var heroEl = document.querySelector(".hero");
  var flip = document.getElementById("flipTitle");
  var fFront = flip && flip.querySelector(".front");
  var fBack = flip && flip.querySelector(".back");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  // progress 0..1 from how far the hero has scrolled up past the top of the viewport
  function scrollProgress(px) {
    if (!heroEl) return 0;
    var top = heroEl.getBoundingClientRect().top; // 0 at rest, negative as you scroll down
    return Math.min(1, Math.max(0, -top / px));
  }
  function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  if (reduceMotion) {
    if (deck) deck.style.transform = "none";
    if (fFront && fBack) { fFront.style.opacity = "0"; fBack.style.opacity = "1"; fBack.style.transform = "none"; }
  } else {
    var baseRy = -12, baseRx = 6, tRy = baseRy, tRx = baseRx, ry = baseRy, rx = baseRx;
    var canTilt = deck && heroVisual && window.innerWidth > 960;
    if (canTilt) {
      heroVisual.addEventListener("mousemove", function (e) {
        var r = heroVisual.getBoundingClientRect();
        tRy = baseRy + ((e.clientX - r.left) / r.width - 0.5) * 16;
        tRx = baseRx - ((e.clientY - r.top) / r.height - 0.5) * 14;
      });
      heroVisual.addEventListener("mouseleave", function () { tRy = baseRy; tRx = baseRx; });
    }
    (function loop() {
      // headline morph
      if (fFront && fBack) {
        var e = easeInOut(scrollProgress(280));
        fFront.style.opacity = String(1 - e);
        fFront.style.transform = "rotateX(" + (-e * 62) + "deg) translateY(" + (-e * 16) + "px)";
        fBack.style.opacity = String(e);
        fBack.style.transform = "rotateX(" + ((1 - e) * 62) + "deg) translateY(" + ((1 - e) * 16) + "px)";
      }
      // deck tilt: ease toward mouse target, flatten + lift as you scroll
      if (canTilt) {
        var sc = scrollProgress(560);
        ry += (tRy * (1 - sc * 0.7) - ry) * 0.08;
        rx += (tRx * (1 - sc) - sc * 4 - rx) * 0.08;
        deck.style.transform = "rotateY(" + ry.toFixed(2) + "deg) rotateX(" + rx.toFixed(2) + "deg) translateY(" + (-sc * 18).toFixed(1) + "px)";
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---- download buttons: don't navigate to pricing; show a small confirmation ---- */
  function lastTextNode(el) {
    for (var n = el.lastChild; n; n = n.previousSibling) {
      if (n.nodeType === 3 && n.textContent.trim()) return n;
    }
    return null;
  }
  [].slice.call(document.querySelectorAll("a.btn")).forEach(function (a) {
    if (!/Download for Windows/i.test(a.textContent)) return;
    a.setAttribute("href", "#");
    var tn = lastTextNode(a);
    var orig = tn ? tn.textContent : "";
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (a.dataset.busy || !tn) return;
      a.dataset.busy = "1";
      tn.textContent = " Starting download\u2026";
      setTimeout(function () {
        tn.textContent = " Download started \u2713";
        setTimeout(function () { tn.textContent = orig; delete a.dataset.busy; }, 1800);
      }, 750);
    });
  });

  /* ---- scroll reveals ---- */
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  function revealNow(el) { el.classList.add("in"); }
  // immediately reveal anything already in (or near) the viewport — no async wait
  function revealInView() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    reveals.forEach(function (el) {
      if (el.classList.contains("in")) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) revealNow(el);
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { revealNow(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }
  // synchronous first paint reveal + a couple of safety passes
  revealInView();
  window.addEventListener("load", revealInView);
  setTimeout(revealInView, 200);
  setTimeout(function () { reveals.forEach(revealNow); }, 1200);

  /* ---- count-up stats ---- */
  var counted = false;
  var counters = [].slice.call(document.querySelectorAll("[data-count]"));
  function runCounters() {
    if (counted) return; counted = true;
    counters.forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      var zero = el.getAttribute("data-zero");
      if (zero != null && target === 0) { el.textContent = zero; return; }
      var dur = 1400, start = performance.now();
      el.textContent = prefix + 0 + suffix;
      function tick(now) {
        var p = Math.min(1, (now - start) / dur);
        var ease = 1 - Math.pow(1 - p, 3);
        var val = Math.round(target * ease);
        el.textContent = prefix + val + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      // guarantee the final value lands even if rAF is throttled
      setTimeout(function () { el.textContent = prefix + target + suffix; }, dur + 150);
    });
  }
  var band = document.querySelector(".band");
  if (band && "IntersectionObserver" in window) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounters(); bio.disconnect(); } });
    }, { threshold: 0.4 });
    bio.observe(band);
  } else { runCounters(); }

  /* ---- waveform bars ---- */
  var wave = document.getElementById("demoWave");
  if (wave) {
    var html = "";
    for (var i = 0; i < 16; i++) {
      var dly = (i * 0.07).toFixed(2);
      var dur = (0.7 + (i % 4) * 0.12).toFixed(2);
      html += '<i style="animation-delay:' + dly + 's;animation-duration:' + dur + 's"></i>';
    }
    wave.innerHTML = html;
  }

  /* ---- auto-playing dictation demo ---- */
  var PHRASES = [
    "Let's move the launch to next Tuesday and give the team an extra day.",
    "Can you send me the latest numbers before the standup tomorrow?",
    "Great work on the new design — it feels much calmer already.",
    "Remind me to follow up with finance about the Q3 budget."
  ];
  var pill = document.getElementById("demoPill");
  var waveEl = document.getElementById("demoWave");
  var statusEl = document.getElementById("demoStatus");
  var langEl = document.getElementById("demoLang");
  var textEl = document.getElementById("demoText");
  var talk = document.getElementById("demoTalk");
  var talkLabel = document.getElementById("demoTalkLabel");

  // hero demo is optional — skip everything below if it isn't on the page
  if (!pill || !textEl) return;

  var timers = [];
  var pi = 0;
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }

  function setListening() {
    pill.classList.add("show", "listening");
    waveEl.style.display = "";
    statusEl.style.display = "none";
    langEl.style.display = "";
    langEl.textContent = "EN";
    langEl.style.color = ""; langEl.style.background = ""; langEl.style.borderColor = "";
    talk.classList.add("live");
    talkLabel.textContent = "Listening…";
  }
  function setTranscribing() {
    pill.classList.remove("listening");
    waveEl.style.display = "none";
    statusEl.style.display = "";
    statusEl.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5 9 9M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/></svg> Transcribing<span class="dots"><span>.</span><span>.</span><span>.</span></span>';
    talkLabel.textContent = "Working…";
  }
  function setDone() {
    pill.querySelector(".pulse").style.display = "none";
    statusEl.style.display = "none";
    waveEl.style.display = "none";
    var check = pill.querySelector(".pcheck");
    if (!check) {
      check = document.createElement("span");
      check.className = "pcheck";
      check.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9 17.5 20 6.5"/></svg>';
      pill.insertBefore(check, pill.firstChild);
    }
    check.style.display = "";
    langEl.style.display = "";
    langEl.textContent = "Pasted";
    langEl.style.color = "var(--success)";
    langEl.style.background = "var(--success-soft)";
    langEl.style.borderColor = "var(--success-border)";
    talkLabel.textContent = "Pasted ✓";
  }
  function resetPill() {
    pill.classList.remove("show", "listening");
    pill.querySelector(".pulse").style.display = "";
    var check = pill.querySelector(".pcheck");
    if (check) check.style.display = "none";
    waveEl.style.display = "";
    statusEl.style.display = "none";
    talk.classList.remove("live");
    talkLabel.textContent = "Hold to talk";
  }

  function typeText(text, done) {
    var words = text.split(" ");
    textEl.innerHTML = "";
    var i = 0;
    function next() {
      if (i >= words.length) {
        var cur = document.createElement("span");
        cur.className = "cursor";
        textEl.appendChild(cur);
        if (done) later(done, 1400);
        return;
      }
      var w = document.createElement("span");
      w.className = "pop";
      w.textContent = words[i];
      if (i > 0) textEl.appendChild(document.createTextNode(" "));
      textEl.appendChild(w);
      i++;
      later(next, 55 + Math.random() * 45);
    }
    next();
  }

  function cycle() {
    clearAll();
    resetPill();
    textEl.innerHTML = '<span class="cursor"></span>';
    // idle beat
    later(function () {
      setListening();
      later(function () {
        setTranscribing();
        later(function () {
          setDone();
          var phrase = PHRASES[pi % PHRASES.length];
          pi++;
          typeText(phrase, function () {
            // hold finished text, then fade pill and restart
            later(function () {
              resetPill();
              later(cycle, 600);
            }, 1600);
          });
        }, 1100);
      }, 2100);
    }, 900);
  }

  // start the demo: kick off on load (it's the hero centerpiece), IO only as a guard
  var stage = document.querySelector(".demo-stage");
  var started = false;
  function startDemo() { if (started) return; started = true; later(cycle, 500); }
  if (stage && "IntersectionObserver" in window) {
    var dio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) startDemo(); });
    }, { threshold: 0.05 });
    dio.observe(stage);
  }
  if (document.readyState === "complete") startDemo();
  else window.addEventListener("load", startDemo);
  setTimeout(startDemo, 800);

  // clicking the talk button restarts the cycle immediately
  if (talk) {
    talk.style.cursor = "pointer";
    talk.addEventListener("click", function () { pi = pi; cycle(); });
  }
})();
