/* المساعد الذكي: مفاتيح Gemini و OpenAI (بتتحفظ على الجهاز ده بس)
   - إجابات من النت لما البحث مايلاقيش في البرنامج
   - صوت طبيعي بالعامية المصرية (Gemini TTS أو OpenAI TTS) مع كاش عشان مايتدفعش مرتين
   - كروت تعريف للمصطلحات الملوّنة */
"use strict";
const AI = {
  DEF: { gkey: "", okey: "", provider: "auto", web: true, gText: "gemini-3.8-flash", gTts: "gemini-3.8-flash-tts", oText: "gpt-6-luna", oTts: "gpt-4o-mini-tts" },
  STYLE: "اتكلم بالعامية المصرية الطبيعية (لهجة قاهرية) زي مهندس مصري شاطر بيشرح لصاحبه في الشغل: صوت دافي وحماسي وبسيط وواضح، من غير فصحى خالص، وانطق المصطلحات الإنجليزي زي ما المهندسين المصريين بينطقوها.",
  SYS: "انت مهندس تشغيل وصيانة إلكتروميكانيكال خبير (تكييف وتبريد HVAC، كهرباء وتوزيع، مولدات، UPS وبطاريات، حريق إنذار وإطفاء، صحي وصرف، مصاعد، BMS، معدات دوارة، إدارة مرافق، وصيانة الأجهزة المنزلية). بتشرح لمهندس أو فني عايز يفهم عملي.\n" +
    "- جاوب بالعامية المصرية البسيطة، وسيب المصطلحات والاختصارات بالإنجليزي.\n- ابدأ بالإجابة المباشرة في سطرين، وبعدها التفاصيل العملية: الخطوات، القيم والأرقام الطبيعية، التحذيرات والسلامة، والكود أو الستاندرد لو ليه علاقة.\n" +
    "- التنسيق: عناوين ## وقوائم - و**تقيل** بس، والجداول بصيغة | عمود | عمود |.\n- لو مش متأكد من رقم قول كده، ومتألفش.",
  GVOICES: [["Sulafat", "سولافات (ست، صوت دافي)"], ["Kore", "كورا (ست، واثقة)"], ["Aoede", "أويدي (ست، خفيفة)"], ["Achird", "أشيرد (راجل، ودود)"], ["Charon", "شارون (راجل، شرح)"], ["Puck", "بَك (راجل، حماسي)"]],
  OVOICES: [["marin", "مارين (ست، أطبع صوت)"], ["cedar", "سيدار (راجل، أطبع صوت)"], ["coral", "كورال (ست)"], ["ash", "آش (راجل)"], ["sage", "سيج (ست هادية)"], ["verse", "ڤيرس (راجل)"]],

  /* لو الموديل المختار مزحوم (503) أو مش موجود بنجرّب اللي بعده */
  GTEXT_ALT: ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite"],
  GTTS_ALT: ["gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"],
  busy: (r) => [429, 500, 502, 503, 504].includes(r.status) && !/quota|billing|exceeded your/i.test(r.text || ""),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  /* يجرّب الطلب على الموديل المختار، ولو مزحوم يعيد مرة ويجرّب البدائل */
  async withModels(models, call) {
    const list = [...new Set(models)];
    let first = null;
    for (let i = 0; i < list.length; i++) {
      let r = await call(list[i]);
      if (!r.ok && i === 0 && this.busy(r)) { await this.sleep(1500); r = await call(list[i]); }
      if (r.ok) { r.model = list[i]; return r; }
      first = first || r;
      if (!this.busy(r) && r.status !== 404) return first; // المفتاح غلط مثلاً: مفيش داعي نكمّل
    }
    return first;
  },
  cfg() { return Object.assign({}, this.DEF, Store.data.ai || {}); },
  save(patch) { Store.data.ai = Object.assign(this.cfg(), patch); Store.save(); },
  has() { const c = this.cfg(); return !!(c.gkey || c.okey); },
  provider() {
    const c = this.cfg();
    if (c.provider === "openai" && c.okey) return "openai";
    if (c.provider === "gemini" && c.gkey) return "gemini";
    return c.gkey ? "gemini" : c.okey ? "openai" : null;
  },
  inApp() { return !!(window.pywebview && pywebview.api && pywebview.api.http); },

  /* ---------- الاتصال: جوه البرنامج عن طريق البايثون، وعلى الموبايل fetch مباشرة ---------- */
  async req(method, url, headers, body, bin) {
    if (this.inApp()) {
      try { return await pywebview.api.http(method, url, JSON.stringify(headers || {}), body ? JSON.stringify(body) : "", !!bin); }
      catch (e) { return { ok: false, status: 0, err: String(e) }; }
    }
    try {
      const res = await fetch(url, { method, headers: Object.assign({ "Content-Type": "application/json" }, headers || {}), body: body ? JSON.stringify(body) : undefined });
      const ctype = res.headers.get("content-type") || "";
      if (bin && res.ok && !/json/.test(ctype)) return { ok: true, status: res.status, b64: b64(await res.arrayBuffer()), ctype };
      return { ok: res.ok, status: res.status, text: await res.text(), ctype };
    } catch (e) { return { ok: false, status: 0, err: String(e) }; }
  },
  err(r) {
    let m = "";
    try { let j = JSON.parse(r.text); if (Array.isArray(j)) j = j[0] || {}; m = (j.error && (j.error.message || j.error)) || ""; } catch (e) { }
    if (r.status === 0) return "مقدرتش أوصل للخدمة: يا إما مفيش نت، يا إما المفتاح غلط (OpenAI بيرفض الاتصال من غير ما يقول السبب لو المفتاح غلط).";
    if (r.status === 401 || r.status === 403 || /api key not valid|invalid api key|incorrect api key/i.test(m)) return "المفتاح غلط أو مش مفعّل للخدمة دي. راجع إنك نسخته كامل. (" + m + ")";
    if (r.status === 404) return "اسم الموديل مش موجود أو اتغيّر: غيّره من الإعدادات المتقدمة. (" + m + ")";
    if (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504) return "سيرفرات الخدمة عليها ضغط دلوقتي (المفتاح سليم). جرّبت الموديلات البديلة كمان، استنى دقيقة وجرّب تاني.";
    if (r.status === 429) return "وصلت للحد المسموح (كوتة أو رصيد). استنى شوية أو راجع الحساب. " + m;
    return "خطأ " + r.status + ": " + (m || (r.text || "").slice(0, 200));
  },

  /* ---------- الإجابات ---------- */
  async ask(q, web) {
    const p = this.provider();
    if (!p) throw new Error("محتاج مفتاح Gemini أو OpenAI من الإعدادات");
    const prompt = this.SYS + "\n\nالسؤال: " + q;
    return p === "gemini" ? this.gemText(prompt, web) : this.oaText(prompt, web);
  },
  async gemText(prompt, web) {
    const c = this.cfg(), h = { "x-goog-api-key": c.gkey };
    const r = await this.withModels([c.gText, ...this.GTEXT_ALT], async (m) => {
      const r1 = await this.req("POST", "https://generativelanguage.googleapis.com/v1beta/interactions", h,
        Object.assign({ model: m, input: prompt }, web ? { tools: [{ type: "google_search" }] } : {}));
      if (r1.ok || !(r1.status === 400 || r1.status === 404)) return r1;
      // الواجهة القديمة generateContent
      const r2 = await this.req("POST", `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, h,
        Object.assign({ contents: [{ parts: [{ text: prompt }] }] }, web ? { tools: [{ google_search: {} }] } : {}));
      return r2.ok ? r2 : r1;
    });
    if (r && r.ok) return Object.assign(this.parseG(JSON.parse(r.text)), { model: r.model });
    throw new Error(this.err(r));
  },
  parseG(j) {
    let text = ""; const src = [];
    (j.steps || []).forEach((s) => { if (!s.type || s.type === "model_output") (s.content || []).forEach((c) => {
      if (c.type === "text" && c.text) { text += c.text; (c.annotations || []).forEach((a) => a.url && src.push({ url: a.url, title: a.title || a.url })); }
    }); });
    if (!text && j.output_text) text = j.output_text;
    if (!text && j.candidates) {
      const cd = j.candidates[0] || {};
      text = ((cd.content || {}).parts || []).map((p) => p.text || "").join("");
      ((cd.groundingMetadata || {}).groundingChunks || []).forEach((g) => g.web && src.push({ url: g.web.uri, title: g.web.title }));
    }
    return { text, src: uniqBy(src, "url") };
  },
  async oaText(prompt, web) {
    const c = this.cfg();
    const r = await this.req("POST", "https://api.openai.com/v1/responses", { Authorization: "Bearer " + c.okey },
      Object.assign({ model: c.oText, input: prompt }, web ? { tools: [{ type: "web_search" }] } : {}));
    if (!r.ok) throw new Error(this.err(r));
    const j = JSON.parse(r.text); let text = j.output_text || ""; const src = [];
    (j.output || []).forEach((o) => (o.content || []).forEach((c) => {
      if (c.type !== "output_text") return;
      if (!j.output_text) text += c.text || "";
      (c.annotations || []).forEach((a) => a.url && src.push({ url: a.url, title: a.title || a.url }));
    }));
    return { text, src: uniqBy(src, "url") };
  },

  /* ---------- الصوت ---------- */
  async tts(text, prov, voice, rate) {
    const key = await sha1([prov, voice, rate, text].join("|"));
    const hit = await TCache.get(key);
    if (hit) return hit;
    const c = this.cfg();
    const pace = rate > 10 ? " واتكلم أسرع شوية." : rate < 0 ? " واتكلم أبطأ شوية." : "";
    let out = null;
    if (prov === "openai") {
      const r = await this.req("POST", "https://api.openai.com/v1/audio/speech", { Authorization: "Bearer " + c.okey },
        { model: c.oTts, voice, input: text, instructions: this.STYLE + pace, response_format: "mp3" }, true);
      if (!r.ok || !r.b64) throw new Error(this.err(r));
      out = { b64: r.b64, type: "audio/mpeg" };
    } else {
      const h = { "x-goog-api-key": c.gkey };
      const r = await this.withModels([c.gTts, ...this.GTTS_ALT], async (m) => {
        const r1 = await this.req("POST", "https://generativelanguage.googleapis.com/v1beta/interactions", h, {
          model: m,
          input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: this.STYLE + pace }] }] }],
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice }] },
        });
        if (r1.ok || !(r1.status === 400 || r1.status === 404)) return r1;
        const r2 = await this.req("POST", `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, h, {
          contents: [{ parts: [{ text: this.STYLE + pace + "\n\n" + text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        });
        return r2.ok ? r2 : r1;
      });
      if (!r || !r.ok) throw new Error(this.err(r));
      const a = findAudio(JSON.parse(r.text));
      if (!a) throw new Error("Gemini مارجّعش صوت");
      out = a.b64.startsWith("UklGR") ? { b64: a.b64, type: "audio/wav" } : { b64: pcmToWav(a.b64, a.rate), type: "audio/wav" };
    }
    TCache.put(key, out);
    return out;
  },
  /* الأصوات المصرية من مكتبة Gemini (لو متاحة) */
  async egyptVoices() {
    const c = this.cfg();
    const r = await this.req("GET", "https://generativelanguage.googleapis.com/v1beta/voices?language_code=ar-EG&page_size=50", { "x-goog-api-key": c.gkey });
    if (!r.ok) throw new Error(this.err(r));
    return (JSON.parse(r.text).voices || []).map((v) => [v.id || v.name, (v.display_name || v.displayName || v.id) + (v.gender ? " · " + v.gender : "") + (v.accent ? " · " + v.accent : "")]);
  },
};

/* كاش الصوت: جوه البرنامج في فولدر الكاش، وعلى الموبايل في Cache Storage */
const TCache = {
  async get(k) {
    try {
      if (AI.inApp()) { const r = await pywebview.api.cache_get(k); return r && r.b64 ? r : null; }
      const c = await caches.open("om-tts"), m = await c.match("/tts/" + k);
      if (!m) return null;
      return { b64: b64(await m.arrayBuffer()), type: m.headers.get("content-type") || "audio/mpeg" };
    } catch (e) { return null; }
  },
  async put(k, v) {
    try {
      if (AI.inApp()) return pywebview.api.cache_put(k, v.b64, v.type);
      const c = await caches.open("om-tts");
      await c.put("/tts/" + k, new Response(unb64(v.b64), { headers: { "content-type": v.type } }));
    } catch (e) { }
  },
};

function b64(buf) { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function uniqBy(a, k) { const s = new Set(); return a.filter((x) => (s.has(x[k]) ? false : s.add(x[k]))); }
async function sha1(t) {
  try { const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(t)); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  catch (e) { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return "h" + (h >>> 0).toString(16) + t.length; }
}
/* بيدوّر على الصوت في رد Gemini أياً كان شكله */
function findAudio(o) {
  let best = null;
  (function walk(x) {
    if (!x || typeof x !== "object") return;
    const d = x.data, mt = x.mime_type || x.mimeType || "";
    if (typeof d === "string" && d.length > 200 && (!mt || /audio|l16|pcm|wav/i.test(mt))) {
      if (!best || d.length > best.b64.length) best = { b64: d, rate: +((mt.match(/rate=(\d+)/) || [])[1] || 24000) };
    }
    for (const k in x) walk(x[k]);
  })(o);
  return best;
}
function pcmToWav(b64pcm, rate = 24000) {
  const pcm = unb64(b64pcm), h = new DataView(new ArrayBuffer(44));
  const w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt "); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44);
  return b64(out.buffer);
}

/* ---------- كروت المصطلحات (الكلمات الملوّنة) ---------- */
const Terms = {
  idx: null,
  norm: (t) => String(t || "").toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9؀-ۿ]+/g, ""),
  build() {
    this.idx = new Map();
    const add = (t, src, sid) => [t[0], t[1]].forEach((k) => { const n = this.norm(k); if (n && !this.idx.has(n)) this.idx.set(n, { t, src, sid }); });
    OM.glossary.forEach((t) => add(t, "القاموس"));
    OM.systems.forEach((s) => (s.terms || []).forEach((t) => add(t, s.title, s.id)));
  },
  find(txt) {
    if (!this.idx) this.build();
    const n = this.norm(txt);
    if (this.idx.has(n)) return this.idx.get(n);
    for (const part of String(txt).split(/[\s/(),،-]+/)) { const m = this.idx.get(this.norm(part)); if (m && this.norm(part).length > 1) return m; }
    return null;
  },
  show(code) {
    this.close();
    const txt = code.textContent.trim(), f = this.find(txt);
    const sys = (location.hash.match(/#\/sys\/([^/]+)/) || [])[1];
    const ctx = sys && OM.byId[sys] ? " في " + OM.byId[sys].en : "";
    const box = el(`<div class="termpop" role="dialog"><button class="iconbtn close">✕</button>
      <b class="tp-h" dir="auto">${esc(f ? f.t[0] : txt)}</b>${f && f.t[1] && f.t[1] !== f.t[0] ? `<div class="tp-en" dir="ltr">${esc(f.t[1])}</div>` : ""}
      <div class="tp-ar">${f ? inline(f.t[2] || "") : `<span class="muted">مش موجودة في القاموس. تقدر تدوّر عليها أو تسأل المساعد.</span>`}</div>
      ${f ? `<div class="muted small">من: ${esc(f.src)}</div>` : ""}
      <div class="linkrow"><button class="linkbtn" data-a="say">🔊 اسمعها</button><button class="linkbtn" data-a="find">🔎 فين في البرنامج</button><button class="linkbtn" data-a="ai">✨ اشرحهالي</button><button class="linkbtn" data-a="yt">▶️ يوتيوب</button></div></div>`);
    document.body.appendChild(box);
    const r = code.getBoundingClientRect(), bw = Math.min(340, innerWidth - 24);
    box.style.width = bw + "px";
    box.style.left = Math.max(12, Math.min(innerWidth - bw - 12, r.left + r.width / 2 - bw / 2)) + "px";
    const below = r.bottom + 8 + box.offsetHeight < innerHeight;
    const top = below ? r.bottom + 8 : r.top - box.offsetHeight - 8;
    box.style.top = Math.max(8, Math.min(innerHeight - box.offsetHeight - 8, top)) + "px";
    box.querySelector(".close").onclick = () => this.close();
    box.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
      const a = b.dataset.a, word = f ? f.t[0] : txt;
      if (a === "say") Speech.sayText(f ? `${f.t[0]}، ${f.t[1] || ""}. ${strip(f.t[2] || "")}` : txt);
      if (a === "find") { this.close(); window.doSearch && window.doSearch(word); }
      if (a === "ai") { this.close(); location.hash = "#/ai/" + encodeURIComponent(`اشرحلي يعني إيه ${word}${f && f.t[1] ? " (" + f.t[1] + ")" : ""}${ctx} بشكل عملي، وأهميته في التشغيل والصيانة`); }
      if (a === "yt") openExt(yt(word + (f && f.t[1] ? " " + f.t[1] : "") + ctx));
    }));
  },
  close() { document.querySelectorAll(".termpop").forEach((x) => x.remove()); },
};
document.addEventListener("click", (e) => {
  const c = e.target.closest(".md code, code.term, .tablewrap code");
  if (c && !c.closest(".termpop")) { e.preventDefault(); Terms.show(c); return; }
  if (!e.target.closest(".termpop")) Terms.close();
});
window.addEventListener("hashchange", () => Terms.close());

/* ---------- صفحة المساعد ---------- */
function renderAI(main, q0) {
  const hist = Store.data.aiHist || [];
  const p = AI.provider();
  main.innerHTML = `<section class="hero"><h1>🤖 اسأل المساعد <span class="en">AI Assistant</span></h1>
    <p>اسأل أي سؤال في التشغيل والصيانة، حتى لو مش موجود في البرنامج. بيجاوب بالعامية المصرية، ولو فعّلت "دوّر في النت" بيجيب المعلومة من مصادر حقيقية ويكتب لك المصادر.</p>
    <div class="chips">${p ? `<span class="chip k">شغال بـ ${p === "gemini" ? "Gemini" : "OpenAI"}</span>` : `<span class="chip" style="border-color:var(--warn)">مفيش مفتاح: <a href="#/settings">ضيفه من الإعدادات</a></span>`}</div></section>
    <div class="pane"><div class="card aiask"><textarea id="aiq" rows="3" placeholder="مثال: الكمبروسر بيفصل على high pressure بعد ربع ساعة من التشغيل، أبدأ أدوّر فين؟"></textarea>
    <div class="toolbar"><button class="btn" id="aigo">✨ اسأل</button><label class="small"><input type="checkbox" id="aiweb" ${AI.cfg().web ? "checked" : ""}> 🌐 دوّر في النت</label>
    <span class="muted small" id="aist"></span></div>
    <div class="linkrow small"><span class="muted">أو افتح السؤال في:</span><button class="linkbtn" data-x="chatgpt">ChatGPT</button><button class="linkbtn" data-x="gemini">Gemini</button><button class="linkbtn" data-x="google">Google</button><button class="linkbtn" data-x="yt">YouTube</button></div></div>
    <div id="aiout"></div>
    ${hist.length ? `<h3 style="margin:22px 0 6px">🕘 أسئلتك اللي فاتت</h3>` + hist.map((h, i) => `<details class="card qa aih"><summary>${esc(h.q)} <span class="muted small">${esc(h.d || "")}</span></summary>${md(h.a)}${srcHTML(h.src)}<div class="linkrow"><button class="linkbtn" data-del="${i}">🗑️ امسحها</button></div></details>`).join("") : ""}</div>`;
  const q = $("#aiq"); q.value = q0 || "";
  main.querySelectorAll("[data-x]").forEach((b) => (b.onclick = () => askOutside(b.dataset.x, q.value.trim())));
  main.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { hist.splice(+b.dataset.del, 1); Store.data.aiHist = hist; Store.save(); renderAI(main, q.value); }));
  $("#aiweb").onchange = (e) => AI.save({ web: e.target.checked });
  $("#aigo").onclick = () => runAI(q.value.trim());
  q.onkeydown = (e) => { if (e.key === "Enter" && (e.ctrlKey || !e.shiftKey) && !/Android|iPhone/.test(navigator.userAgent)) { e.preventDefault(); runAI(q.value.trim()); } };
  Speech.attach(main.querySelector(".pane"), "details.aih");
  if (q0) runAI(q0);
}
function srcHTML(src) {
  return (src || []).length ? `<div class="aisrc"><span class="label">🔗 المصادر</span><ol>${src.map((s) => `<li><a href="#" data-ext="${esc(s.url)}">${esc(s.title)}</a></li>`).join("")}</ol></div>` : "";
}
function askOutside(where, q) {
  const e = encodeURIComponent(q || "");
  if (where === "chatgpt") return openExt("https://chatgpt.com/?q=" + e);
  if (where === "google") return openExt("https://www.google.com/search?q=" + e);
  if (where === "yt") return openExt(yt(q));
  try { navigator.clipboard.writeText(q); toast("السؤال اتنسخ، الصقه في Gemini"); } catch (x) { }
  openExt("https://gemini.google.com/app");
}
async function runAI(q) {
  if (!q) return;
  const out = $("#aiout"), st = $("#aist");
  if (!AI.provider()) {
    out.innerHTML = `<div class="call info"><div>عشان المساعد يجاوب جوه البرنامج محتاج مفتاح Gemini (فيه مجاني) أو OpenAI. <a href="#/settings">افتح الإعدادات</a> وهتلاقي الخطوات. ولحد ما تضيفه، دوس ChatGPT أو Gemini فوق والسؤال هيتفتح هناك.</div></div>`;
    return;
  }
  st.textContent = "بيفكر ويدوّر…"; $("#aigo").disabled = true;
  out.innerHTML = `<div class="card"><div class="spinner"></div></div>`;
  try {
    const r = await AI.ask(q, $("#aiweb").checked);
    if (!r.text) throw new Error("مفيش رد");
    out.innerHTML = `<div class="card aians"><h3>✨ ${esc(q)}</h3>${md(r.text)}${srcHTML(r.src)}<p class="muted small">إجابة ذكاء اصطناعي: راجع الأرقام المهمة مع الكتالوج أو الكود قبل التنفيذ.</p></div>`;
    Speech.attach(out, ".aians");
    const hist = Store.data.aiHist || [];
    hist.unshift({ q, a: r.text, src: r.src, d: new Date().toLocaleDateString("ar-EG") });
    Store.data.aiHist = hist.slice(0, 40); Store.save();
    st.textContent = "";
  } catch (e) {
    out.innerHTML = `<div class="call warn"><div>${esc(e.message)}</div></div>`; st.textContent = "";
  }
  $("#aigo").disabled = false;
}

/* ---------- الإعدادات ---------- */
function renderSettings(main) {
  const c = AI.cfg(), app = AI.inApp();
  main.innerHTML = `<section class="hero"><h1>⚙️ الإعدادات <span class="en">Voice &amp; AI</span></h1><p>الصوت الطبيعي بالعامية المصرية والمساعد الذكي محتاجين مفتاح (API key) من Gemini أو OpenAI. المفتاح بيتحفظ على الجهاز ده بس، ومش بيتبعت لأي مكان غير Google أو OpenAI.</p></section>
  <div class="pane">
   <div class="card"><h3>✨ Gemini (من Google)</h3>
    <p class="small">صوته بيدعم العربي المصري، وفيه حد استخدام مجاني للإجابات والبحث في النت. <b>اشتراك Gemini العادي مش هو المفتاح</b>، المفتاح بيطلع من Google AI Studio:</p>
    <ol class="small"><li>افتح <a href="#" data-ext="https://aistudio.google.com/apikey">aistudio.google.com/apikey</a> بحسابك.</li><li>دوس <b>Create API key</b> (أو افتح المفتاح الموجود) ودوس <b>Copy key</b>. المفتاح بيبدأ بـ AQ. أو AIza.</li><li>الصقه هنا ودوس "جرّب".</li></ol>
    <div class="toolbar"><input type="password" id="gkey" placeholder="AQ.… أو AIza…" value="${esc(c.gkey)}" style="flex:1" autocomplete="off"><button class="btn ghost" data-eye="gkey">👁️</button><button class="btn" id="gtest">جرّب</button></div><div class="small" id="gst"></div></div>
   <div class="card"><h3>🤖 OpenAI (صوت ChatGPT)</h3>
    <p class="small">نفس نوعية أصوات ChatGPT (مارين وسيدار أطبع صوتين)، وبتتكلم مصري بالتعليمات. <b>اشتراك ChatGPT Plus مش هو المفتاح</b>، الـ API بيتحاسب لوحده بالاستخدام (بيبقى سنتات قليلة):</p>
    <ol class="small"><li>افتح <a href="#" data-ext="https://platform.openai.com/api-keys">platform.openai.com/api-keys</a> واشحن رصيد صغير من Billing.</li><li>دوس <b>Create new secret key</b> وانسخه.</li><li>الصقه هنا ودوس "جرّب".</li></ol>
    <div class="toolbar"><input type="password" id="okey" placeholder="sk-…" value="${esc(c.okey)}" style="flex:1" autocomplete="off"><button class="btn ghost" data-eye="okey">👁️</button><button class="btn" id="otest">جرّب</button></div><div class="small" id="ost"></div></div>
   <div class="card"><h3>🎙️ الصوت</h3>
    <label>الصوت اللي بيقرا الشرح <select id="svoice" style="max-width:100%"></select></label>
    <div class="toolbar"><button class="btn ghost" id="sdemo">🔊 جرّب الصوت</button><button class="btn ghost" id="segy" ${c.gkey ? "" : "hidden"}>🇪🇬 هات أصوات Gemini المصرية</button><span class="small muted" id="sst"></span></div>
    <p class="small muted">أي جملة اتقرت مرة بتتحفظ، فلو سمعتها تاني مش بتتحسب ولا محتاجة نت. ${app ? "" : "على الموبايل من غير مفتاح بيستخدم صوت التليفون العربي (لو مش شغال: الإعدادات ← Google Text-to-Speech ← نزّل اللغة العربية)."}</p>
    <div class="toolbar"><span class="small" id="csize"></span><button class="btn ghost" id="cclear">🧹 امسح الصوت المحفوظ</button></div></div>
   <div class="card"><h3>🧠 المساعد</h3>
    <label>بيجاوب بـ <select id="sprov"><option value="auto">تلقائي (اللي مفتاحه موجود)</option><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></label>
    <details class="small" style="margin-top:8px"><summary>إعدادات متقدمة (أسماء الموديلات)</summary>
     <div class="grid2">${[["gText", "Gemini إجابات"], ["gTts", "Gemini صوت"], ["oText", "OpenAI إجابات"], ["oTts", "OpenAI صوت"]].map(([k, l]) => `<label>${l}<input data-m="${k}" value="${esc(c[k])}" dir="ltr"></label>`).join("")}</div>
     <p class="muted">لو شركة غيّرت اسم موديل، اكتب الاسم الجديد هنا.</p></details></div>
  </div>`;
  main.querySelectorAll("[data-eye]").forEach((b) => (b.onclick = () => { const i = $("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; }));
  const saveKeys = () => { AI.save({ gkey: $("#gkey").value.trim(), okey: $("#okey").value.trim() }); fillVoices(); $("#segy").hidden = !$("#gkey").value.trim(); };
  $("#gkey").onchange = saveKeys; $("#okey").onchange = saveKeys;
  $("#sprov").value = c.provider; $("#sprov").onchange = (e) => AI.save({ provider: e.target.value });
  main.querySelectorAll("[data-m]").forEach((i) => (i.onchange = () => AI.save({ [i.dataset.m]: i.value.trim() || AI.DEF[i.dataset.m] })));
  const test = async (prov, st) => {
    saveKeys(); const s = $(st); s.textContent = "بيجرّب…";
    const keep = AI.cfg().provider; AI.save({ provider: prov });
    try { const r = await AI.ask("قول جملة واحدة قصيرة بالمصري إن الاتصال تمام.", false); s.innerHTML = `<span style="color:var(--ok)">✓ المفتاح شغال${r.model ? " (" + esc(r.model) + ")" : ""}:</span> ${esc(r.text.slice(0, 160))}`; }
    catch (e) { s.innerHTML = `<span style="color:var(--bad)">✗ ${esc(e.message)}</span>`; }
    AI.save({ provider: keep });
  };
  $("#gtest").onclick = () => test("gemini", "#gst"); $("#otest").onclick = () => test("openai", "#ost");
  const fillVoices = (extra) => {
    const sel = $("#svoice"), cur = Speech.prefs().voice;
    sel.innerHTML = Speech.engines(extra).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
    sel.value = cur; if (sel.value !== cur) sel.selectedIndex = 0;
  };
  fillVoices();
  $("#svoice").onchange = (e) => { Store.data.tts = Object.assign(Speech.prefs(), { voice: e.target.value }); Store.save(); Speech.resetBar(); };
  $("#sdemo").onclick = () => Speech.sayText("أهلاً بيك يا هندسة! النهارده هنفهم مع بعض إزاي التشلر بيشتغل، وإيه أهم القرايات اللي لازم تبص عليها كل يوم عشان تعرف إن السيستم ماشي تمام.");
  $("#segy").onclick = async () => {
    $("#sst").textContent = "بيجيب…";
    try { const v = await AI.egyptVoices(); Store.data.gEgy = v; Store.save(); fillVoices(); $("#sst").textContent = v.length ? `لقيت ${v.length} صوت مصري، اختار من القايمة` : "مالقاش أصوات مصرية مخصوصة، الأصوات العادية بتتكلم مصري برضه"; }
    catch (e) { $("#sst").textContent = e.message; }
  };
  const size = async () => {
    if (app) $("#csize").textContent = "الصوت المحفوظ: " + (await pywebview.api.cache_size()) + " ميجا";
    else if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); $("#csize").textContent = "التخزين المستخدم: " + (e.usage / 1e6).toFixed(1) + " ميجا"; }
  };
  size();
  $("#cclear").onclick = async () => { if (app) await pywebview.api.clear_cache(); else await caches.delete("om-tts"); size(); toast("اتمسح"); };
}
