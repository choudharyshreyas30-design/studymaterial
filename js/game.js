(function () {
  "use strict";

  var CFG = window.ROBOTRONICS_CONFIG || {};
  var SECONDS = 20;
  var MAX_BONUS = 50;
  var BASE = 100;

  var QUESTIONS = [
    {
      q: "The rover must measure how far away a rock is by sending out sound pulses and timing the echo. Which sensor does this?",
      opts: ["Ultrasonic sensor", "LDR (light dependent resistor)", "Thermistor", "Gyroscope"],
      why: "An ultrasonic sensor (like the HC-SR04) sends a sound pulse and times the echo to work out distance. An LDR senses light, a thermistor senses temperature, and a gyroscope senses rotation."
    },
    {
      q: "A bright LED on the rover's control board is drawing too much current. Which component, placed in series, limits the current?",
      opts: ["Resistor", "Capacitor", "Diode", "Switch"],
      why: "A resistor limits current (Ohm's law: I = V / R). That is why LEDs almost always have a series resistor. A capacitor stores charge and a diode only lets current flow one way."
    },
    {
      q: "The rover learns to recognise safe ground by studying thousands of labelled photos, then improves its own predictions. This is an example of:",
      opts: ["Machine learning", "Soldering", "Pulse width modulation", "A short circuit"],
      why: "Learning patterns from labelled examples is supervised machine learning, a core part of AI. PWM controls motor speed, and soldering joins components."
    }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var screens = { intro: $("screen-intro"), game: $("screen-game"), result: $("screen-result") };
  var rover = $("rover");
  var state = { i: 0, score: 0, power: 0, right: 0, locked: true, deadline: 0, timer: null, current: null, muted: false };
  var audioCtx = null;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- analytics (optional, off unless configured) ---------- */
  var gcQueue = [];
  function loadAnalytics() {
    if (/^[a-z0-9-]{2,40}$/i.test(CFG.goatcounterCode || "")) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://gc.zgo.at/count.js";
      s.setAttribute("data-goatcounter", "https://" + CFG.goatcounterCode + ".goatcounter.com/count");
      s.onload = function () { gcQueue.splice(0).forEach(sendGC); };
      document.head.appendChild(s);
    }
    if (/^G-[A-Z0-9]{4,20}$/.test(CFG.ga4MeasurementId || "")) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", CFG.ga4MeasurementId);
      var g = document.createElement("script");
      g.async = true;
      g.src = "https://www.googletagmanager.com/gtag/js?id=" + CFG.ga4MeasurementId;
      document.head.appendChild(g);
    }
  }
  function sendGC(name) {
    if (window.goatcounter && typeof window.goatcounter.count === "function") {
      window.goatcounter.count({ path: "event/" + name, title: name, event: true });
    } else { gcQueue.push(name); }
  }
  function track(name, params) {
    try {
      if (CFG.goatcounterCode) { sendGC(name); }
      if (typeof window.gtag === "function") { window.gtag("event", name, params || {}); }
    } catch (e) { /* analytics must never break the game */ }
  }

  /* ---------- sound (Web Audio, no files) ---------- */
  function tone(freq, start, dur, type, vol) {
    if (state.muted || !audioCtx) { return; }
    var o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime + start;
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function sfx(kind) {
    if (kind === "good") { tone(523, 0, 0.12, "triangle"); tone(784, 0.1, 0.22, "triangle"); }
    if (kind === "bad") { tone(200, 0, 0.25, "sawtooth", 0.08); tone(150, 0.12, 0.3, "sawtooth", 0.08); }
    if (kind === "win") { [523, 659, 784, 1047].forEach(function (f, n) { tone(f, n * 0.12, 0.3, "triangle"); }); }
    if (kind === "tick") { tone(880, 0, 0.05, "square", 0.04); }
  }
  $("sound").addEventListener("click", function () {
    state.muted = !state.muted;
    this.setAttribute("aria-pressed", String(!state.muted));
    this.textContent = state.muted ? "Sound off" : "Sound on";
  });

  /* ---------- helpers ---------- */
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function setPower(p) {
    state.power = Math.min(100, Math.round(p));
    $("power-fill").style.width = state.power + "%";
    $("power-text").textContent = state.power + "%";
    rover.style.setProperty("--power", String(state.power / 100));
    rover.classList.toggle("online", state.power >= 90);
  }
  function burst() {
    if (reduced) { return; }
    for (var n = 0; n < 26; n++) {
      var s = document.createElement("span");
      s.className = "spark";
      var a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160;
      s.style.left = "50%"; s.style.top = "38%";
      s.style.setProperty("--x", Math.cos(a) * d + "px");
      s.style.setProperty("--y", Math.sin(a) * d + "px");
      document.body.appendChild(s);
      setTimeout(function (el) { el.remove(); }.bind(null, s), 1200);
    }
  }
  function pulseClass(cls, ms) {
    rover.classList.remove(cls); void rover.getBoundingClientRect(); rover.classList.add(cls);
    setTimeout(function () { rover.classList.remove(cls); }, ms);
  }

  /* ---------- game flow ---------- */
  function start() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") { audioCtx.resume(); }
    state.i = 0; state.score = 0; state.right = 0;
    setPower(0);
    $("score").textContent = "0";
    track("game_started");
    show("game");
    ask();
  }

  function ask() {
    var item = QUESTIONS[state.i];
    state.current = { item: item, opts: shuffle(item.opts.map(function (t, idx) { return { t: t, ok: idx === 0 }; })) };
    state.locked = false;
    $("progress").textContent = (state.i + 1) + " of " + QUESTIONS.length;
    $("q-text").textContent = item.q;
    $("feedback").hidden = true;
    var box = $("answers");
    box.textContent = "";
    state.current.opts.forEach(function (o, n) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "ans";
      var k = document.createElement("span"); k.className = "key"; k.textContent = String(n + 1); k.setAttribute("aria-hidden", "true");
      var t = document.createElement("span"); t.textContent = o.t;
      var tag = document.createElement("span"); tag.className = "tag";
      b.appendChild(k); b.appendChild(t); b.appendChild(tag);
      b.addEventListener("click", function () { choose(n); });
      box.appendChild(b);
    });
    startTimer();
    $("q-text").focus({ preventScroll: true });
  }

  function startTimer() {
    clearInterval(state.timer);
    state.deadline = Date.now() + SECONDS * 1000;
    var last = SECONDS;
    state.timer = setInterval(function () {
      var left = Math.max(0, (state.deadline - Date.now()) / 1000);
      $("timer-fill").style.transform = "scaleX(" + (left / SECONDS) + ")";
      var whole = Math.ceil(left);
      $("timer-num").textContent = String(whole);
      $("timer-fill").parentNode.classList.toggle("low", left <= 5);
      if (whole !== last && whole <= 3 && whole > 0) { sfx("tick"); }
      last = whole;
      if (left <= 0) { choose(-1); }
    }, 100);
  }

  function choose(n) {
    if (state.locked) { return; }
    state.locked = true;
    clearInterval(state.timer);
    var left = Math.max(0, (state.deadline - Date.now()) / 1000);
    var btns = $("answers").children;
    var ok = n >= 0 && state.current.opts[n].ok;
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      var tag = btns[i].querySelector(".tag");
      if (state.current.opts[i].ok) { btns[i].classList.add("correct"); tag.textContent = "Correct"; }
      else if (i === n) { btns[i].classList.add("wrong"); tag.textContent = "Incorrect"; }
    }
    var fb = $("feedback");
    fb.className = "feedback " + (ok ? "good" : "bad");
    var status;
    if (ok) {
      var pts = BASE + Math.round((left / SECONDS) * MAX_BONUS);
      state.score += pts; state.right++;
      status = "Correct! +" + pts + " points";
      setPower(state.power + 100 / QUESTIONS.length);
      sfx("good"); pulseClass("drive", 1300);
    } else {
      status = n < 0 ? "Time is up. No points this round." : "Not quite. No points this round.";
      setPower(state.power + 100 / QUESTIONS.length / 3);
      sfx("bad"); pulseClass("shake", 450);
    }
    $("score").textContent = String(state.score);
    $("fb-status").textContent = status;
    $("fb-why").textContent = state.current.item.why;
    $("next").textContent = state.i === QUESTIONS.length - 1 ? "See my results" : "Next challenge";
    fb.hidden = false;
    $("next").focus({ preventScroll: false });
  }

  function finish() {
    var max = QUESTIONS.length * (BASE + MAX_BONUS);
    var score = state.score;
    var rank, msg;
    if (state.right === QUESTIONS.length) { rank = "Mission Commander"; msg = "Flawless run. The rover is fully charged and ready to explore. Robotronics would love to see what you build next."; }
    else if (state.right === 2) { rank = "Rover Engineer"; msg = "Strong work. Two systems fully restored, and you now know what to revise in the study kit."; }
    else if (state.right === 1) { rank = "Rookie Explorer"; msg = "The rover is limping, but it is moving. The study kit covers exactly these basics."; }
    else { rank = "Cadet in Training"; msg = "The rover is on emergency power. Every engineer starts here, so open the study kit and try again."; }
    var full = state.power >= 90;
    $("res-state").textContent = full ? "ALL SYSTEMS ONLINE" : "PARTIAL POWER RESTORED (" + state.power + "%)";
    $("rank").textContent = rank;
    $("res-msg").textContent = msg;
    show("result");
    $("res-title").focus({ preventScroll: true });
    track("game_completed", { score: score, correct: state.right });
    sfx("win"); if (full || state.right >= 2) { burst(); }
    var el = $("final-score"), t0 = Date.now(), dur = reduced ? 0 : 900;
    (function tick() {
      var p = dur ? Math.min(1, (Date.now() - t0) / dur) : 1;
      el.textContent = String(Math.round(score * p));
      if (p < 1) { requestAnimationFrame(tick); }
    })();
    el.parentNode.querySelector("small").textContent = " / " + max;
  }

  /* ---------- wiring ---------- */
  $("start").addEventListener("click", start);
  $("next").addEventListener("click", function () {
    state.i++;
    if (state.i >= QUESTIONS.length) { finish(); } else { ask(); }
  });
  $("replay").addEventListener("click", function () { show("intro"); setPower(0); window.scrollTo(0, 0); $("start").focus(); });
  $("btn-ig").addEventListener("click", function () { track("instagram_clicked"); });
  $("btn-drive").addEventListener("click", function () { track("study_material_clicked", { source: "results" }); });
  $("link-skip").addEventListener("click", function () { track("study_material_clicked", { source: "skip_link" }); });

  document.addEventListener("keydown", function (e) {
    if (screens.game.hidden || state.locked || e.ctrlKey || e.metaKey || e.altKey) { return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { choose(n - 1); }
  });

  // Starfield
  (function () {
    var sky = $("sky"), count = reduced ? 50 : 90;
    for (var n = 0; n < count; n++) {
      var s = document.createElement("i"), sz = Math.random() < 0.15 ? 3 : 2;
      s.style.cssText = "left:" + Math.random() * 100 + "%;top:" + Math.random() * 85 + "%;width:" + sz + "px;height:" + sz + "px;animation-delay:" + (Math.random() * 4).toFixed(1) + "s;opacity:" + (0.3 + Math.random() * 0.6).toFixed(2);
      sky.appendChild(s);
    }
  })();

  show("intro");
  loadAnalytics();
})();
