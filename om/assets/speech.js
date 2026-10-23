/* القراءة بالصوت (لهجة مصرية)
   جوه البرنامج: صوت Microsoft Neural مصري (سلمى/شاكر) عن طريق edge-tts في البايثون (محتاج نت أول مرة، وبيتخزن كاش للاستماع تاني من غير نت).
   برّه البرنامج أو من غير نت: speechSynthesis بتاع المتصفح لو فيه صوت عربي. */
"use strict";
const Speech = {
  queue: [], cur: -1, audio: new Audio(), playing: false, paused: false, cards: [], token: 0,
  prefs() { return Object.assign({ voice: "ar-EG-SalmaNeural", rate: 0 }, Store.data.tts || {}); },
  clean(node) {
    // لو الكارت ليه نص حكي مخصوص (say) بيتقري هو بدل نص الكارت
    if (node.dataset && node.dataset.say) return node.dataset.say;
    const c = node.cloneNode(true);
    c.querySelectorAll("button,.star,.readbtn,svg,.linkrow,.checker,input,select,.chips,.lvl,figure,.toolbar").forEach((x) => x.remove());
    c.querySelectorAll("li").forEach((li) => li.append("، "));
    c.querySelectorAll("h3,h4,.label,p,li,td,th,tr,summary").forEach((x) => x.append(". "));
    let t = c.textContent;
    const rep = [[/≈|~/g, " تقريباً "], [/°C|℃/g, " درجة "], [/°F/g, " فهرنهايت "], [/°/g, " درجة "], [/%/g, " في المية "], [/→|⇐|←|=>/g, "، يعني "],
      [/≤/g, " أقل من أو يساوي "], [/≥/g, " أكبر من أو يساوي "], [/</g, " أقل من "], [/>/g, " أكبر من "], [/±/g, " زائد ناقص "], [/×/g, " في "],
      [/m²|م²/g, " متر مربع "], [/m³|م³/g, " متر مكعب "], [/Δ/g, " فرق "], [/√3/g, " جذر تلاتة "],
      [/[✓✗●★💡📘📐🔎🧩🩺✅🛡🚫🔧⚠️🔊]/gu, " "], [/\s*\|\s*/g, "، "], [/\s+/g, " "], [/(\.\s*){2,}/g, ". "], [/(،\s*\.)/g, "."]];
    rep.forEach(([a, b]) => (t = t.replace(a, b)));
    return t.trim();
  },
  chunks(t, n = 900) {
    const out = []; let cur = "";
    // أول جزء قصير عشان الصوت يبدأ بسرعة، والباقي أجزاء أكبر
    t.split(/(?<=[.،؟!:])\s+/).forEach((s) => { const lim = out.length ? n : 260; if ((cur + " " + s).length > lim && cur) { out.push(cur.trim()); cur = s; } else cur += " " + s; });
    if (cur.trim()) out.push(cur.trim());
    return out;
  },
  playCards(cards, start = 0) {
    this.stop();
    this.cards = cards; this.queue = [];
    cards.forEach((c, ci) => this.chunks(this.clean(c)).forEach((t) => this.queue.push({ t, ci })));
    this.cur = start - 1; this.playing = true; this.bar(true); this.next();
  },
  async next() {
    const my = ++this.token;
    this.cur++;
    if (this.cur >= this.queue.length) return this.stop();
    const it = this.queue[this.cur];
    this.cards.forEach((c, i) => c.classList.toggle("speaking", i === it.ci));
    const card = this.cards[it.ci];
    if (card && (this.cur === 0 || this.queue[this.cur - 1].ci !== it.ci)) card.scrollIntoView({ behavior: "smooth", block: "start" });
    this.status("بيقرا " + (it.ci + 1) + " من " + this.cards.length + "…");
    const p = this.prefs();
    if (window.pywebview && pywebview.api && pywebview.api.tts) {
      const nx = this.queue[this.cur + 1];
      if (nx) pywebview.api.tts(nx.t, p.voice, p.rate); // يجهّز اللي بعده في الخلفية
      let r = null;
      try { r = await pywebview.api.tts(it.t, p.voice, p.rate); } catch (e) { r = null; }
      if (my !== this.token) return;
      if (r && r.ok) {
        this.audio.src = "data:audio/mpeg;base64," + r.b64;
        this.audio.onended = () => { if (my === this.token) this.next(); };
        this.status("بيقرا " + (it.ci + 1) + " من " + this.cards.length);
        try { await this.audio.play(); } catch (e) { }
        return;
      }
      this.status("الصوت المصري محتاج نت أول مرة، بقرا بالصوت البديل");
    }
    this.fallback(it.t, my);
  },
  fallback(t, my) {
    if (!("speechSynthesis" in window)) { this.status("مفيش صوت متاح"); return; }
    const vs = speechSynthesis.getVoices();
    const v = vs.find((x) => /ar-EG/i.test(x.lang)) || vs.find((x) => /^ar/i.test(x.lang));
    if (!v) { this.status("مفيش صوت عربي على الجهاز. الصوت المصري محتاج اتصال بالنت."); return; }
    const u = new SpeechSynthesisUtterance(t);
    u.voice = v; u.lang = v.lang; u.rate = 1 + this.prefs().rate / 100;
    u.onend = () => { if (my === this.token) this.next(); };
    speechSynthesis.speak(u);
  },
  toggle() {
    if (!this.playing) return;
    if (this.paused) { this.paused = false; if (this.audio.src && this.audio.paused) this.audio.play(); if (window.speechSynthesis) speechSynthesis.resume(); }
    else { this.paused = true; this.audio.pause(); if (window.speechSynthesis) speechSynthesis.pause(); }
    this.bar(true);
  },
  skip() {
    if (!this.playing) return;
    this.audio.pause(); if (window.speechSynthesis) speechSynthesis.cancel();
    const ci = this.queue[this.cur] ? this.queue[this.cur].ci : -1;
    let k = this.cur; while (k + 1 < this.queue.length && this.queue[k + 1].ci === ci) k++;
    this.cur = k; this.next();
  },
  stop() {
    this.token++; this.playing = false; this.paused = false; this.audio.pause();
    if (window.speechSynthesis) speechSynthesis.cancel();
    this.cards.forEach((c) => c.classList.remove("speaking")); this.bar(false);
  },
  status(t) { const s = $("#ttsStatus"); if (s) s.textContent = t; },
  bar(show) {
    let b = $("#ttsBar");
    if (!b) {
      const p = this.prefs();
      b = el(`<div id="ttsBar" class="ttsbar" hidden><button class="iconbtn" id="ttsPP" title="إيقاف مؤقت / استكمال">⏸</button><button class="iconbtn" id="ttsNext" title="الكارت اللي بعده">⏭</button><button class="iconbtn" id="ttsStop" title="إيقاف">⏹</button>
        <span id="ttsStatus" class="muted small"></span>
        <select id="ttsVoice" title="الصوت"><option value="ar-EG-SalmaNeural">🎙️ سلمى (مصري)</option><option value="ar-EG-ShakirNeural">🎙️ شاكر (مصري)</option></select>
        <select id="ttsRate" title="السرعة"><option value="-15">أبطأ</option><option value="0">عادي</option><option value="15">أسرع</option><option value="30">سريع جداً</option></select></div>`);
      document.body.appendChild(b);
      $("#ttsVoice").value = p.voice; $("#ttsRate").value = String(p.rate);
      $("#ttsPP").onclick = () => this.toggle(); $("#ttsStop").onclick = () => this.stop(); $("#ttsNext").onclick = () => this.skip();
      const save = () => { Store.data.tts = { voice: $("#ttsVoice").value, rate: +$("#ttsRate").value }; Store.save(); };
      $("#ttsVoice").onchange = save; $("#ttsRate").onchange = save;
    }
    b.hidden = !show; $("#ttsPP").textContent = this.paused ? "▶" : "⏸";
  },
  /* زرار 🔊 على كل كارت + زرار للتاب كله */
  attach(root, cardSel) {
    const cards = [...root.querySelectorAll(cardSel || ".card")].filter((c) => !c.closest(".quiz") && c.textContent.trim().length > 30);
    if (!cards.length) return;
    cards.forEach((c) => {
      const b = el(`<button class="speak" title="اسمع ده بالمصري">🔊</button>`);
      b.onclick = (e) => { e.stopPropagation(); e.preventDefault(); const vis = cards.filter((x) => x.offsetParent !== null); this.playCards(vis.slice(Math.max(0, vis.indexOf(c)))); };
      if (c.tagName === "DETAILS") c.querySelector("summary").append(b); else c.prepend(b);
    });
    const top = el(`<div class="toolbar"><button class="btn ghost speakall">🔊 اسمعني الصفحة دي بالمصري</button><span class="muted small">بيقرا الكروت ورا بعض. من الشريط اللي تحت تقدر توقف أو تعدّي أو تغيّر الصوت والسرعة.</span></div>`);
    root.prepend(top);
    top.querySelector(".speakall").onclick = () => this.playCards(cards.filter((x) => x.offsetParent !== null));
  },
};
window.addEventListener("hashchange", () => Speech.stop());
