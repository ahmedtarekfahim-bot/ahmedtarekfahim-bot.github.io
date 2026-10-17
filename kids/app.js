/* Super Kid: English words, verbs, sentences, games and math, with voice. */
(function () {
  "use strict";

  /* ---------- storage ---------- */
  var KEY = "super-kid-v1";
  var APP_V = "4";
  var DEF = {
    name: "", rate: 0.85, voice: "", voiceSet: "en1", reps: 2, gap: 3, auto: true, ar: false, sfx: true,
    gameCats: [], stars: 0, played: 0, best: {}, learned: {},
    math: {ops: ["+"], a: 1, b: 1, n: 10, table: 0}
  };
  var S = load();
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    var o = JSON.parse(JSON.stringify(DEF));
    for (var k in s) if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = s[k];
    if (!o.math || !o.math.ops) o.math = JSON.parse(JSON.stringify(DEF.math));
    return o;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }

  /* ---------- helpers ---------- */
  var $ = function (q, r) { return (r || document).querySelector(q); };
  var app = $("#app");
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function isTxt(em) { return /^[0-9]+$/.test(em) || em === "▬"; }
  function emo(em, cls) { return '<div class="em ' + (isTxt(em) ? "txt " : "") + (cls || "") + '">' + esc(em) + "</div>"; }

  var ALL = [];
  CATS.forEach(function (c) { c.words.forEach(function (w) { ALL.push({em: w[0], en: w[1], ar: w[2], cat: c.id}); }); });
  var CAT = {}; CATS.forEach(function (c) { CAT[c.id] = c; });
  var GRP = {}; SENT.forEach(function (g) { GRP[g.id] = g; });
  var V = VERBS.map(function (v, i) {
    return {i: i, em: v[0], base: v[1], s: v[2], past: v[3], pp: v[4], ing: v[5], ar: v[6], arPast: v[7],
      ex: {now: [v[8], v[9]], past: [v[10], v[11]], cont: [v[12], v[13]], fut: [v[14], v[15]]}};
  });

  /* ---------- voice ---------- */
  var synth = window.speechSynthesis || null;
  var voices = [];
  function loadVoices() { if (synth) voices = synth.getVoices() || []; }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  function enVoices() { return voices.filter(function (v) { return /^en[-_]/i.test(v.lang) || v.lang === "en"; }); }
  function enVoice() {
    var list = enVoices();
    if (!list.length) return null;
    if (S.voice) { var m = list.filter(function (v) { return v.name === S.voice; })[0]; if (m) return m; }
    var pref = [/en[-_]US/i, /en[-_]GB/i, /en[-_]IN/i];
    for (var p = 0; p < pref.length; p++) {
      var g = list.filter(function (v) { return pref[p].test(v.lang) && /google/i.test(v.name); })[0] || list.filter(function (v) { return pref[p].test(v.lang); })[0];
      if (g) return g;
    }
    return list[0];
  }
  function arVoice() { return voices.filter(function (v) { return /^ar/i.test(v.lang); })[0] || null; }

  /* recorded voices: every word and sentence is a ready mp3 (audio/<voice>/<id>.mp3).
     key() must match key() in the recording script. The phone voice is only a fallback. */
  var IDX = null;
  fetch("audio/index.json").then(function (r) { return r.json(); }).then(function (j) { IDX = j; }).catch(function () { /* offline before first load */ });
  function key(t) { return String(t).toLowerCase().replace(/[^a-z0-9؀-ۿ' ]+/g, " ").replace(/\s+/g, " ").trim(); }
  function clipUrl(text, lang) {
    if (!IDX) return null;
    var ar = lang === "ar", id = (ar ? IDX.ar : IDX.en)[key(text)];
    return id == null ? null : "audio/" + (ar ? "ar" : (S.voiceSet === "en2" ? "en2" : "en1")) + "/" + id + ".mp3";
  }
  var player = new Audio();
  var playEnd = null;
  function playClip(url, rate) {
    return new Promise(function (res) {
      var done = false;
      function fin() { if (done) return; done = true; player.onended = player.onerror = null; playEnd = null; res(); }
      playEnd = fin;
      player.onended = fin; player.onerror = fin;
      player.src = url;
      try { player.preservesPitch = true; } catch (e) { /* older browsers */ }
      player.playbackRate = rate;
      var p = player.play();
      if (p && p.catch) p.catch(fin);
      setTimeout(fin, 15000);
    });
  }
  var SPEED = {0.65: 0.78, 0.75: 0.88, 0.85: 1, 1: 1.12};
  function say(text, lang, rate) {
    var url = clipUrl(text, lang);
    if (url) return playClip(url, rate ? 1 : (SPEED[S.rate] || 1));
    return sayDevice(text, lang, rate);
  }
  function sayDevice(text, lang, rate) {
    return new Promise(function (res) {
      if (!synth || !text) { setTimeout(res, 500); return; }
      var ar = lang === "ar";
      var u = new SpeechSynthesisUtterance(text);
      var v = ar ? arVoice() : enVoice();
      if (ar && !v) { res(); return; }
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
      u.rate = rate || S.rate; u.pitch = ar ? 1 : 1.08;
      var done = false;
      var t = setTimeout(fin, 3000 + text.length * 160 / u.rate);
      function fin() { if (done) return; done = true; clearTimeout(t); res(); }
      u.onend = fin; u.onerror = fin;
      try { synth.resume(); synth.speak(u); } catch (e) { fin(); }
    });
  }
  function hush() {
    try { player.pause(); } catch (e) { /* ignore */ }
    if (playEnd) playEnd();
    if (synth) try { synth.cancel(); } catch (e) { /* ignore */ }
  }

  /* ---------- sound fx ---------- */
  var actx = null;
  /* note = [frequency, start, length, wave, volume, slide-to frequency, vibrato] */
  function tone(seq) {
    if (!S.sfx) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime + 0.02;
      seq.forEach(function (n) {
        var st = t + n[1], end = st + n[2], vol = n[4] || 0.22;
        var o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
        o.type = n[3] || "sine"; o.frequency.setValueAtTime(n[0], st);
        if (n[5]) o.frequency.exponentialRampToValueAtTime(n[5], end);
        if (n[6]) {
          var lfo = actx.createOscillator(), lg = actx.createGain();
          lfo.frequency.value = n[6]; lg.gain.value = n[0] * 0.04;
          lfo.connect(lg); lg.connect(o.frequency); lfo.start(st); lfo.stop(end + 0.05);
        }
        f.type = "lowpass"; f.frequency.value = o.type === "sawtooth" ? 1100 : 6000;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(vol, st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(f); f.connect(g); g.connect(actx.destination); o.start(st); o.stop(end + 0.05);
      });
    } catch (e) { /* no audio */ }
  }
  /* bell-like note: tone plus a soft octave above */
  function bell(f, at, len, vol) { return [[f, at, len, "triangle", vol || 0.22], [f * 2, at, len * 0.7, "sine", (vol || 0.22) * 0.35]]; }
  function tune(notes) { var s = []; notes.forEach(function (n) { s = s.concat(bell(n[0], n[1], n[2], n[3])); }); tone(s); }
  var C5 = 523, D5 = 587, E5 = 659, G5 = 784, A5 = 880, C6 = 1047, E6 = 1319, G6 = 1568;
  var GOOD_TUNES = [
    [[C5, 0, .14], [E5, .1, .14], [G5, .2, .14], [C6, .3, .45]],
    [[G5, 0, .12], [A5, .09, .12], [C6, .18, .12], [E6, .27, .5, .16]],
    [[E5, 0, .12], [G5, .1, .12], [E6, .2, .2, .16], [C6, .32, .45]]
  ];
  var SFX = {
    /* happy jingle with a sparkle on top */
    good: function () { tune(pick(GOOD_TUNES)); tone([[G6, .42, .25, "sine", .06], [C6 * 2, .5, .3, "sine", .05]]); },
    /* cartoon trombone: wah wah wah waaah */
    bad: function () {
      tone([[392, 0, .28, "sawtooth", .16, 380], [370, .3, .28, "sawtooth", .16, 355], [349, .6, .28, "sawtooth", .16, 335], [330, .9, .8, "sawtooth", .16, 300, 6]]);
    },
    /* end of a game: little fanfare and a chord */
    win: function () {
      tune([[G5 / 2 * 2, 0, .12], [G5, .13, .12], [G5, .26, .12], [C6, .4, .25], [A5, .66, .12], [C6, .8, .7]]);
      tone([[C5, .8, .9, "triangle", .1], [E5, .8, .9, "triangle", .1], [G5, .8, .9, "triangle", .1]]);
    },
    tap: function () { tone([[D5, 0, .06, "triangle", .12]]); }
  };
  var CHEER = [["Great job!", "أحسنت! 🎉"], ["Super!", "رائع! 🌟"], ["Well done!", "برافو! 👏"], ["Excellent!", "ممتاز! 🏆"], ["You are a star!", "أنت نجم! ⭐"], ["Awesome!", "مذهل! 🚀"]];
  var OOPS = [["Oops! Try again.", "حاول تاني 💪"], ["Not quite!", "قربت! 🙂"]];

  function toast(big, small, ms) {
    var t = $("#toast");
    t.innerHTML = esc(big) + (small ? "<small>" + esc(small) + "</small>" : "");
    t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, ms || 1100);
  }
  function confetti(n) {
    var fx = $("#fx"), set = ["⭐", "🎉", "✨", "🎈", "💖", "🌟", "🍭", "🎊"];
    for (var i = 0; i < (n || 18); i++) {
      var e = document.createElement("i");
      e.textContent = pick(set);
      e.style.left = rnd(0, 96) + "vw"; e.style.top = "-40px";
      e.style.animationDelay = (Math.random() * .4) + "s"; e.style.fontSize = rnd(22, 40) + "px";
      fx.appendChild(e);
      setTimeout(function (x) { return function () { x.remove(); }; }(e), 2200);
    }
  }
  function addStar(n) { S.stars += n || 1; save(); $("#stars").textContent = S.stars; }
  function good(extraSay) {
    var c = pick(CHEER); SFX.good(); toast(c[0], c[1]); confetti(10); addStar(1);
    return extraSay === false ? Promise.resolve() : say(c[0]);
  }
  function bad() { var c = pick(OOPS); SFX.bad(); toast(c[0], c[1], 900); }

  /* ---------- mascot ---------- */
  var OWL = '<svg class="mascot" viewBox="0 0 120 130" aria-hidden="true">' +
    '<ellipse cx="60" cy="124" rx="34" ry="5" fill="#000" opacity=".08"/>' +
    '<path d="M28 34 L22 10 L44 26 Z" fill="#5a3bd6"/><path d="M92 34 L98 10 L76 26 Z" fill="#5a3bd6"/>' +
    '<ellipse cx="60" cy="72" rx="42" ry="48" fill="#6c4cff"/>' +
    '<ellipse cx="60" cy="88" rx="27" ry="28" fill="#c9bcff"/>' +
    '<path d="M44 82 q4 4 8 0 M56 92 q4 4 8 0 M68 82 q4 4 8 0" stroke="#a594f5" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="20" cy="76" rx="9" ry="22" fill="#5a3bd6" transform="rotate(14 20 76)"/>' +
    '<ellipse cx="100" cy="76" rx="9" ry="22" fill="#5a3bd6" transform="rotate(-14 100 76)"/>' +
    '<circle cx="42" cy="50" r="18" fill="#fff"/><circle cx="78" cy="50" r="18" fill="#fff"/>' +
    '<circle cx="45" cy="52" r="8" fill="#2b2250"/><circle cx="75" cy="52" r="8" fill="#2b2250"/>' +
    '<circle cx="48" cy="49" r="3" fill="#fff"/><circle cx="78" cy="49" r="3" fill="#fff"/>' +
    '<path d="M54 62 L66 62 L60 72 Z" fill="#ffb02e"/>' +
    '<circle cx="30" cy="66" r="5" fill="#ff8fc1" opacity=".7"/><circle cx="90" cy="66" r="5" fill="#ff8fc1" opacity=".7"/>' +
    '<path d="M46 118 l-6 6 M50 118 v7 M54 118 l6 6" stroke="#ffb02e" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M66 118 l-6 6 M70 118 v7 M74 118 l6 6" stroke="#ffb02e" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M38 22 q22 -14 44 0 l-4 6 q-18 -10 -36 0 Z" fill="#ffc93c"/><circle cx="60" cy="12" r="5" fill="#ff5fa2"/>' +
    "</svg>";
  var FRIENDS = ["🐵", "🦁", "🐼", "🐯", "🦊", "🐸", "🐨", "🐧", "🦄", "🐙"];

  /* ---------- router ---------- */
  function go(h) { location.hash = h; }
  window.addEventListener("hashchange", route);
  $("#back").addEventListener("click", function () { SFX.tap(); location.hash = parent(location.hash); });
  function parent(h) {
    var p = h.replace(/^#/, "").split("/");
    if (p[0] === "cat" || p[0] === "play" && p[1] === "w") return "#words";
    if (p[0] === "grp" || p[0] === "play" && p[1] === "s") return "#sent";
    if (p[0] === "verb" || p[0] === "play" && p[1] === "v") return "#verbs";
    if (p[0] === "play" && p[1] === "vx") return "#verb/" + p[2];
    if (p[0] === "game") return "#games";
    if (p[0] === "mathplay" || p[0] === "tables") return "#math";
    return "#home";
  }
  function head(t1, t2, back) {
    $("#title").innerHTML = '<span class="en">' + esc(t1) + "</span>" + (t2 ? "<small>" + esc(t2) + "</small>" : "");
    $("#back").classList.toggle("hide", !back);
    $("#stars").textContent = S.stars;
  }
  function pbar(html) {
    var old = $(".pbar"); if (old) old.remove();
    if (!html) return;
    var d = document.createElement("div"); d.className = "pbar"; d.innerHTML = '<div class="in">' + html + "</div>";
    document.body.appendChild(d);
    d.addEventListener("click", onClick);
  }
  function route() {
    PL.run++; G.run++; hush(); stopRec();
    pbar("");
    var p = (location.hash || "#home").replace(/^#/, "").split("/");
    window.scrollTo(0, 0);
    var r = R[p[0]] || R.home;
    r.apply(null, p.slice(1).map(decodeURIComponent));
  }

  /* ---------- actions (event delegation) ---------- */
  var A = {};
  function onClick(e) {
    var el = e.target.closest("[data-a]");
    if (!el) return;
    var f = A[el.dataset.a];
    if (f) f(el, el.dataset);
  }
  app.addEventListener("click", onClick);
  A.go = function (el, d) { SFX.tap(); go(d.h); };
  A.say = function (el, d) {
    hush();
    document.querySelectorAll(".on").forEach(function (x) { if (x.classList.contains("card") || x.classList.contains("line")) x.classList.remove("on"); });
    el.classList.add("on");
    say(d.t).then(function () { if (d.ar && S.ar) return say(d.ar, "ar"); }).then(function () { el.classList.remove("on"); });
    if (d.k) { S.learned[d.k] = 1; save(); }
  };

  var R = {};

  /* ---------- home ---------- */
  R.home = function () {
    head("Super Kid", "إنجليزي ورياضيات", false);
    var wod = ALL[(new Date().getDate() * 7 + new Date().getMonth() * 31) % ALL.length];
    var hi = S.name ? "Hi " + S.name + "!" : "Hi friend!";
    app.innerHTML =
      '<div class="hero">' + OWL + '<div class="bubble"><span class="en"><b>' + esc(hi) + "</b> Let's learn and play!</span><br><span class=\"ar\">يلا نتعلم ونلعب سوا 🎉</span></div></div>" +
      '<div class="tiles">' +
      tile("#words", "📚", "Words", "الكلمات", "#ff8a3d", ALL.length) +
      tile("#verbs", "🏃", "Verbs", "الأفعال والأزمنة", "#ff5fa2", V.length) +
      tile("#sent", "💬", "Sentences", "الجمل", "#2ec4b6", SENT.reduce(function (a, g) { return a + g.s.length; }, 0)) +
      tile("#games", "🎮", "Games", "الألعاب", "#6c4cff") +
      tile("#math", "🧮", "Math", "الرياضيات", "#00a8e8") +
      tile("#me", "⭐", "My Stars", "نجومي وملصقاتي", "#ffb300") +
      "</div>" +
      '<h2 class="sec">🌞 <span class="en">Word of the day</span> <span class="ar note" style="margin:0">كلمة اليوم</span></h2>' +
      '<button class="line" data-a="say" data-t="' + esc(wod.en) + '" data-ar="' + esc(wod.ar) + '">' + emo(wod.em) +
      '<span class="tx"><span class="en">' + esc(wod.en) + '</span><span class="ar">' + esc(wod.ar) + '</span></span><span class="play">🔊</span></button>' +
      '<div class="row" style="margin-top:18px"><button class="btn white big" data-a="go" data-h="#settings">⚙️ <span class="ar">الإعدادات: الصوت والتكرار</span></button></div>' +
      '<p class="note ar" style="text-align:center;margin-top:14px">نسخة ' + APP_V + " · 🔊 أصوات معلّمة متسجّلة</p>";
  };
  function tile(h, ic, t1, t2, color, cnt) {
    return '<button class="tile" style="background:' + color + '" data-a="go" data-h="' + h + '">' + (cnt ? '<span class="cnt">' + cnt + "</span>" : "") +
      '<span class="ic">' + ic + '</span><span class="t1 en">' + esc(t1) + '</span><span class="t2 ar">' + esc(t2) + "</span></button>";
  }

  /* ---------- words ---------- */
  R.words = function () {
    head("Words", "الكلمات: اختار قسم", true);
    app.innerHTML = '<p class="note ar">اضغط على أي قسم تشوف كلماته، وكل كلمة لما تدوس عليها بتتقري. زرار ▶️ بيشغّل القسم كله ويستناك تردد.</p><div class="tiles">' +
      CATS.map(function (c) { return tile("#cat/" + c.id, c.icon, c.en, c.ar, c.color, c.words.length); }).join("") + "</div>";
  };
  R.cat = function (id) {
    var c = CAT[id]; if (!c) return R.words();
    head(c.en, c.ar, true);
    app.innerHTML = '<div class="cards">' + c.words.map(function (w, i) {
      return '<button class="card" data-a="say" data-k="' + esc(c.id + ":" + w[1]) + '" data-t="' + esc(w[1]) + '" data-ar="' + esc(w[2]) + '"><span class="spk">' + (S.learned[c.id + ":" + w[1]] ? "✅" : "🔊") + "</span>" +
        emo(w[0]) + '<span class="w en">' + esc(w[1]) + '</span><span class="m ar">' + esc(w[2]) + "</span></button>";
    }).join("") + "</div>";
    pbar('<button class="btn green" data-a="go" data-h="#play/w/' + c.id + '/0">▶️ <span class="ar">اسمع وردد</span></button>' +
      '<button class="btn" data-a="go" data-h="#game/listen/' + c.id + '">🎮 <span class="ar">العب بالقسم ده</span></button>');
  };

  /* ---------- sentences ---------- */
  R.sent = function () {
    head("Sentences", "الجمل: اختار موضوع", true);
    app.innerHTML = '<p class="note ar">جمل مهمة للمدرسة والبيت واللعب، بالترجمة.</p><div class="tiles">' +
      SENT.map(function (g) { return tile("#grp/" + g.id, g.icon, g.en, g.ar, g.color, g.s.length); }).join("") + "</div>";
  };
  R.grp = function (id) {
    var g = GRP[id]; if (!g) return R.sent();
    head(g.en, g.ar, true);
    app.innerHTML = '<div class="lines">' + g.s.map(function (s) {
      return '<button class="line" data-a="say" data-t="' + esc(speakable(s[0])) + '" data-ar="' + esc(s[1]) + '"><span class="tx"><span class="en">' + esc(s[0]) + '</span><span class="ar">' + esc(s[1]) + '</span></span><span class="play">🔊</span></button>';
    }).join("") + "</div>";
    pbar('<button class="btn green" data-a="go" data-h="#play/s/' + g.id + '/0">▶️ <span class="ar">اسمع وردد</span></button>' +
      '<button class="btn" data-a="go" data-h="#game/build/' + g.id + '">🧩 <span class="ar">رتّب الجملة</span></button>');
  };
  function speakable(t) { return t.replace(/[✗✓]/g, "").replace(/—/g, ",").trim(); }

  /* ---------- verbs ---------- */
  R.verbs = function () {
    head("Verbs", "الأفعال بكل الأزمنة", true);
    app.innerHTML = '<p class="note ar">كل فعل معاه: المضارع، ومع he/she، والماضي، والتصريف التالت، و ing، وجملة في كل زمن. اضغط على الفعل تشوف الجمل.</p>' +
      '<div class="setbox"><h3 class="ar">🧠 الأزمنة الأربعة</h3>' + TENSES.map(function (t) {
        return '<div style="margin-bottom:8px"><b class="en">' + esc(t.en) + '</b> — <span class="ar">' + esc(t.ar) + '</span><div class="en note" style="margin:2px 0 0;text-align:left">' + esc(t.tip) + "</div></div>";
      }).join("") + "</div>" +
      '<div class="lines">' + V.map(function (v) {
        return '<button class="line" data-a="go" data-h="#verb/' + v.i + '"><span class="em">' + v.em + '</span><span class="tx"><span class="en">' + esc(v.base) + '</span><span class="ar">' + esc(v.ar) + " ← " + esc(v.arPast) + "</span>" +
          '<span class="vforms"><span>' + esc(v.s) + "</span><span><b>" + esc(v.past) + "</b></span><span>" + esc(v.pp) + "</span><span>" + esc(v.ing) + "</span></span></span><span class=\"play\">›</span></button>";
      }).join("") + "</div>";
    pbar('<button class="btn green" data-a="go" data-h="#play/v/all/0">▶️ <span class="ar">اسمع التصريفات</span></button>' +
      '<button class="btn" data-a="go" data-h="#game/past">🎮 <span class="ar">لعبة الماضي</span></button>');
  };
  R.verb = function (i) {
    var v = V[+i]; if (!v) return R.verbs();
    head(v.base, v.ar, true);
    var forms = [["Base", v.base], ["He / She", v.s], ["Past", v.past], ["Past Participle", v.pp], ["-ing", v.ing]];
    app.innerHTML = '<div class="bigcard" style="min-height:0">' + emo(v.em) + '<div class="w en">' + esc(v.base) + '</div><div class="m ar">' + esc(v.ar) + " (الماضي: " + esc(v.arPast) + ")</div>" +
      '<div class="forms">' + forms.map(function (f) { return "<span><em>" + f[0] + "</em>" + esc(f[1]) + "</span>"; }).join("") + "</div>" +
      '<button class="btn sun" style="margin-top:10px" data-a="say" data-t="' + esc(v.base + ", " + v.past + ", " + v.pp) + '">🔊 ' + esc(v.base) + " · " + esc(v.past) + " · " + esc(v.pp) + "</button></div>" +
      '<div class="lines">' + TENSES.map(function (t) {
        var e = v.ex[t.k]; if (!e || e[0] === "-") return "";
        return '<button class="line" data-a="say" data-t="' + esc(e[0]) + '" data-ar="' + esc(e[1]) + '"><span class="tx"><span class="ar" style="color:var(--brand2);font-weight:700">' + esc(t.ar) + '</span><span class="en">' + esc(e[0]) + '</span><span class="ar">' + esc(e[1]) + '</span></span><span class="play">🔊</span></button>';
      }).join("") + "</div>";
    pbar('<button class="btn green" data-a="go" data-h="#play/vx/' + v.i + '/0">▶️ <span class="ar">اسمع الجمل وردد</span></button>' +
      (+i < V.length - 1 ? '<button class="btn white" data-a="go" data-h="#verb/' + (+i + 1) + '"><span class="ar">الفعل اللي بعده</span> ⬅️</button>' : ""));
  };

  /* ---------- player: listen and repeat ---------- */
  var PL = {items: [], i: 0, run: 0, playing: false, back: "#home"};
  function playItems(kind, id) {
    if (kind === "w") { var c = CAT[id]; return c ? c.words.map(function (w) { return {em: w[0], en: w[1], ar: w[2], k: c.id + ":" + w[1]}; }) : []; }
    if (kind === "s") { var g = GRP[id]; return g ? g.s.map(function (s) { return {em: g.icon, en: s[0], ar: s[1], say: speakable(s[0]), long: true}; }) : []; }
    if (kind === "v") return V.map(function (v) { return {em: v.em, en: v.base, ar: v.ar + " ← " + v.arPast, say: v.base + ", " + v.past + ", " + v.pp, forms: [v.base, v.past, v.pp, v.ing]}; });
    if (kind === "vx") {
      var v = V[+id]; if (!v) return [];
      return TENSES.filter(function (t) { return v.ex[t.k][0] !== "-"; }).map(function (t) { return {em: v.em, en: v.ex[t.k][0], ar: v.ex[t.k][1], tn: t.ar, long: true}; });
    }
    return [];
  }
  R.play = function (kind, id, start) {
    PL.items = playItems(kind, id);
    PL.i = Math.min(+start || 0, Math.max(PL.items.length - 1, 0));
    var names = {w: CAT[id] && CAT[id].en, s: GRP[id] && GRP[id].en, v: "Verbs", vx: V[+id] && V[+id].base};
    head(names[kind] || "Listen", "اسمع وردد ورايا 🎤", true);
    if (!PL.items.length) { app.innerHTML = '<div class="empty">—</div>'; return; }
    drawPlayer();
    setTimeout(function () { startLoop(); }, 350);
  };
  function drawPlayer() {
    var it = PL.items[PL.i];
    app.innerHTML = '<div class="stage">' +
      '<div class="bigcard" id="bc"><span class="pos">' + (PL.i + 1) + " / " + PL.items.length + "</span>" +
      emo(it.em) + (it.tn ? '<div class="ar" style="color:var(--brand2);font-weight:700">' + esc(it.tn) + "</div>" : "") +
      '<div class="w en' + (it.long || it.en.length > 14 ? " long" : "") + '">' + esc(it.en) + "</div>" +
      (it.forms ? '<div class="forms">' + it.forms.map(function (f, k) { return "<span><em>" + ["Base", "Past", "P.P.", "-ing"][k] + "</em>" + esc(f) + "</span>"; }).join("") + "</div>" : "") +
      '<div class="m ar">' + esc(it.ar) + "</div></div>" +
      '<div class="turn" id="turn"></div>' +
      '<div class="ctrl"><button class="round" data-a="pnext" data-d="1" aria-label="التالي">⏭</button>' +
      '<button class="round main" data-a="ptoggle" id="ptog" aria-label="تشغيل">' + (PL.playing ? "⏸" : "▶") + "</button>" +
      '<button class="round" data-a="pnext" data-d="-1" aria-label="السابق">⏮</button></div>' +
      playerOpts() + "</div>";
  }
  function playerOpts() {
    function chips(name, vals, cur, fmt) {
      return vals.map(function (v) { return '<button class="chip' + (v === cur ? " on" : "") + '" data-a="popt" data-n="' + name + '" data-v="' + v + '">' + fmt(v) + "</button>"; }).join("");
    }
    return '<div class="opts">' +
      '<div class="row"><span class="lab ar">🔁 التكرار</span>' + chips("reps", [1, 2, 3, 4, 5], S.reps, function (v) { return v + "×"; }) + "</div>" +
      '<div class="row"><span class="lab ar">🎤 وقت ترديدك</span>' + chips("gap", [0, 2, 3, 5, 8], S.gap, function (v) { return v ? v + " ث" : "من غير"; }) + "</div>" +
      '<div class="row"><span class="lab ar">🐢 السرعة</span>' + chips("rate", [0.65, 0.85, 1], S.rate, function (v) { return v === 0.65 ? "بطيء" : v === 0.85 ? "متوسط" : "عادي"; }) + "</div>" +
      '<div class="row"><span class="lab ar">⏩ انتقال تلقائي</span>' + chips("auto", ["1", "0"], S.auto ? "1" : "0", function (v) { return v === "1" ? "شغّال" : "مقفول"; }) + "</div>" +
      '<div class="row"><span class="lab ar">🇸🇦 يقرا العربي</span>' + chips("ar", ["1", "0"], S.ar ? "1" : "0", function (v) { return v === "1" ? "أيوه" : "لأ"; }) + "</div>" +
      "</div>";
  }
  A.popt = function (el, d) {
    var n = d.n, v = d.v;
    if (n === "auto" || n === "ar") S[n] = v === "1"; else S[n] = parseFloat(v);
    save(); SFX.tap();
    var o = $(".opts"); if (o) o.outerHTML = playerOpts();
  };
  A.ptoggle = function () { if (PL.playing) stopLoop(); else startLoop(); };
  A.pnext = function (el, d) {
    stopLoop();
    PL.i = Math.max(0, Math.min(PL.items.length - 1, PL.i + +d.d));
    drawPlayer();
    startLoop();
  };
  function setTurn(mode, p) {
    var t = $("#turn"); if (!t) return;
    var bc = $("#bc"); if (bc) bc.classList.toggle("saying", mode === "listen");
    if (mode === "listen") t.innerHTML = '<span class="mascot-sm" style="font-size:34px">👂</span><span class="ar">اسمع كويس…</span>';
    else if (mode === "you") t.innerHTML = '<span class="dot" style="--p:' + (p || 0) + '%"><i>🎤</i></span><span class="ar">دورك! قول ورايا</span>';
    else if (mode === "next") t.innerHTML = '<span class="ar" style="color:var(--brand)">اضغط ⏭ للي بعده</span>';
    else if (mode === "done") t.innerHTML = '<span class="ar" style="color:var(--ok)">خلصت القسم! 🏆</span>';
    else t.innerHTML = "";
  }
  function stopLoop() { PL.run++; PL.playing = false; hush(); var b = $("#ptog"); if (b) b.textContent = "▶"; setTurn(""); }
  async function startLoop() {
    var my = ++PL.run; PL.playing = true;
    var b = $("#ptog"); if (b) b.textContent = "⏸";
    while (my === PL.run) {
      var it = PL.items[PL.i];
      if (it.k) { S.learned[it.k] = 1; save(); }
      for (var r = 0; r < S.reps; r++) {
        if (my !== PL.run) return;
        setTurn("listen");
        await say(it.say || it.en);
        if (my !== PL.run) return;
        if (r === 0 && S.ar && it.ar) { await say(it.ar.replace(/[()←]/g, " "), "ar"); if (my !== PL.run) return; }
        if (S.gap > 0) {
          var steps = Math.round(S.gap * 10);
          for (var s = 1; s <= steps; s++) { if (my !== PL.run) return; setTurn("you", Math.round(s / steps * 100)); await wait(100); }
        } else await wait(500);
      }
      if (my !== PL.run) return;
      if (PL.i >= PL.items.length - 1) { PL.playing = false; var b2 = $("#ptog"); if (b2) b2.textContent = "▶"; setTurn("done"); SFX.win(); confetti(24); addStar(2); return; }
      if (!S.auto) { PL.playing = false; var b3 = $("#ptog"); if (b3) b3.textContent = "▶"; setTurn("next"); return; }
      await wait(350);
      if (my !== PL.run) return;
      PL.i++; drawPlayer(); $("#ptog").textContent = "⏸";
    }
  }

  /* ---------- games ---------- */
  var G = {run: 0};
  var GAMES = [
    {id: "listen", ic: "👂", en: "Listen & Pick", ar: "اسمع واختار الصورة", c: "#ff8a3d"},
    {id: "meaning", ic: "🔤", en: "What does it mean?", ar: "اختار المعنى بالعربي", c: "#2ec4b6"},
    {id: "toen", ic: "🔁", en: "Arabic to English", ar: "اختار الكلمة بالإنجليزي", c: "#a259ff"},
    {id: "spell", ic: "✏️", en: "Spell it!", ar: "رتّب الحروف واكتب الكلمة", c: "#ff5fa2"},
    {id: "memory", ic: "🃏", en: "Memory Match", ar: "لعبة الذاكرة: طابق الصورة بالكلمة", c: "#00a8e8"},
    {id: "past", ic: "⏪", en: "Past Tense", ar: "اختار تصريف الماضي", c: "#ffb300"},
    {id: "tense", ic: "🕒", en: "Fill the Verb", ar: "كمّل الجملة بالفعل الصح", c: "#43a047"},
    {id: "build", ic: "🧩", en: "Build the Sentence", ar: "رتّب كلمات الجملة", c: "#7e57c2"},
    {id: "speak", ic: "🎤", en: "Say it!", ar: "قول الكلمة والبرنامج يسمعك", c: "#ef5350"}
  ];
  R.games = function () {
    head("Games", "الألعاب", true);
    var sel = S.gameCats;
    app.innerHTML = '<div class="setbox"><h3 class="ar">📚 الكلمات اللي هنلعب بيها</h3><div class="picks">' +
      '<button class="chip' + (!sel.length ? " on" : "") + '" data-a="gcat" data-id="">🌈 <span class="ar">الكل</span></button>' +
      CATS.map(function (c) { return '<button class="chip' + (sel.indexOf(c.id) >= 0 ? " on" : "") + '" data-a="gcat" data-id="' + c.id + '">' + c.icon + ' <span class="en">' + esc(c.en) + "</span></button>"; }).join("") +
      "</div></div>" +
      '<div class="gamelist">' + GAMES.map(function (g) {
        var best = S.best[g.id];
        return '<button class="gitem" data-a="go" data-h="#game/' + g.id + '"><span class="ic" style="background:' + g.c + '22">' + g.ic + '</span><span><span class="t1 en" style="display:block">' + esc(g.en) + '</span><span class="t2 ar">' + esc(g.ar) + (best != null ? " · أحسن نتيجة " + best : "") + "</span></span></button>";
      }).join("") + "</div>";
  };
  A.gcat = function (el, d) {
    SFX.tap();
    if (!d.id) S.gameCats = [];
    else { var i = S.gameCats.indexOf(d.id); if (i >= 0) S.gameCats.splice(i, 1); else S.gameCats.push(d.id); }
    save(); R.games();
  };
  function pool(only) {
    var cats = only ? [only] : S.gameCats;
    var p = cats.length ? ALL.filter(function (w) { return cats.indexOf(w.cat) >= 0; }) : ALL.slice();
    var seen = {}, out = [];
    p.forEach(function (w) { if (!seen[w.en]) { seen[w.en] = 1; out.push(w); } });
    if (out.length < 6) return ALL.slice();
    return out;
  }
  function distract(list, right, n, key) {
    var used = {}; used[right[key]] = 1; if (key !== "em") used["e" + right.em] = 1;
    var out = [];
    shuffle(list).forEach(function (w) {
      if (out.length >= n) return;
      if (used[w[key]] || (key === "em" && used["e" + w.em]) || used["e" + w.em]) return;
      used[w[key]] = 1; used["e" + w.em] = 1; out.push(w);
    });
    return out;
  }

  R.game = function (type, only) {
    var g = GAMES.filter(function (x) { return x.id === type; })[0];
    if (!g) return R.games();
    head(g.en, g.ar, true);
    G = {run: G.run + 1, type: type, i: 0, score: 0, n: 10, only: only, qs: [], tries: 0, busy: false};
    var maker = MAKE[type];
    G.qs = maker(only);
    if (!G.qs || !G.qs.length) { app.innerHTML = '<div class="empty ar">مفيش أسئلة كفاية في الاختيار ده.</div>'; return; }
    G.n = G.qs.length;
    if (type === "memory") return drawMemory();
    drawQ(true);
  };

  var AMBIG = ["time", "numbers", "questions", "places2", "opposites", "action", "feelings", "shapes"];
  var MAKE = {
    listen: function (only) {
      /* pictures that do not explain the word (days, numbers...) get the word under them */
      var p = pool(only), clear = p.filter(function (w) { return AMBIG.indexOf(w.cat) < 0; });
      if (clear.length >= 6) p = clear;
      return shuffle(p).slice(0, 10).map(function (w) { return {w: w, label: AMBIG.indexOf(w.cat) >= 0, opts: shuffle([w].concat(distract(p, w, 3, "em")))}; });
    },
    meaning: function (only) { var p = pool(only); return shuffle(p).slice(0, 10).map(function (w) { return {w: w, opts: shuffle([w].concat(distract(p, w, 3, "ar")))}; }); },
    toen: function (only) { var p = pool(only); return shuffle(p).slice(0, 10).map(function (w) { return {w: w, opts: shuffle([w].concat(distract(p, w, 3, "en")))}; }); },
    spell: function (only) {
      var p = pool(only).filter(function (w) { return /^[A-Za-z ]{3,10}$/.test(w.en); });
      return shuffle(p).slice(0, 10).map(function (w) {
        var letters = w.en.replace(/ /g, "").split("");
        var extra = "abcdefghijklmnopqrstuvwxyz".split("").filter(function (l) { return letters.indexOf(l) < 0; });
        return {w: w, tiles: shuffle(letters.concat(shuffle(extra).slice(0, 2))), got: []};
      });
    },
    memory: function (only) { var p = pool(only), clear = p.filter(function (w) { return AMBIG.indexOf(w.cat) < 0; }); return shuffle(clear.length >= 6 ? clear : p).slice(0, 6); },
    past: function () {
      return shuffle(V).slice(0, 10).map(function (v) {
        var w = v.base.split(" "), fake = w[0].replace(/e$/, "") + "ed" + (w.length > 1 ? " " + w.slice(1).join(" ") : "");
        var fakes = [v.base, v.ing, fake, v.s, v.pp].filter(function (f) { return f !== v.past; });
        var uniq = []; fakes.forEach(function (f) { if (uniq.indexOf(f) < 0) uniq.push(f); });
        return {v: v, right: v.past, opts: shuffle([v.past].concat(shuffle(uniq).slice(0, 3)))};
      });
    },
    tense: function () {
      var out = [];
      shuffle(V).forEach(function (v) {
        if (out.length >= 10) return;
        var k = pick(["now", "past", "cont"]), e = v.ex[k];
        if (!e || e[0] === "-") { k = "past"; e = v.ex.past; }
        var target = k === "past" ? v.past : k === "cont" ? v.ing : (new RegExp("\\b" + v.s + "\\b").test(e[0]) ? v.s : v.base);
        var re = new RegExp("\\b" + target.replace(/ /g, "\\s") + "\\b");
        if (!re.test(e[0])) return;
        var forms = [v.base, v.s, v.past, v.ing].filter(function (f, i, a) { return a.indexOf(f) === i; });
        if (forms.length < 3) return;
        out.push({v: v, k: k, text: e[0].replace(re, "_____"), full: e[0], ar: e[1], right: target, opts: shuffle(forms)});
      });
      return out;
    },
    build: function (only) {
      var src = [];
      SENT.forEach(function (g) {
        if (g.id === "grammar" || (only && g.id !== only)) return;
        g.s.forEach(function (s) { src.push(s); });
      });
      if (!only) V.forEach(function (v) { ["now", "past", "cont"].forEach(function (k) { if (v.ex[k][0] !== "-") src.push(v.ex[k]); }); });
      src = src.filter(function (s) { var n = s[0].split(" ").length; return n >= 3 && n <= 8; });
      return shuffle(src).slice(0, 10).map(function (s) {
        var words = s[0].split(" "), sh = shuffle(words.map(function (w, i) { return {w: w, i: i}; }));
        if (sh.map(function (x) { return x.w; }).join(" ") === s[0]) sh.reverse();
        return {s: s, words: words, tiles: sh, got: []};
      });
    },
    speak: function (only) { return shuffle(pool(only).filter(function (w) { return w.en.split(" ").length <= 2; })).slice(0, 8).map(function (w) { return {w: w}; }); }
  };

  function progressBar() { return '<div class="progress"><i style="width:' + Math.round(G.i / G.n * 100) + '%"></i></div>'; }
  function alive() { return G.type === "math" ? location.hash === "#mathplay" : location.hash.indexOf("#game/" + G.type) === 0; }
  function drawQ(fresh) {
    var q = G.qs[G.i], t = G.type, h = progressBar();
    if (fresh) { G.tries = 0; G.busy = false; }
    if (t === "listen") {
      h += '<div class="qbox"><div class="mascot-sm">' + pick(FRIENDS) + '</div><div class="ar hint">اسمع الكلمة واختار صورتها</div><button class="btn sun say" data-a="qsay">🔊 <span class="en">Listen again</span></button></div>' +
        '<div class="optgrid">' + q.opts.map(function (o, i) { return '<button class="opt emo" data-a="ans" data-i="' + i + '"' + (q.label ? ' style="flex-direction:column;font-size:40px"' : "") + ">" + esc(o.em) + (q.label ? '<span class="en" style="font-size:18px">' + esc(o.en) + "</span>" : "") + "</button>"; }).join("") + "</div>";
    } else if (t === "meaning") {
      h += '<div class="qbox">' + emo(q.w.em) + '<div class="w en">' + esc(q.w.en) + '</div><button class="btn sun say" data-a="qsay">🔊</button></div>' +
        '<div class="optgrid">' + q.opts.map(function (o, i) { return '<button class="opt ar" data-a="ans" data-i="' + i + '">' + esc(o.ar) + "</button>"; }).join("") + "</div>";
    } else if (t === "toen") {
      h += '<div class="qbox">' + emo(q.w.em) + '<div class="m ar">' + esc(q.w.ar) + '</div><div class="hint ar">إيه الكلمة دي بالإنجليزي؟</div></div>' +
        '<div class="optgrid">' + q.opts.map(function (o, i) { return '<button class="opt en" data-a="ans" data-i="' + i + '">' + esc(o.en) + "</button>"; }).join("") + "</div>";
    } else if (t === "spell") {
      h += '<div class="qbox">' + emo(q.w.em) + '<div class="m ar">' + esc(q.w.ar) + '</div><button class="btn sun say" data-a="qsay">🔊</button>' +
        '<div class="slots">' + q.w.en.split("").map(function (ch, i) {
          if (ch === " ") return '<span class="slot sp"></span>';
          var idx = q.w.en.slice(0, i).replace(/ /g, "").length;
          return '<span class="slot' + (q.got[idx] != null ? " f" : "") + '">' + (q.got[idx] != null ? esc(q.tiles[q.got[idx]]) : "") + "</span>";
        }).join("") + '</div></div><div class="letters">' + q.tiles.map(function (l, i) {
          return '<button class="letter' + (q.got.indexOf(i) >= 0 ? " used" : "") + '" data-a="letter" data-i="' + i + '">' + esc(l) + "</button>";
        }).join("") + '</div><div class="row" style="justify-content:center;margin-top:14px"><button class="btn white" data-a="undo">⌫ <span class="ar">امسح</span></button><button class="btn white" data-a="hint">💡 <span class="ar">مساعدة</span></button></div>';
    } else if (t === "past") {
      h += '<div class="qbox">' + emo(q.v.em) + '<div class="w en">' + esc(q.v.base) + '</div><div class="m ar">' + esc(q.v.ar) + '</div><div class="hint ar">إيه الماضي بتاعها؟ (Yesterday I …)</div></div>' +
        '<div class="optgrid">' + q.opts.map(function (o, i) { return '<button class="opt en" data-a="ans" data-i="' + i + '">' + esc(o) + "</button>"; }).join("") + "</div>";
    } else if (t === "tense") {
      var tn = TENSES.filter(function (x) { return x.k === q.k; })[0];
      h += '<div class="qbox">' + emo(q.v.em) + '<div class="en" style="font-size:26px;font-weight:600;margin:8px 0">' + esc(q.text) + '</div><div class="hint ar">' + esc(q.ar) + '</div><div class="hint ar" style="color:var(--brand2);font-weight:700">' + esc(tn.ar) + "</div></div>" +
        '<div class="optgrid">' + q.opts.map(function (o, i) { return '<button class="opt en" data-a="ans" data-i="' + i + '">' + esc(o) + "</button>"; }).join("") + "</div>";
    } else if (t === "build") {
      h += '<div class="qbox"><div class="m ar">' + esc(q.s[1]) + '</div><div class="hint ar">رتّب الكلمات عشان تعمل الجملة دي بالإنجليزي</div>' +
        '<div class="answerline wordchips">' + q.got.map(function (ti, k) { return '<button class="wchip ans" data-a="unword" data-k="' + k + '">' + esc(q.tiles[ti].w) + "</button>"; }).join("") + "</div></div>" +
        '<div class="wordchips">' + q.tiles.map(function (tl, i) { return q.got.indexOf(i) >= 0 ? "" : '<button class="wchip" data-a="word" data-i="' + i + '">' + esc(tl.w) + "</button>"; }).join("") + "</div>" +
        '<div class="row" style="justify-content:center;margin-top:16px"><button class="btn white" data-a="hint">💡 <span class="ar">اسمعها</span></button></div>';
    } else if (t === "speak") {
      var ok = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      h += '<div class="qbox">' + emo(q.w.em) + '<div class="w en">' + esc(q.w.en) + '</div><div class="m ar">' + esc(q.w.ar) + "</div>" +
        '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn sun" data-a="qsay">🔊 <span class="en">Listen</span></button>' +
        (ok ? '<button class="btn pink" data-a="rec" id="recb">🎤 <span class="ar">اضغط واتكلم</span></button>' : "") + "</div>" +
        '<div class="hint ar" id="heard">' + (ok ? "اسمع الكلمة، وبعدين اضغط 🎤 وقولها" : "الموبايل ده مش بيدعم سماع الصوت، قولها بصوت عالي واضغط التالي") + "</div></div>" +
        '<div class="row" style="justify-content:center"><button class="btn white" data-a="skip"><span class="ar">التالي</span> ⬅️</button></div>';
    }
    app.innerHTML = '<div class="q">' + h + "</div>";
    if (fresh && (t === "listen" || t === "meaning" || t === "spell" || t === "speak")) setTimeout(function () { if (alive()) qsay(); }, 300);
  }
  function qsay() {
    var q = G.qs[G.i]; if (!q) return Promise.resolve();
    hush();
    if (q.w) return say(q.w.en);
    if (q.v && G.type === "past") return say(q.v.base);
    return Promise.resolve();
  }
  A.qsay = function () { qsay(); };
  A.ans = function (el, d) {
    if (G.busy) return;
    var q = G.qs[G.i], i = +d.i, right;
    if (G.type === "past" || G.type === "tense") right = q.opts[i] === q.right;
    else right = q.opts[i] === q.w;
    var btns = app.querySelectorAll(".opt");
    if (right) {
      G.busy = true; el.classList.add("right");
      if (G.tries === 0) G.score++;
      var after = G.type === "tense" ? say(q.full) : G.type === "past" ? say(q.v.base + ", " + q.v.past) : G.type === "toen" ? say(q.w.en) : Promise.resolve();
      (G.tries === 0 ? good() : (SFX.good(), Promise.resolve())).then(function () { return after; }).then(function () { nextQ(); });
    } else {
      G.tries++; el.classList.add("wrong"); bad();
      if (G.tries >= 2) {
        G.busy = true;
        btns.forEach(function (b, k) { var o = q.opts[k]; if (G.type === "past" || G.type === "tense" ? o === q.right : o === q.w) b.classList.add("right"); });
        var t = G.type === "tense" ? q.full : G.type === "past" ? q.v.base + ", " + q.v.past : q.w.en;
        wait(500).then(function () { return say(t); }).then(function () { return wait(600); }).then(nextQ);
      }
    }
  };
  function nextQ() {
    if (!alive()) return;
    G.i++;
    if (G.i >= G.n) return finish();
    drawQ(true);
  }
  A.skip = function () { nextQ(); };

  /* spelling */
  A.letter = function (el, d) {
    var q = G.qs[G.i], i = +d.i;
    if (G.busy || q.got.indexOf(i) >= 0) return;
    var need = q.w.en.replace(/ /g, "");
    var pos = q.got.length;
    if (q.tiles[i] === need[pos]) {
      SFX.tap(); q.got.push(i); say(q.tiles[i], null, 1);
      if (q.got.length === need.length) {
        G.busy = true; drawQ(); G.busy = true;
        if (G.tries === 0) G.score++;
        (G.tries === 0 ? good(false) : Promise.resolve()).then(function () { return say(q.w.en); }).then(function () { return wait(500); }).then(nextQ);
        return;
      }
      drawQ();
    } else { G.tries++; el.classList.add("wrong"); bad(); setTimeout(function () { el.classList.remove("wrong"); }, 450); }
  };
  A.undo = function () { var q = G.qs[G.i]; if (G.busy || !q.got) return; q.got.pop(); drawQ(); };
  A.hint = function () {
    var q = G.qs[G.i];
    if (G.type === "build") { G.tries = 1; say(q.s[0]); return; }
    if (G.busy) return;
    var need = q.w.en.replace(/ /g, ""), pos = q.got.length;
    for (var i = 0; i < q.tiles.length; i++) if (q.got.indexOf(i) < 0 && q.tiles[i] === need[pos]) { G.tries = 1; var el = app.querySelector('.letter[data-i="' + i + '"]'); A.letter(el, {i: i}); G.tries = 1; return; }
  };

  /* sentence builder */
  A.word = function (el, d) {
    var q = G.qs[G.i]; if (G.busy) return;
    SFX.tap(); q.got.push(+d.i); say(q.tiles[+d.i].w.replace(/[^\w']/g, ""), null, 1);
    if (q.got.length === q.tiles.length) {
      var made = q.got.map(function (ti) { return q.tiles[ti].w; }).join(" ");
      drawQ();
      if (made === q.s[0]) {
        G.busy = true; if (G.tries === 0) G.score++;
        (G.tries === 0 ? good(false) : (SFX.good(), Promise.resolve())).then(function () { return say(q.s[0]); }).then(function () { return wait(500); }).then(nextQ);
      } else {
        G.tries++; bad();
        var line = $(".answerline"); if (line) line.classList.add("wrong");
        setTimeout(function () { q.got = []; drawQ(); if (G.tries >= 3) { say(q.s[0]); } }, 900);
      }
      return;
    }
    drawQ();
  };
  A.unword = function (el, d) { var q = G.qs[G.i]; if (G.busy) return; q.got.splice(+d.k, 1); drawQ(); };

  /* memory */
  function drawMemory() {
    var cards = [];
    G.qs.forEach(function (w, i) { cards.push({p: i, face: w.em, emo: true}); cards.push({p: i, face: w.en, emo: false}); });
    G.cards = shuffle(cards); G.open = []; G.moves = 0; G.found = 0;
    app.innerHTML = '<p class="note ar" style="text-align:center">اقلب كارتين: الصورة مع كلمتها 🃏</p><div class="memory">' + G.cards.map(function (c, i) {
      return '<button class="mcard" data-a="flip" data-i="' + i + '"><div class="fl"><div class="fa">❓</div><div class="ba' + (c.emo ? " emo" : " en") + '">' + esc(c.face) + "</div></div></button>";
    }).join("") + '</div><p class="note ar" style="text-align:center;margin-top:14px" id="moves">المحاولات: 0</p>';
  }
  A.flip = function (el, d) {
    var i = +d.i, c = G.cards[i];
    if (G.busy || c.done || G.open.indexOf(i) >= 0) return;
    el.classList.add("open"); G.open.push(i);
    var w = G.qs[c.p]; say(w.en, null, 1);
    if (G.open.length < 2) return;
    G.moves++; $("#moves").textContent = "المحاولات: " + G.moves;
    var a = G.cards[G.open[0]], b = G.cards[G.open[1]], els = app.querySelectorAll(".mcard");
    if (a.p === b.p) {
      a.done = b.done = true; G.found++;
      els[G.open[0]].classList.add("done"); els[G.open[1]].classList.add("done"); G.open = [];
      SFX.good(); addStar(1);
      if (G.found === G.qs.length) { G.score = Math.max(0, Math.min(10, 10 - Math.max(0, G.moves - 8))); G.n = 10; G.i = 10; setTimeout(function () { if (alive()) finish(); }, 700); }
    } else {
      G.busy = true;
      setTimeout(function () { els[G.open[0]].classList.remove("open"); els[G.open[1]].classList.remove("open"); G.open = []; G.busy = false; }, 1000);
    }
  };

  /* speech recognition */
  var rec = null;
  function stopRec() { if (rec) { try { rec.abort(); } catch (e) { /* ignore */ } rec = null; } }
  function norm(t) { return String(t).toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim(); }
  A.rec = function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || G.busy) return;
    hush(); stopRec();
    var q = G.qs[G.i], hd = $("#heard"), btn = $("#recb");
    rec = new SR(); rec.lang = "en-US"; rec.maxAlternatives = 5; rec.interimResults = false;
    hd.textContent = "🎧 بسمعك… قول: " + q.w.en; btn.classList.add("green");
    rec.onresult = function (e) {
      var alts = [], target = norm(q.w.en);
      for (var i = 0; i < e.results[0].length; i++) alts.push(norm(e.results[0][i].transcript));
      var hit = alts.some(function (a) { return a === target || (" " + a + " ").indexOf(" " + target + " ") >= 0 || a.replace(/ /g, "") === target.replace(/ /g, ""); });
      if (hit) { G.busy = true; if (G.tries === 0) G.score++; hd.textContent = "✅ " + alts[0]; good().then(function () { return wait(400); }).then(nextQ); }
      else {
        G.tries++; bad(); hd.textContent = "سمعت: \"" + (alts[0] || "…") + "\" — جرّب تاني";
        if (G.tries >= 3) { G.busy = true; say(q.w.en).then(function () { return wait(500); }).then(nextQ); }
      }
    };
    rec.onerror = function (e) { hd.textContent = e.error === "not-allowed" ? "لازم تسمح للبرنامج يستخدم المايك" : "مسمعتش كويس، اضغط 🎤 تاني"; };
    rec.onend = function () { btn.classList.remove("green"); rec = null; };
    try { rec.start(); } catch (e) { hd.textContent = "المايك مش شغال دلوقتي"; }
  };

  function finish() {
    var pct = G.score / G.n, stars = pct >= .9 ? 3 : pct >= .6 ? 2 : pct > 0 ? 1 : 0;
    S.played++; S.best[G.type] = Math.max(S.best[G.type] || 0, G.score); addStar(stars); save();
    SFX.win(); confetti(30);
    var big = stars === 3 ? "🏆" : stars === 2 ? "🥳" : "💪";
    var msg = stars === 3 ? ["Amazing!", "شاطر جداً!"] : stars === 2 ? ["Good job!", "برافو عليك!"] : ["Keep trying!", "كمّل وهتبقى أحسن!"];
    app.innerHTML = '<div class="result"><div class="big">' + big + '</div><h2 class="en">' + msg[0] + '</h2><div class="ar note" style="font-size:20px">' + msg[1] + "</div>" +
      '<div class="st">' + [0, 1, 2].map(function (k) { return "<i>" + (k < stars ? "⭐" : "☆") + "</i>"; }).join("") + "</div>" +
      '<div class="ar" style="font-size:22px;margin-bottom:18px">' + G.score + " من " + G.n + "</div>" +
      '<div class="row" style="justify-content:center"><button class="btn green" data-a="again">🔄 <span class="ar">العب تاني</span></button><button class="btn white" data-a="go" data-h="' + (G.type === "math" ? "#math" : "#games") + '">🎮 <span class="ar">' + (G.type === "math" ? "الرياضيات" : "ألعاب تانية") + "</span></button></div></div>";
    if (G.type === "math" && G.wrong.length) {
      app.querySelector(".result").insertAdjacentHTML("beforeend", '<div class="setbox" style="margin-top:18px;text-align:start"><h3 class="ar">📝 راجع المسائل اللي غلطت فيها</h3>' +
        G.wrong.map(function (q) { return '<div class="trow">' + eqText(q) + "</div>"; }).join("") + "</div>");
    }
    if (G.type !== "math") say(msg[0]);
  }
  A.again = function () { if (G.type === "math") R.mathplay(); else R.game(G.type, G.only); };

  /* ---------- math: silent, multiple choice, shows right / wrong after each pick ---------- */
  var OPS = {"+": {ar: "جمع"}, "-": {ar: "طرح"}, "×": {ar: "ضرب"}, "÷": {ar: "قسمة"}};
  var PRESETS = [[1, 1], [2, 1], [2, 2], [3, 1], [3, 2], [3, 3], [4, 1], [4, 2], [4, 3]];
  R.math = function () {
    head("Math", "الرياضيات", true);
    var M = S.math;
    function chip(a, v, on, label) { return '<button class="chip' + (on ? " on" : "") + '" data-a="' + a + '" data-v="' + v + '">' + label + "</button>"; }
    app.innerHTML =
      '<div class="setbox"><h3 class="ar">1️⃣ اختار العملية (ممكن أكتر من واحدة)</h3><div class="seg">' +
      Object.keys(OPS).map(function (k) { return chip("mop", k, M.ops.indexOf(k) >= 0, '<b class="en" style="font-size:22px">' + k + '</b> <span class="ar">' + OPS[k].ar + "</span>"); }).join("") + "</div></div>" +
      '<div class="setbox"><h3 class="ar">2️⃣ حجم الأرقام: الرقم الأول و الرقم التاني</h3><div class="seg">' +
      PRESETS.map(function (p) { return chip("mpre", p[0] + "," + p[1], M.a === p[0] && M.b === p[1], '<span class="ar">' + digName(p[0]) + " و " + digName(p[1]) + "</span>"); }).join("") +
      '</div><p class="note ar" style="margin-top:10px">مثال: <b class="en">' + sample(M.a) + " " + (M.ops[0] || "+") + " " + sample(M.b) + "</b></p></div>" +
      '<div class="setbox"><h3 class="ar">3️⃣ عدد المسائل</h3><div class="seg">' +
      [5, 10, 15, 20].map(function (n) { return chip("mn", n, M.n === n, n + ' <span class="ar">مسألة</span>'); }).join("") + "</div></div>" +
      '<button class="btn green big" data-a="mstart">🚀 <span class="ar">ابدأ المسائل</span></button>' +
      '<h2 class="sec">✖️ <span class="ar">جدول الضرب</span></h2><p class="note ar">اختار الجدول تذاكره، وبعدين اختبر نفسك فيه.</p>' +
      '<div class="tbl" style="grid-template-columns:repeat(4,1fr)">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (n) { return '<button data-a="go" data-h="#tables/' + n + '"><b>' + n + "</b></button>"; }).join("") + "</div>";
  };
  function digName(d) { return ["", "رقم", "رقمين", "3 أرقام", "4 أرقام"][d]; }
  function sample(d) { return d === 1 ? "7" : d === 2 ? "45" : d === 3 ? "362" : "2418"; }
  A.mop = function (el, d) { var o = S.math.ops, i = o.indexOf(d.v); if (i >= 0) { if (o.length > 1) o.splice(i, 1); } else o.push(d.v); save(); SFX.tap(); R.math(); };
  A.mpre = function (el, d) { var p = d.v.split(","); S.math.a = +p[0]; S.math.b = +p[1]; save(); SFX.tap(); R.math(); };
  A.mn = function (el, d) { S.math.n = +d.v; save(); SFX.tap(); R.math(); };
  A.mstart = function () { S.math.table = 0; save(); go("#mathplay"); };

  R.tables = function (n) {
    n = +n || 2;
    head("Table of " + n, "جدول ضرب " + n, true);
    var rows = [];
    for (var k = 1; k <= 12; k++) rows.push('<div class="trow">' + n + " × " + k + " = <b>" + n * k + "</b></div>");
    app.innerHTML = '<div class="tbl">' + rows.join("") + "</div>";
    pbar('<button class="btn green" data-a="mtable" data-v="' + n + '">🎯 <span class="ar">اختبرني في جدول ' + n + "</span></button>");
  };
  A.mtable = function (el, d) { S.math.table = +d.v; save(); go("#mathplay"); };

  function num(d) { return d === 1 ? rnd(1, 9) : rnd(Math.pow(10, d - 1), Math.pow(10, d) - 1); }
  function makeMath() {
    var M = S.math, op = M.table ? "×" : pick(M.ops), a, b, ans;
    if (M.table) { a = M.table; b = rnd(1, 12); if (Math.random() < .5) { var t = a; a = b; b = t; } }
    else if (op === "÷") {
      /* always divides exactly, the dividend keeps the chosen number of digits */
      b = M.b === 1 ? rnd(2, 9) : num(M.b);
      var lo = M.a === 1 ? 1 : Math.ceil(Math.pow(10, M.a - 1) / b), hi = Math.floor((Math.pow(10, M.a) - 1) / b);
      var q = hi >= Math.max(lo, 1) ? rnd(Math.max(lo, 1), hi) : rnd(2, 9);
      a = b * q;
    } else { a = num(M.a); b = num(M.b); }
    if (op === "-" && b > a) { var s = a; a = b; b = s; }
    ans = op === "+" ? a + b : op === "-" ? a - b : op === "×" ? a * b : a / b;
    var opts = [ans];
    var near = [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, ans - 2, ans + b, ans - b, +String(ans).split("").reverse().join("")];
    shuffle(near).forEach(function (x) { if (opts.length < 4 && x >= 0 && opts.indexOf(x) < 0) opts.push(x); });
    while (opts.length < 4) { var r = ans + rnd(3, 20); if (opts.indexOf(r) < 0) opts.push(r); }
    return {a: a, b: b, op: op, ans: ans, opts: shuffle(opts)};
  }
  R.mathplay = function () {
    var M = S.math;
    head(M.table ? "Table of " + M.table : "Math Quiz", M.table ? "اختبار جدول " + M.table : M.ops.map(function (o) { return OPS[o].ar; }).join(" + "), true);
    G = {run: G.run + 1, type: "math", i: 0, score: 0, n: M.n, qs: [], wrong: [], busy: false};
    for (var i = 0; i < G.n; i++) G.qs.push(makeMath());
    drawMath();
  };
  function eqText(q) { return q.a + " " + q.op + " " + q.b + " = " + q.ans; }
  function drawMath() {
    var q = G.qs[G.i];
    G.busy = false;
    var body;
    if (q.op === "÷") body = '<div class="hz">' + q.a + '<span class="opr">÷</span>' + q.b + ' <span class="opr">=</span><span class="res" id="mres">?</span></div>';
    else body = '<div class="col"><div>' + q.a + '</div><div><span class="opr">' + q.op + "</span>" + q.b + '</div><div class="bar"></div><div class="res" id="mres">?</div></div>';
    var wrongN = G.wrong.length, rightN = G.i - wrongN;
    app.innerHTML = '<div class="q">' + progressBar() +
      '<div class="mathq"><div class="row" style="justify-content:space-between"><span class="mascot-sm" style="font-size:40px">' + pick(FRIENDS) + "</span>" +
      '<span class="score"><span class="ok">✅ ' + rightN + '</span><span class="no">❌ ' + wrongN + '</span><span class="ar">مسألة ' + (G.i + 1) + " من " + G.n + "</span></span></div>" + body + "</div>" +
      '<div class="optgrid">' + q.opts.map(function (o, i) { return '<button class="opt en" style="font-size:32px" data-a="mans" data-i="' + i + '">' + o + "</button>"; }).join("") + "</div>" +
      '<div id="mverdict"></div></div>';
  }
  A.mans = function (el, d) {
    if (G.busy) return;
    G.busy = true;
    var q = G.qs[G.i], ok = q.opts[+d.i] === q.ans;
    app.querySelectorAll(".opt").forEach(function (b, k) { b.disabled = true; if (q.opts[k] === q.ans) b.classList.add("right"); });
    var r = $("#mres"); r.textContent = q.ans; r.style.color = ok ? "var(--ok)" : "var(--bad)";
    var v = $("#mverdict"), last = G.i >= G.n - 1;
    var nextBtn = '<button class="btn ' + (ok ? "green" : "pink") + ' big" data-a="mnext">' + (last ? '🏁 <span class="ar">شوف النتيجة</span>' : '<span class="ar">المسألة اللي بعدها</span> ⬅️') + "</button>";
    if (ok) {
      G.score++; SFX.good(); confetti(10); addStar(1);
      v.innerHTML = '<div class="verdict good"><b class="ar">✅ صح! برافو عليك</b><span class="en">' + eqText(q) + "</span></div>" + nextBtn;
    } else {
      el.classList.add("wrong"); SFX.bad(); G.wrong.push(q);
      v.innerHTML = '<div class="verdict bad"><b class="ar">❌ غلط، إنت اخترت ' + q.opts[+d.i] + '</b><span class="ar">الإجابة الصح:</span> <span class="en">' + eqText(q) + "</span></div>" + nextBtn;
    }
    v.scrollIntoView({behavior: "smooth", block: "nearest"});
  };
  A.mnext = function () {
    if (!alive()) return;
    G.i++; if (G.i >= G.n) finish(); else drawMath();
  };

  /* ---------- my stars ---------- */
  var STICKERS = ["🐶", "🐱", "🦁", "🐼", "🦄", "🐬", "🦖", "🚀", "🏎️", "⚽", "🏆", "🎸", "🍕", "🍦", "🌈", "🦋", "🐙", "🦊", "🐸", "🐧", "🐯", "🐨", "🚁", "🛸", "🎡", "🎢", "🧸", "🎁", "👑", "💎", "🌟", "🐉"];
  var PER = 15;
  R.me = function () {
    head("My Stars", "نجومي وملصقاتي", true);
    var learned = Object.keys(S.learned).length, have = Math.floor(S.stars / PER);
    app.innerHTML = '<div class="bigcard" style="min-height:0"><div class="em">⭐</div><div class="w en">' + S.stars + '</div><div class="m ar">نجمة جمعتها</div>' +
      '<div class="ar note" style="margin:6px 0 0">كل ' + PER + " نجمة = ملصق جديد 🎁 · فاضلك " + (PER - S.stars % PER) + " نجمة</div></div>" +
      '<div class="row" style="justify-content:center;gap:24px;margin-bottom:16px"><div class="ar" style="text-align:center"><b style="font-size:28px" class="en">' + learned + '</b><br>كلمة سمعتها</div><div class="ar" style="text-align:center"><b style="font-size:28px" class="en">' + S.played + "</b><br>لعبة لعبتها</div></div>" +
      '<div class="stickers">' + STICKERS.map(function (s, i) { return '<div class="sticker' + (i < have ? "" : " lock") + '">' + (i < have ? s : "🔒") + "</div>"; }).join("") + "</div>";
  };

  /* ---------- settings ---------- */
  R.settings = function () {
    head("Settings", "الإعدادات", true);
    function chips(name, vals, curv, fmt) { return '<div class="seg">' + vals.map(function (v) { return '<button class="chip' + (String(v) === String(curv) ? " on" : "") + '" data-a="sopt" data-n="' + name + '" data-v="' + v + '">' + fmt(v) + "</button>"; }).join("") + "</div>"; }
    function tog(name, label, desc) { return '<div class="set"><div class="switch"><div><div class="lb ar">' + label + '</div><div class="ds ar">' + desc + '</div></div><button class="tog' + (S[name] ? " on" : "") + '" data-a="stog" data-n="' + name + '" aria-label="' + label + '"></button></div></div>'; }
    app.innerHTML = '<div class="setbox">' +
      '<div class="set"><div class="lb ar">👦 اسم البطل</div><input type="text" id="nm" maxlength="20" placeholder="Name" value="' + esc(S.name) + '" dir="ltr"></div>' +
      '<div class="set"><div class="lb ar">🗣️ صوت المعلّمة</div><div class="ds ar">أصوات متسجلة بنطق صحيح وواضح</div>' +
      '<div class="seg"><button class="chip' + (S.voiceSet !== "en2" ? " on" : "") + '" data-a="svoice" data-v="en1">🇺🇸 <span class="en">Emma</span> <span class="ar">أمريكي</span></button>' +
      '<button class="chip' + (S.voiceSet === "en2" ? " on" : "") + '" data-a="svoice" data-v="en2">🇬🇧 <span class="en">Sonia</span> <span class="ar">بريطاني</span></button></div>' +
      '<button class="btn sun" style="margin-top:8px" data-a="stest">🔊 <span class="en">Test: Hello! How are you?</span></button></div>' +
      '<div class="set"><div class="lb ar">📥 الأصوات من غير نت</div><div class="ds ar">نزّل كل التسجيلات مرة واحدة (حوالي 20 ميجا) عشان البرنامج يتكلم حتى لو مفيش نت</div>' +
      '<button class="btn white" style="margin-top:6px" data-a="sdl" id="dlb">📥 <span class="ar">نزّل الأصوات</span></button></div>' +
      '<div class="set"><div class="lb ar">🐢 سرعة الكلام</div>' + chips("rate", [0.65, 0.75, 0.85, 1], S.rate, function (v) { return {0.65: "بطيء", 0.75: "هادي", 0.85: "متوسط", 1: "عادي"}[v]; }) + "</div>" +
      '<div class="set"><div class="lb ar">🔁 عدد مرات تكرار النطق</div><div class="ds ar">الكلمة أو الجملة تتقري كام مرة قبل ما ينقل</div>' + chips("reps", [1, 2, 3, 4, 5], S.reps, function (v) { return v + " مرة"; }) + "</div>" +
      '<div class="set"><div class="lb ar">🎤 وقت الترديد بعد كل مرة</div><div class="ds ar">ثواني يسكت فيها عشان الطفل يقول ورا الصوت</div>' + chips("gap", [0, 2, 3, 5, 8], S.gap, function (v) { return v ? v + " ثواني" : "من غير"; }) + "</div>" +
      tog("auto", "⏩ ينقل للي بعده تلقائي", "لو مقفول: بيقف بعد كل كلمة لحد ما تضغط التالي") +
      tog("ar", "🇸🇦 يقرا الترجمة العربي كمان", "مرة واحدة بعد الإنجليزي") +
      tog("sfx", "🎵 أصوات الألعاب", "صوت الإجابة الصح والغلط") +
      '</div><button class="btn white big" data-a="sreset">🗑️ <span class="ar">ابدأ من الأول (يمسح النجوم)</span></button>';
    var nm = $("#nm"); nm.addEventListener("input", function () { S.name = nm.value.trim(); save(); });
  };
  A.sopt = function (el, d) { S[d.n] = parseFloat(d.v); save(); SFX.tap(); var y = window.scrollY; R.settings(); window.scrollTo(0, y); if (d.n === "rate") say("This is my speed."); };
  A.stog = function (el, d) { S[d.n] = !S[d.n]; save(); el.classList.toggle("on", S[d.n]); SFX.tap(); };
  A.svoice = function (el, d) { S.voiceSet = d.v; save(); var y = window.scrollY; R.settings(); window.scrollTo(0, y); hush(); say("Hello! I am your new voice."); };
  A.sdl = async function (el) {
    if (!IDX || el.disabled) return;
    el.disabled = true;
    var urls = [], en = S.voiceSet === "en2" ? "en2" : "en1";
    Object.keys(IDX.en).forEach(function (k) { urls.push("audio/" + en + "/" + IDX.en[k] + ".mp3"); });
    if (S.ar) Object.keys(IDX.ar).forEach(function (k) { urls.push("audio/ar/" + IDX.ar[k] + ".mp3"); });
    var c = await caches.open("kids-audio"), done = 0, i = 0;
    async function worker() {
      while (i < urls.length) {
        var u = urls[i++];
        try { if (!(await c.match(u))) { var r = await fetch(u); if (r.ok) await c.put(u, r); } } catch (e) { /* skip, retry next time */ }
        done++; if (done % 20 === 0 || done === urls.length) el.innerHTML = "📥 " + Math.round(done / urls.length * 100) + "%";
      }
    }
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    el.innerHTML = '✅ <span class="ar">الأصوات متنزّلة</span>';
  };
  A.stest = function () { hush(); say("Hello! How are you?").then(function () { if (S.ar) return say("مرحباً، كيف حالك؟", "ar"); }); };
  A.sreset = function () {
    if (!confirm("أمسح النجوم والنتايج؟")) return;
    S.stars = 0; S.played = 0; S.best = {}; S.learned = {}; save(); R.settings();
  };

  /* ---------- start ---------- */
  /* updates: the app may stay open in the background for days, so check the live version
     on every start and every time it comes back to the screen, then reload into it */
  var reloading = false;
  function checkUpdate() {
    fetch("version.txt?t=" + Date.now(), {cache: "no-store"}).then(function (r) { return r.ok ? r.text() : ""; }).then(function (v) {
      v = v.trim();
      if (!v || v === APP_V || reloading) return;
      try { if (sessionStorage.getItem("tried-v") === v) return; sessionStorage.setItem("tried-v", v); } catch (e) { /* no session storage */ }
      reloading = true;
      var go = function () { location.replace(location.pathname + "?v=" + v + location.hash); };
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (reg) { return reg && reg.update(); }).catch(function () {}).then(function () { setTimeout(go, 600); });
      } else go();
    }).catch(function () { /* offline */ });
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js", {updateViaCache: "none"}).catch(function () { /* offline cache unavailable */ });
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") checkUpdate(); });
  setTimeout(checkUpdate, 1500);
  route();
})();
