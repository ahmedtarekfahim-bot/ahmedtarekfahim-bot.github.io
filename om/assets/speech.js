/* القراءة بالصوت (لهجة مصرية)
   المحركات (الصوت اللي مختاره = "محرك:صوت"):
   - openai / gemini: صوت ذكاء اصطناعي طبيعي بالعامية المصرية (محتاج مفتاح من الإعدادات)، وبيتحفظ كاش
   - edge: صوت Microsoft Neural مصري (سلمى/شاكر) جوه برنامج الكمبيوتر بس
   - device: صوت الجهاز نفسه (speechSynthesis)، ومعاه تشكيل للكلمات العامية عشان ماتتقريش فصحى */
/* تشكيل الكلمات العامية الشائعة للأصوات العادية (Microsoft وصوت الجهاز) */
const EGY = {
  "دلوقتي": "دِلْوَقْتِي", "عشان": "عَشَان", "علشان": "عَلَشَان", "ازاي": "إِزَّاي", "إزاي": "إِزَّاي", "كده": "كِدَه", "كدا": "كِدَه", "ليه": "لِيه", "إيه": "إِيه", "ايه": "إِيه",
  "فين": "فِين", "امتى": "إِمْتَى", "إمتى": "إِمْتَى", "مين": "مِين", "بتاع": "بِتَاع", "بتاعة": "بِتَاعِة", "بتاعه": "بِتَاعُه", "بتوع": "بِتُوع", "اللي": "إِلِّي", "هو": "هُوَّ", "هي": "هِيَّ",
  "احنا": "إِحْنَا", "إحنا": "إِحْنَا", "انت": "إِنْتَ", "إنت": "إِنْتَ", "انتو": "إِنْتُو", "مش": "مِش", "كمان": "كَمَان", "برضه": "بَرْضُه", "برضو": "بَرْضُه", "يعني": "يَعْنِي",
  "خلي": "خَلِّي", "خليك": "خَلِّيك", "خلّي": "خَلِّي", "شوية": "شْوَيَّة", "شويه": "شْوَيَّة", "حاجة": "حَاجَة", "حاجه": "حَاجَة", "حاجات": "حَاجَات", "كتير": "كْتِير", "دي": "دِي",
  "ده": "دَه", "دول": "دُول", "عايز": "عَايِز", "عاوز": "عَاوِز", "عايزين": "عَايْزِين", "لازم": "لَازِم", "تقدر": "تِقْدَر", "بيشتغل": "بِيِشْتَغَل", "يشتغل": "يِشْتَغَل",
  "بيقرا": "بِيِقْرَا", "يبقى": "يِبْقَى", "بيبقى": "بِيِبْقَى", "بقى": "بَقَى", "خالص": "خَالِص", "أوي": "أَوِي", "اوي": "أَوِي", "هنا": "هِنَا", "هناك": "هِنَاك", "تاني": "تَانِي",
  "بس": "بَسّ", "طب": "طَبّ", "زي": "زَيّ", "معاك": "مَعَاك", "لما": "لَمَّا", "حد": "حَدّ", "بيعمل": "بِيِعْمِل", "يعمل": "يِعْمِل", "هتلاقي": "هَتْلَاقِي", "تلاقي": "تْلَاقِي",
  "اتأكد": "اتْأَكِّد", "افتكر": "افْتِكِر", "بص": "بُصّ", "شوف": "شُوف", "كويس": "كْوَيِّس", "كويسة": "كْوَيِّسَة", "وحش": "وِحِش", "جامد": "جَامِد",
  "عادي": "عَادِي", "بيحصل": "بِيِحْصَل", "يحصل": "يِحْصَل", "ماشي": "مَاشِي", "بيفصل": "بِيِفْصِل", "يفصل": "يِفْصِل", "بيسخن": "بِيِسْخَن",
  "تبص": "تِبُصّ", "تشوف": "تْشُوف", "تعمل": "تِعْمِل", "نشوف": "نْشُوف", "هنفهم": "هَنِفْهَم", "نفهم": "نِفْهَم", "تفهم": "تِفْهَم", "عارف": "عَارِف", "مفيش": "مَفِيش", "فيه": "فِيه",
  "النهارده": "النَّهَارْدَه", "امبارح": "إِمْبَارِح", "بكره": "بُكْرَة", "خد": "خُد", "حط": "حُطّ", "اعمل": "اعْمِل", "متنساش": "مَتِنْسَاش", "ماتنساش": "مَاتِنْسَاش",
};
function egy(t) { return t.replace(/[\u0600-\u06ff]+/g, (w) => EGY[w] || (w.length > 2 && w.startsWith("و") && EGY[w.slice(1)] ? "وِ" + EGY[w.slice(1)] : w)); }
"use strict";
const Speech = {
  queue: [], cur: -1, audio: new Audio(), playing: false, paused: false, cards: [], token: 0,
  inApp() { return !!(window.pywebview && pywebview.api && pywebview.api.tts); },
  /* الأصوات المتاحة على الجهاز ده: [قيمة، اسم] */
  engines() {
    const c = AI.cfg(), out = [];
    if (c.okey) AI.OVOICES.forEach(([v, n]) => out.push(["openai:" + v, "🤖 ChatGPT · " + n]));
    if (c.gkey) {
      (Store.data.gEgy || []).forEach(([v, n]) => out.push(["gemini:" + v, "🇪🇬 Gemini · " + n]));
      AI.GVOICES.forEach(([v, n]) => out.push(["gemini:" + v, "✨ Gemini · " + n]));
    }
    if (this.inApp()) out.push(["edge:ar-EG-SalmaNeural", "🎙️ سلمى (Microsoft مصري)"], ["edge:ar-EG-ShakirNeural", "🎙️ شاكر (Microsoft مصري)"]);
    out.push(["device", "📱 صوت الجهاز"]);
    return out;
  },
  prefs() {
    const p = Object.assign({ voice: "", rate: 0 }, Store.data.tts || {});
    if (/^ar-EG-/.test(p.voice)) p.voice = "edge:" + p.voice; // إعداد قديم
    const list = this.engines();
    if (!list.some(([v]) => v === p.voice)) p.voice = list[0][0];
    return p;
  },
  resetBar() { const b = $("#ttsBar"); if (b) { const show = !b.hidden; b.remove(); if (show) this.bar(true); } },
  /* يقرا جملة لوحدها (التعريفات وتجربة الصوت) */
  sayText(t) { const d = document.createElement("div"); d.dataset.say = t; this.playCards([d]); },
  _pend: {},
  /* بيرجّع رابط الصوت للجملة (ومايطلبهاش مرتين لو اتطلبت للتجهيز المسبق) */
  synth(t, voice, rate) {
    const k = voice + "|" + rate + "|" + t;
    if (this._pend[k]) return this._pend[k];
    const [eng, v] = voice.split(":");
    const job = (async () => {
      if (eng === "edge") {
        const r = await pywebview.api.tts(egy(t), v, rate);
        if (!r || !r.ok) throw new Error((r && r.err) || "edge-tts");
        return "data:audio/mpeg;base64," + r.b64;
      }
      const a = await AI.tts(t, eng, v, rate);
      return "data:" + a.type + ";base64," + a.b64;
    })();
    this._pend[k] = job;
    job.catch(() => {}).finally(() => setTimeout(() => delete this._pend[k], 60000));
    return job;
  },
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
    this.cur = start - 1; this.playing = true; this.failed = null; this.bar(true); this.next();
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
    // لو الصوت المختار فشل قبل كده في نفس القراية بنكمّل بالبديل
    const voice = this.failed ? (this.inApp() && !this.failed.startsWith("edge") ? "edge:ar-EG-SalmaNeural" : "device") : p.voice;
    if (voice !== "device") {
      const nx = this.queue[this.cur + 1];
      if (nx) this.synth(nx.t, voice, p.rate).catch(() => {}); // يجهّز اللي بعده في الخلفية
      let src = null, err = "";
      try { src = await this.synth(it.t, voice, p.rate); } catch (e) { err = e.message || String(e); }
      if (my !== this.token) return;
      if (src) {
        this.audio.src = src;
        this.audio.onended = () => { if (my === this.token) this.next(); };
        this.audio.playbackRate = voice.startsWith("edge") ? 1 : 1 + Math.max(0, p.rate) / 200;
        this.status("بيقرا " + (it.ci + 1) + " من " + this.cards.length);
        try { await this.audio.play(); } catch (e) { this.paused = true; this.bar(true); this.status("دوس ▶ عشان يبدأ الصوت"); }
        return;
      }
      toast("الصوت المختار مش شغال دلوقتي، هكمّل بالبديل: " + err.slice(0, 160));
      this.failed = voice;
      this.cur--; return this.next();
    }
    this.fallback(it.t, my);
  },
  fallback(t, my) {
    if (!("speechSynthesis" in window)) { this.status("مفيش صوت متاح"); return; }
    // على أندرويد قايمة الأصوات بترجع فاضية أول مرة، فبنقرا بلغة ar-EG ونسيب الجهاز يختار صوته العربي
    const vs = speechSynthesis.getVoices();
    const v = vs.find((x) => /ar[-_]EG/i.test(x.lang)) || vs.find((x) => /^ar/i.test(x.lang));
    const parts = this.chunks(egy(t), 220); // الجمل الطويلة بتقف لوحدها على بعض الموبايلات
    let i = 0;
    const say = () => {
      if (my !== this.token) return;
      if (i >= parts.length) return this.next();
      const u = new SpeechSynthesisUtterance(parts[i++]);
      if (v) u.voice = v;
      u.lang = v ? v.lang : "ar-EG"; u.rate = 1 + this.prefs().rate / 100;
      u.onend = say;
      u.onerror = (e) => {
        if (my !== this.token || e.error === "interrupted" || e.error === "canceled") return;
        if (/unavailable|not-allowed/.test(e.error)) this.status("مفيش صوت عربي على الجهاز: نزّل العربي من إعدادات Text-to-Speech، أو ضيف مفتاح من ⚙️ الإعدادات");
        else say();
      };
      speechSynthesis.speak(u);
    };
    this.status("بيقرا بصوت الجهاز " + (this.cur + 1) + " من " + this.queue.length);
    say();
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
        <select id="ttsVoice" title="الصوت">${this.engines().map(([v, n]) => `<option value="${esc(v)}">${esc(n)}</option>`).join("")}</select><a href="#/settings" class="small" title="أصوات أطبع من الإعدادات">⚙️</a>
        <select id="ttsRate" title="السرعة"><option value="-15">أبطأ</option><option value="0">عادي</option><option value="15">أسرع</option><option value="30">سريع جداً</option></select></div>`);
      document.body.appendChild(b);
      $("#ttsVoice").value = p.voice; $("#ttsRate").value = String(p.rate);
      $("#ttsPP").onclick = () => this.toggle(); $("#ttsStop").onclick = () => this.stop(); $("#ttsNext").onclick = () => this.skip();
      const save = () => { Store.data.tts = { voice: $("#ttsVoice").value, rate: +$("#ttsRate").value }; Store.save(); this.failed = null; };
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
