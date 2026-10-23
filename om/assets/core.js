/* مرجع التشغيل والصيانة - محرك العرض
   المحتوى نفسه في content/*.js وكل ملف بينادي OM.register(...) أو OM.addRules(...) */
"use strict";
const OM = {
  systems: [], byId: {}, rules: [], glossary: [], paths: [], diagrams: {},
  groups: [
    ["basics", "🧭", "البداية والأساسيات"],
    ["hvac", "❄️", "التكييف والتبريد والتهوية"],
    ["plumb", "🚰", "الأعمال الصحية"],
    ["fire", "🔥", "الحريق: إطفاء وإنذار"],
    ["elec", "⚡", "الكهرباء والطاقة"],
    ["rotating", "⚙️", "المعدات الدوارة"],
    ["lowcur", "📡", "التيار الخفيف والتحكم"],
    ["vt", "🛗", "المصاعد والأبواب"],
    ["fm", "🏢", "إدارة المرافق والصيانة"],
    ["home", "🏠", "الأجهزة والصيانة المنزلية"],
  ],
  TABS: [
    ["overview", "📖", "الشرح التدريجي"],
    ["keypoints", "📌", "النقاط المهمة والكود"],
    ["faults", "🛠️", "الأعطال وحلولها"],
    ["mistakes", "🚫", "أخطاء التركيب"],
    ["mods", "🔧", "تعديلات عملية"],
    ["tools", "🧰", "العدة اللي هتحتاجها"],
    ["testing", "▶️", "التشغيل والاختبار"],
    ["params", "📊", "القرايات والباراميترات"],
    ["interview", "🎤", "أسئلة الانترفيو"],
    ["quiz", "📝", "كويز"],
    ["media", "🎬", "صور وفيديوهات ومصادر"],
    ["terms", "🔤", "المصطلحات"],
  ],
  LVL: { 1: "مبتدئ", 2: "متوسط", 3: "متقدم", 4: "خبير" },
  ROOT: "D:\\3-Private\\1-Ahmed\\11 - كورسات ومحاضرات\\",
  C(...paths) { return paths.map((p) => this.ROOT + p); },
  register(s) { s.order = this.systems.length; this.systems.push(s); this.byId[s.id] = s; },
  addRules(cat) { this.rules.push(cat); },
  addGlossary(list) { this.glossary.push(...list); },
  addPath(p) { this.paths.push(p); },
  addDiagrams(d) { Object.assign(this.diagrams, d); },
  photos: {},
  /* صور حقيقية: OM.addPhotos({sysId: {"عنوان العطل": [{src, cap, credit, url, gen}]}}) */
  addPhotos(m) { for (const k in m) this.photos[k] = Object.assign(this.photos[k] || {}, m[k]); },
};

/* ---------- حفظ الحالة ---------- */
const Store = {
  data: { read: {}, quiz: {}, fav: [], notes: {}, theme: "dark", last: "" },
  async load() {
    try {
      if (window.pywebview && pywebview.api) {
        const t = await pywebview.api.load_state();
        if (t) Object.assign(this.data, JSON.parse(t));
      } else {
        const t = localStorage.getItem("om-state");
        if (t) Object.assign(this.data, JSON.parse(t));
      }
    } catch (e) { console.warn("state load", e); }
  },
  save() {
    const t = JSON.stringify(this.data);
    try {
      if (window.pywebview && pywebview.api) pywebview.api.save_state(t);
      else localStorage.setItem("om-state", t);
    } catch (e) { console.warn("state save", e); }
  },
};

/* ---------- أدوات ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const el = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; };

function inline(t) {
  return String(t)
    .replace(/`([^`]+)`/g, (m, x) => `<code>${x}</code>`)
    .replace(/‹([^›]+)›/g, (m, x) => `<code>${x}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, (m, a, u) => `<a href="#" data-ext="${esc(u)}">${a}</a>`)
    .replace(/\{\{d:([\w-]+)\}\}/g, (m, n) => diagramHTML(n))
    .replace(/\{\{img:([^|}]+)\|?([^}]*)\}\}/g, (m, s, c) => `<figure class="diagram"><img src="${esc(s)}" data-zoom style="max-width:100%;background:#fff"><div class="cap">${c}</div></figure>`);
}

/* markdown مبسط: ## عنوان، - قائمة، 1. مرقمة، > نصيحة، !! تحذير، ?? معلومة، :: قاعدة، | جدول | */
function md(src) {
  if (!src) return "";
  if (Array.isArray(src)) src = src.map((x) => "- " + x).join("\n");
  const lines = String(src).replace(/\r/g, "").split("\n");
  let out = "", i = 0;
  const callout = { ">": "tip", "!!": "warn", "??": "info", "::": "rule" };
  while (i < lines.length) {
    let L = lines[i].trim();
    if (!L) { i++; continue; }
    let m;
    if ((m = L.match(/^(#{2,3}) (.*)/))) { out += m[1].length === 2 ? `<h3>${inline(m[2])}</h3>` : `<h4>${inline(m[2])}</h4>`; i++; continue; }
    if ((m = L.match(/^(>|!!|\?\?|::) ?(.*)/))) {
      const k = m[1]; let body = [m[2]]; i++;
      while (i < lines.length && lines[i].trim().startsWith(k)) { body.push(lines[i].trim().slice(k.length).trim()); i++; }
      out += `<div class="call ${callout[k]}"><div>${md(body.join("\n"))}</div></div>`; continue;
    }
    if (L.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(lines[i].trim()); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const body = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r));
      out += `<div class="tablewrap"><table><thead><tr>${cells(body[0]).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
        body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") + `</tbody></table></div>`;
      continue;
    }
    if (/^[-•] /.test(L) || /^\d+[.)] /.test(L)) {
      const ordered = /^\d+[.)] /.test(L), items = [];
      while (i < lines.length && (/^\s*[-•] /.test(lines[i]) || /^\s*\d+[.)] /.test(lines[i]))) {
        items.push(lines[i].trim().replace(/^[-•] |^\d+[.)] /, "")); i++;
      }
      out += (ordered ? "<ol>" : "<ul>") + items.map((x) => `<li>${inline(x)}</li>`).join("") + (ordered ? "</ol>" : "</ul>");
      continue;
    }
    if (L.startsWith("{{d:") || L.startsWith("{{img:") || L.startsWith("<")) { out += inline(L); i++; continue; }
    let p = [L]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |[-•] |\d+[.)] |>|!!|\?\?|::|\||\{\{)/.test(lines[i].trim())) { p.push(lines[i].trim()); i++; }
    out += `<p>${inline(p.join("<br>"))}</p>`;
  }
  return `<div class="md">${out}</div>`;
}

function diagramHTML(name) {
  const d = OM.diagrams[name];
  if (!d) return `<div class="call warn"><div>رسم غير موجود: ${esc(name)}</div></div>`;
  return `<figure class="diagram">${d.svg}<div class="cap">${d.title}</div><button class="motion" onclick="toggleMotion()">⏯ وقف/شغّل الحركة</button></figure>`;
}

function toggleMotion() {
  const r = document.documentElement; r.dataset.motion = r.dataset.motion === "off" ? "on" : "off";
  Store.data.motion = r.dataset.motion; Store.save();
}
function photosHTML(s, title) {
  const list = (OM.photos[s.id] || {})[title];
  if (!list || !list.length) return "";
  return `<span class="label">📷 صور</span><div class="photos">${list.map((p) => `<figure><img loading="lazy" src="${esc(p.src)}" data-zoom data-cap="${esc(p.cap + (p.credit ? " — " + p.credit : ""))}"><figcaption>${p.gen ? '<span class="gen-badge">صورة توضيحية مولّدة</span> ' : ""}${esc(p.cap)}${p.credit ? `<br><a href="#" data-ext="${esc(p.url || "")}">© ${esc(p.credit)}</a>` : ""}</figcaption></figure>`).join("")}</div>`;
}
const yt = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
const gimg = (q) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q);

function openExt(url) {
  if (window.pywebview && pywebview.api) pywebview.api.open_url(url);
  else window.open(url, "_blank", "noopener");
}
async function openFile(path) {
  if (window.pywebview && pywebview.api) {
    const r = await pywebview.api.open_file(path);
    if (r !== "ok") toast(r);
  } else toast("فتح الملفات بيشتغل من جوه البرنامج: " + path);
}
function toast(msg) {
  const t = el(`<div style="position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--panel);border:1px solid var(--accent);padding:10px 18px;border-radius:10px;z-index:60;box-shadow:var(--shadow)">${esc(msg)}</div>`);
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}
function modal(html) { $("#modalBody").innerHTML = html; $("#modal").hidden = false; }

/* ---------- تحميل المحتوى ---------- */
OM.loadContent = function () {
  const files = (window.OM_MANIFEST || []).slice();
  const next = () => {
    if (!files.length) return boot();
    const s = document.createElement("script");
    s.src = "content/" + files.shift();
    s.onload = next;
    s.onerror = () => { console.error("failed", s.src); next(); };
    document.body.appendChild(s);
  };
  next();
};

async function boot() {
  // جوه البرنامج (سيرفر pywebview على 127.0.0.1) نستنى ربط البايثون يجهز عشان الحفظ يروح للملف مش للمتصفح
  if (/[?&]app=1/.test(location.search) || location.hostname === "127.0.0.1") {
    await new Promise((r) => {
      if (window.pywebview && window.pywebview.api && window.pywebview.api.load_state) return r();
      window.addEventListener("pywebviewready", r, { once: true });
      setTimeout(r, 6000);
    });
  }
  await Store.load();
  document.documentElement.dataset.theme = Store.data.theme;
  document.documentElement.dataset.motion = Store.data.motion || "on";
  OM.systems.sort((a, b) => OM.groups.findIndex((g) => g[0] === a.group) - OM.groups.findIndex((g) => g[0] === b.group) || a.order - b.order);
  buildIndex();
  renderSide();
  window.addEventListener("hashchange", route);
  $("#themeBtn").onclick = () => { Store.data.theme = Store.data.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = Store.data.theme; Store.save(); };
  $("#homeLink").onclick = () => (location.hash = "#/home");
  $("#menuBtn").onclick = () => $("#side").classList.toggle("open");
  const topH = () => document.documentElement.style.setProperty("--toph", $(".topbar").offsetHeight + "px");
  topH(); addEventListener("resize", topH);
  $("#modalClose").onclick = () => ($("#modal").hidden = true);
  $("#modal").onclick = (e) => { if (e.target.id === "modal") $("#modal").hidden = true; };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#modal").hidden = true; if (e.ctrlKey && e.key === "k") { e.preventDefault(); $("#q").focus(); } });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-ext]");
    if (a) { e.preventDefault(); openExt(a.dataset.ext); return; }
    const f = e.target.closest("[data-file]");
    if (f) { e.preventDefault(); openFile(f.dataset.file); return; }
    const z = e.target.closest("[data-zoom]");
    if (z) { modal(`<img src="${z.getAttribute("src")}">` + (z.dataset.cap ? `<p class="muted small">${z.dataset.cap}</p>` : "")); return; }
    const d = e.target.closest(".diagram svg");
    if (d) modal(`<div class="diagram" style="min-width:70vw">${d.outerHTML}</div>`);
  });
  setupSearch();
  if (!location.hash || location.hash === "#") location.hash = Store.data.last || "#/home";
  route();
}

/* ---------- القائمة الجانبية ---------- */
function sysProgress(s) {
  const r = Store.data.read[s.id] || {};
  const tabs = OM.TABS.filter(([k]) => hasTab(s, k) && !["media", "terms", "quiz", "tools"].includes(k));
  const done = tabs.filter(([k]) => r[k]).length;
  return { done, total: tabs.length, pct: tabs.length ? Math.round((done / tabs.length) * 100) : 0 };
}
function renderSide() {
  let h = `<a href="#/home"><span class="ic">🏠</span>الرئيسية</a>
  <a href="#/path"><span class="ic">🗺️</span>مسار التعلم من الصفر</a>
  <a href="#/rules"><span class="ic">📐</span>الاختصارات العملية</a>
  <a href="#/calc"><span class="ic">🧮</span>الحاسبات السريعة</a>
  <a href="#/exam"><span class="ic">🏆</span>الكويزات والاختبارات</a>
  <a href="#/glossary"><span class="ic">🔤</span>قاموس المصطلحات</a>
  ${window.OM_WEB ? "" : `<a href="#/library"><span class="ic">📚</span>مكتبة الكورسات</a>`}
  <a href="#/fav"><span class="ic">⭐</span>المفضلة وملاحظاتي</a>`;
  for (const [g, ic, name] of OM.groups) {
    const list = OM.systems.filter((s) => s.group === g);
    if (!list.length) continue;
    h += `<h4>${ic} ${name}</h4>`;
    for (const s of list) {
      const p = sysProgress(s);
      h += `<a href="#/sys/${s.id}" data-sys="${s.id}"><span class="ic">${s.icon}</span>${s.title}<span class="pr ${p.pct === 100 ? "done" : ""}">${p.pct ? p.pct + "%" : ""}</span></a>`;
    }
  }
  $("#side").innerHTML = h;
}
function markSide() {
  const h = location.hash;
  document.querySelectorAll("#side a").forEach((a) => {
    const href = a.getAttribute("href");
    a.classList.toggle("on", h === href || h.startsWith(href + "/"));
  });
}

/* ---------- التوجيه ---------- */
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [page, a, b] = h.split("/").map(decodeURIComponent);
  Store.data.last = location.hash; Store.save();
  $("#side").classList.remove("open");
  const main = $("#main");
  window.scrollTo(0, 0);
  try {
    if (page === "sys" && OM.byId[a]) renderSystem(main, OM.byId[a], b);
    else if (page === "rules") renderRules(main, a);
    else if (page === "calc") renderCalc(main);
    else if (page === "exam") renderExam(main);
    else if (page === "glossary") renderGlossary(main);
    else if (page === "library") renderLibrary(main);
    else if (page === "fav") renderFav(main);
    else if (page === "path") renderPath(main);
    else renderHome(main);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="card"><h3>حصلت مشكلة في عرض الصفحة</h3><p class="muted">${esc(e.message)}</p><a href="#/home">رجوع للرئيسية</a></div>`;
  }
  markSide();
}

/* ---------- الرئيسية ---------- */
function renderHome(main) {
  const total = OM.systems.reduce((n, s) => n + sysProgress(s).total, 0);
  const done = OM.systems.reduce((n, s) => n + sysProgress(s).done, 0);
  const nq = OM.systems.reduce((n, s) => n + (s.quiz || []).length, 0) + OM.rules.reduce((n, c) => n + (c.quiz || []).length, 0);
  const nf = OM.systems.reduce((n, s) => n + (s.faults || []).length, 0);
  const nr = OM.rules.reduce((n, c) => n + c.items.length, 0);
  let h = `<section class="hero"><h1>مرجع التشغيل والصيانة <span class="en">MEP O&amp;M Academy</span></h1>
  <p>مرجع تدريبي عملي لأعمال الإلكتروميكانيكال وإدارة المرافق. لكل نظام شرح يبدأ من الصفر لحد الاحترافية، ومعاه النقاط المهمة وقواعد الكود، والأعطال وحلولها، وأخطاء التركيب، والتشغيل والاختبار، والقرايات اللي تحكم بيها على حالة النظام، وأسئلة الانترفيو، وكويز.</p>
  <div class="chips"><span class="chip k">${OM.systems.length} نظام</span><span class="chip k">${nf} عطل بالحل</span><span class="chip k">${nr} اختصار عملي</span><span class="chip k">${nq} سؤال كويز</span><span class="chip">تقدمك: ${total ? Math.round((done / total) * 100) : 0}%</span></div>
  <div class="progressbar" style="margin-top:10px;max-width:420px"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div></section>`;
  h += `<div class="call info" style="margin-top:16px"><div>لو بادئ من الصفر ابدأ بـ <a href="#/path">مسار التعلم</a>. اقرا كل تاب للآخر واضغط "خلصت القراءة" عشان تقدمك يتسجل.<span class="kbdhint"> اضغط <span class="kbd">Ctrl</span>+<span class="kbd">K</span> عشان تبحث في كل المحتوى.</span></div></div>`;
  for (const [g, ic, name] of OM.groups) {
    const list = OM.systems.filter((s) => s.group === g);
    if (!list.length) continue;
    h += `<h3 style="margin:22px 0 4px">${ic} ${name}</h3><div class="home-grid">`;
    for (const s of list) {
      const p = sysProgress(s);
      h += `<div class="syscard" onclick="location.hash='#/sys/${s.id}'"><span class="ic">${s.icon}</span><b>${s.title}</b><small>${s.en}</small>
      <div class="progressbar bar"><i style="width:${p.pct}%"></i></div></div>`;
    }
    h += `</div>`;
  }
  main.innerHTML = h;
}

/* ---------- صفحة النظام ---------- */
function hasTab(s, k) {
  if (k === "media") return true;
  if (k === "terms") return (s.terms || []).length > 0;
  const v = s[k];
  return Array.isArray(v) ? v.length > 0 : !!v;
}
function countTab(s, k) {
  if (k === "media") return ((s.media && s.media.images) || []).length + ((s.media && s.media.videos) || []).length || "";
  const v = s[k];
  return Array.isArray(v) ? v.length : "";
}
function renderSystem(main, s, tab) {
  const tabs = OM.TABS.filter(([k]) => hasTab(s, k));
  if (!tab || !tabs.find(([k]) => k === tab)) tab = tabs[0][0];
  const p = sysProgress(s);
  main.innerHTML = `<section class="hero"><h1><span>${s.icon}</span>${s.title} <span class="en">${s.en}</span></h1><p>${inline(s.summary || "")}</p>
   <div class="chips">${(s.tags || []).map((t) => `<span class="chip">${t}</span>`).join("")}<span class="chip k">قريت ${p.done}/${p.total}</span></div></section>
   <div class="tabs">${tabs.map(([k, ic, n]) => `<button class="tab ${k === tab ? "on" : ""}" data-t="${k}">${ic} ${n}${countTab(s, k) ? `<span class="n">${countTab(s, k)}</span>` : ""}${(Store.data.read[s.id] || {})[k] ? " ✓" : ""}</button>`).join("")}</div>
   <div class="pane" id="pane"></div>`;
  main.querySelectorAll(".tab").forEach((b) => (b.onclick = () => (location.hash = `#/sys/${s.id}/${b.dataset.t}`)));
  const pane = $("#pane");
  const R = TabRenderers[tab];
  pane.innerHTML = R(s);
  if (TabAfter[tab]) TabAfter[tab](s, pane);
  if (!["media", "terms", "quiz"].includes(tab)) {
    const done = (Store.data.read[s.id] || {})[tab];
    const b = el(`<div class="readbtn"><button class="btn ${done ? "ghost" : ""}">${done ? "✓ اتقرأ (اضغط للإلغاء)" : "خلصت القراءة ✓"}</button></div>`);
    b.querySelector("button").onclick = () => {
      Store.data.read[s.id] = Store.data.read[s.id] || {};
      Store.data.read[s.id][tab] = !done; Store.save(); renderSide(); route();
    };
    pane.appendChild(b);
  }
  bindStars(pane, s);
  if (!["quiz", "media"].includes(tab)) Speech.attach(pane, ["params", "terms"].includes(tab) ? ".tablewrap" : tab === "interview" ? "details.qa" : ".card");
}

function star(s, kind, i, title) {
  const key = `${s.id}|${kind}|${i}`;
  const on = Store.data.fav.some((f) => f.key === key);
  return `<button class="star ${on ? "on" : ""}" data-star="${key}" data-title="${esc(title)}" title="أضف للمفضلة">★</button>`;
}
function bindStars(root, s) {
  root.querySelectorAll("[data-star]").forEach((b) => (b.onclick = (e) => {
    e.stopPropagation(); e.preventDefault();
    const key = b.dataset.star, ix = Store.data.fav.findIndex((f) => f.key === key);
    if (ix >= 0) Store.data.fav.splice(ix, 1); else Store.data.fav.push({ key, title: b.dataset.title, sys: s.id });
    b.classList.toggle("on"); Store.save();
  }));
}

const filterBox = (ph) => `<div class="toolbar"><input type="search" class="flt" placeholder="${ph}" style="flex:1;max-width:420px"><span class="muted small cnt"></span></div>`;
function bindFilter(pane, sel) {
  const inp = pane.querySelector(".flt"); if (!inp) return;
  const items = [...pane.querySelectorAll(sel)];
  const cnt = pane.querySelector(".cnt");
  const run = () => {
    const q = inp.value.trim().toLowerCase(); let n = 0;
    items.forEach((it) => { const ok = !q || it.textContent.toLowerCase().includes(q); it.style.display = ok ? "" : "none"; n += ok; });
    cnt.textContent = `${n} من ${items.length}`;
  };
  inp.oninput = run; run();
}

const lvlTag = (l) => (l ? `<span class="lvl lvl${l}">${OM.LVL[l]}</span>` : "");

const TabRenderers = {
  overview(s) {
    return s.overview.map((o, i) => `<div class="card" id="ov${i}"${o.say ? ` data-say="${esc(o.say)}"` : ""}>${star(s, "overview", i, o.h)}<h3>${lvlTag(o.lvl)}${inline(o.h)}</h3>${md(o.md)}${photosHTML(s, o.h)}</div>`).join("");
  },
  keypoints(s) {
    return filterBox("فلتر النقاط…") + s.keypoints.map((k, i) => `<div class="card kp">${star(s, "keypoints", i, k.h)}<h3>${inline(k.h)}</h3>${md(k.md)}${k.std ? `<div class="chips"><span class="chip k">📖 ${esc(k.std)}</span></div>` : ""}</div>`).join("");
  },
  faults(s) {
    const sevN = { high: "خطير", med: "متوسط", low: "بسيط" };
    return filterBox("دور على عطل أو عَرَض… (مثال: ضغط عالي، تلج، رعشة)") + s.faults.map((f, i) => `<div class="card fault">${star(s, "faults", i, f.h)}
      <h3>${inline(f.h)} ${f.sev ? `<span class="sev ${f.sev}">● ${sevN[f.sev]}</span>` : ""}</h3>
      ${f.sym ? `<span class="label">🔎 الأعراض</span>${md(f.sym)}` : ""}
      ${f.causes ? `<span class="label">🧩 الأسباب المحتملة (الأكثر شيوعاً الأول)</span>${md(f.causes)}` : ""}
      ${f.diag ? `<span class="label">🩺 خطوات التشخيص</span>${mdSteps(f.diag)}` : ""}
      ${f.fix ? `<span class="label">✅ الحل</span>${md(f.fix)}` : ""}
      ${f.prevent ? `<span class="label">🛡️ الوقاية</span>${md(f.prevent)}` : ""}
      ${photosHTML(s, f.h)}${f.d ? diagramHTML(f.d) : ""}
      <div class="linkrow" style="margin-top:8px"><a class="linkbtn" data-ext="${yt(f.yt || s.en + " " + (f.en || f.h) + " troubleshooting")}"><span class="yt">▶</span> فيديوهات عن العطل</a><a class="linkbtn" data-ext="${gimg(f.img || s.en + " " + (f.en || f.h))}">🖼️ صور عملية</a></div></div>`).join("");
  },
  mistakes(s) {
    return filterBox("فلتر الأخطاء…") + `<div class="grid">` + s.mistakes.map((m, i) => `<div class="card mk">${star(s, "mistakes", i, m.h)}<h3>🚫 ${inline(m.h)}</h3>
      ${m.why ? `<span class="label">ليه غلط / إيه اللي بيحصل</span>${md(m.why)}` : ""}
      ${m.spot ? `<span class="label">إزاي تكتشفه في الموقع</span>${md(m.spot)}` : ""}
      ${m.avoid ? `<span class="label">إزاي تتجنبه</span>${md(m.avoid)}` : ""}
      ${m.fix ? `<span class="label">لو حصل: الإصلاح</span>${md(m.fix)}` : ""}${photosHTML(s, m.h)}</div>`).join("") + `</div>`;
  },
  mods(s) {
    return s.mods.map((m, i) => `<div class="card">${star(s, "mods", i, m.h)}<h3>🔧 ${inline(m.h)}</h3>
      ${m.when ? `<span class="label">إمتى تحتاجه</span>${md(m.when)}` : ""}
      ${m.how ? `<span class="label">إزاي يتنفذ</span>${md(m.how)}` : ""}
      ${m.gain ? `<span class="label">المكسب / التحذير</span>${md(m.gain)}` : ""}</div>`).join("");
  },
  testing(s) {
    return s.testing.map((t, i) => `<div class="card">${star(s, "testing", i, t.h)}<h3>${inline(t.h)}</h3>${t.steps ? mdSteps(t.steps) : ""}${md(t.md)}</div>`).join("");
  },
  params(s) {
    let h = `<div class="call info"><div>اكتب القراية اللي قستها في خانة "جرّب قرايتك" والبرنامج يقولك هي في الطبيعي ولا لأ. الحدود دي استرشادية وبتختلف حسب الماركة والظروف، فارجع دايماً لكتالوج المعدة.</div></div>` + filterBox("فلتر الباراميترات…");
    h += `<div class="tablewrap"><table class="ptable"><thead><tr><th>الباراميتر</th><th>القيمة الطبيعية</th><th>علامة المشكلة</th><th>إزاي تقيسه</th><th>لو طالع غلط يعني إيه</th><th>جرّب قرايتك</th></tr></thead><tbody>`;
    s.params.forEach((p, i) => {
      h += `<tr class="param"><td><b>${inline(p.p)}</b>${p.en ? `<br><code>${p.en}</code>` : ""}</td><td class="val">${inline(p.normal || "")}</td><td>${inline(p.alarm || "")}</td><td>${inline(p.how || "")}</td><td>${inline(p.means || "")}</td>
      <td>${p.rng ? `<div class="checker"><input type="number" step="any" data-i="${i}" placeholder="${p.unit || ""}"><span class="res"></span></div>` : ""}</td></tr>`;
    });
    return h + `</tbody></table></div>`;
  },
  interview(s) {
    return `<div class="toolbar"><input type="search" class="flt" placeholder="فلتر الأسئلة…" style="flex:1;max-width:380px"><span class="muted small cnt"></span><button class="btn ghost" id="openAll">افتح كل الإجابات</button><button class="btn ghost" id="rnd">سؤال عشوائي</button></div>` +
      s.interview.map((q, i) => `<details class="qa"><summary>${inline(q.q)}${q.lvl ? lvlTag(q.lvl) : ""}</summary><div class="ans">${md(q.a)}</div></details>`).join("");
  },
  quiz(s) { return `<div id="quizBox"></div>`; },
  tools(s) {
    return `<div class="call info"><div>العدة مترتبة من الأساسي للمتقدم. الأساسي لازم يبقى في شنطتك، والمتقدم للمحترف أو لو هتشتغل كتير.</div></div>` + filterBox("فلتر العدة…") + `<div class="grid">` +
      s.tools.map((t, i) => `<div class="card tl">${star(s, "tools", i, t.t)}<h3>🧰 ${inline(t.t)}${t.lvl ? lvlTag(t.lvl) : ""}</h3>${t.en ? `<code>${esc(t.en)}</code>` : ""}${md(t.use)}${t.tip ? `<div class="call tip"><div>${md(t.tip)}</div></div>` : ""}<div class="linkrow"><a class="linkbtn" data-ext="${gimg(t.en || t.t)}">🖼️ شكلها</a><a class="linkbtn" data-ext="${yt("طريقة استخدام " + t.t)}"><span class="yt">▶</span> إزاي تستخدمها</a></div></div>`).join("") + `</div>`;
  },
  media(s) {
    const m = s.media || {};
    let h = "";
    if ((s.diagramsList || []).length) h += `<div class="card"><h3>📐 رسومات توضيحية</h3>${s.diagramsList.map(diagramHTML).join("")}</div>`;
    if ((m.images || []).length) {
      h += `<div class="card"><h3>🖼️ صفحات وصور من كورساتك</h3><p class="muted small">اضغط على الصورة لتكبيرها. تحت كل صورة اسم الملف ورقم الصفحة اللي اتاخدت منها.</p><div class="gallery">` +
        m.images.map((im) => `<figure><img loading="lazy" src="${esc(im.src)}" data-zoom data-cap="${esc(im.cap)}"><figcaption>${esc(im.cap)}</figcaption></figure>`).join("") + `</div></div>`;
    }
    const vids = (m.videos || []);
    h += `<div class="card"><h3>🎬 فيديوهات عملية</h3><p class="muted small">كل زرار بيفتح بحث يوتيوب جاهز على الموضوع بالظبط (عربي وإنجليزي)، عشان تلاقي أحدث وأوضح الفيديوهات حتى لو فيديو معين اتشال.</p><div class="linkrow">` +
      vids.map((v) => `<a class="linkbtn" data-ext="${v.url || yt(v.q)}"><span class="yt">▶</span>${esc(v.t)}</a>`).join("") + `</div></div>`;
    const imgs = (m.photos || []);
    if (imgs.length) h += `<div class="card"><h3>📷 صور عملية من النت</h3><div class="linkrow">` + imgs.map((v) => `<a class="linkbtn" data-ext="${gimg(v.q)}">🖼️ ${esc(v.t)}</a>`).join("") + `</div></div>`;
    if ((m.links || []).length) h += `<div class="card"><h3>🌐 مراجع على النت</h3><ul>` + m.links.map((l) => `<li><a href="#" data-ext="${esc(l.url)}">${esc(l.t)}</a></li>`).join("") + `</ul></div>`;
    if (!window.OM_WEB && (m.sources || []).length) h += `<div class="card"><h3>📂 الكورسات والملفات اللي على جهازك عن النظام ده</h3><p class="muted small">اضغط على الملف يفتح (لو موجود على الجهاز ده).</p><ul>` +
      m.sources.map((p) => `<li><a href="#" data-file="${esc(p)}">${esc(p.split("\\").slice(-2).join(" › "))}</a></li>`).join("") + `</ul></div>`;
    return h;
  },
  terms(s) {
    return filterBox("فلتر المصطلحات…") + `<div class="tablewrap"><table><thead><tr><th>الاختصار / المصطلح</th><th>بالإنجليزي كامل</th><th>المعنى بالعربي</th></tr></thead><tbody>` +
      s.terms.map((t) => `<tr class="term"><td><code>${esc(t[0])}</code></td><td dir="ltr" style="text-align:right">${esc(t[1])}</td><td>${inline(t[2] || "")}</td></tr>`).join("") + `</tbody></table></div>`;
  },
};
function mdSteps(list) {
  if (!Array.isArray(list)) return md(list);
  return `<ol class="steps">${list.map((x) => `<li>${inline(x)}</li>`).join("")}</ol>`;
}
const TabAfter = {
  keypoints: (s, p) => bindFilter(p, ".kp"),
  faults: (s, p) => bindFilter(p, ".fault"),
  mistakes: (s, p) => bindFilter(p, ".mk"),
  terms: (s, p) => bindFilter(p, ".term"),
  tools: (s, p) => bindFilter(p, ".tl"),
  params(s, p) {
    bindFilter(p, ".param");
    p.querySelectorAll(".checker input").forEach((inp) => (inp.oninput = () => {
      const pr = s.params[inp.dataset.i], v = parseFloat(inp.value), res = inp.nextElementSibling;
      if (isNaN(v)) { res.textContent = ""; return; }
      const [lo, hi] = pr.rng, w = pr.warn;
      if (v >= lo && v <= hi) { res.textContent = "✓ طبيعي"; res.className = "res ok"; }
      else if (w && v >= w[0] && v <= w[1]) { res.textContent = "⚠ راقب"; res.className = "res warnc"; }
      else { res.textContent = v < lo ? "✗ أقل من الطبيعي" : "✗ أعلى من الطبيعي"; res.className = "res bad"; }
    }));
  },
  interview(s, p) {
    bindFilter(p, "details.qa");
    $("#openAll").onclick = () => p.querySelectorAll("details.qa").forEach((d) => (d.open = true));
    $("#rnd").onclick = () => {
      const ds = [...p.querySelectorAll("details.qa")]; ds.forEach((d) => (d.open = false));
      const d = ds[Math.floor(Math.random() * ds.length)]; d.scrollIntoView({ block: "center" });
      d.style.outline = "2px solid var(--accent)"; setTimeout(() => (d.style.outline = ""), 2500);
    };
  },
  quiz(s, p) { Quiz.start($("#quizBox"), s.quiz.map((q) => ({ ...q, src: s.title })), "sys:" + s.id, s.title); },
};

/* ---------- محرك الكويز ---------- */
const Quiz = {
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  start(box, pool, key, title, count) {
    let qs = this.shuffle(pool);
    if (count) qs = qs.slice(0, count);
    qs = qs.map((q) => {
      const idx = this.shuffle(q.o.map((_, i) => i));
      return { ...q, o: idx.map((i) => q.o[i]), a: idx.indexOf(q.a) };
    });
    let i = 0, score = 0;
    const wrong = [];
    const best = Store.data.quiz[key];
    const show = () => {
      if (i >= qs.length) return finish();
      const q = qs[i];
      box.innerHTML = `<div class="card quiz"><div class="toolbar"><span class="muted">سؤال ${i + 1} من ${qs.length}${q.src ? " · " + esc(q.src) : ""}</span><span style="margin-inline-start:auto" class="muted">النتيجة: ${score}</span></div>
        <div class="progressbar" style="margin-bottom:12px"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <div class="q">${inline(q.q)}</div>${q.o.map((o, k) => `<button class="opt" data-k="${k}">${inline(o)}</button>`).join("")}
        <div class="exp"></div></div>`;
      box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        const k = +b.dataset.k;
        box.querySelectorAll(".opt").forEach((x) => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add("right"); });
        if (k === q.a) score++; else { b.classList.add("wrong"); wrong.push(q); }
        box.querySelector(".exp").innerHTML = `<div class="call ${k === q.a ? "tip" : "warn"}"><div><b>${k === q.a ? "إجابة صح 👏" : "إجابة غلط"}</b>${q.e ? md(q.e) : ""}</div></div>
          <button class="btn">${i + 1 < qs.length ? "السؤال اللي بعده ←" : "شوف النتيجة"}</button>`;
        box.querySelector(".exp .btn").onclick = () => { i++; show(); };
      }));
    };
    const finish = () => {
      const pct = Math.round((score / qs.length) * 100);
      if (best == null || pct > best) { Store.data.quiz[key] = pct; Store.save(); }
      const verdict = pct >= 85 ? "ممتاز، فاهم النظام كويس 🏆" : pct >= 65 ? "كويس، راجع الأسئلة اللي غلطت فيها" : "محتاج تراجع الشرح والنقاط المهمة تاني";
      box.innerHTML = `<div class="card" style="text-align:center"><div class="score">${pct}%</div><p>${score} صح من ${qs.length} — ${verdict}</p>
        <p class="muted small">أحسن نتيجة قبل كده: ${best == null ? "—" : best + "%"}</p><button class="btn" id="again">عيد الكويز</button></div>` +
        (wrong.length ? `<h3>راجع الأسئلة اللي غلطت فيها</h3>` + wrong.map((q) => `<div class="card"><b>${inline(q.q)}</b><p class="ok">✓ ${inline(q.o[q.a])}</p>${md(q.e || "")}</div>`).join("") : "");
      $("#again").onclick = () => Quiz.start(box, pool, key, title, count);
    };
    if (!qs.length) { box.innerHTML = `<div class="empty">مفيش أسئلة هنا لسه</div>`; return; }
    show();
  },
};

/* ---------- الاختصارات العملية ---------- */
function renderRules(main) {
  let h = `<section class="hero"><h1>📐 الاختصارات العملية <span class="en">Rules of Thumb</span></h1><p>قواعد "بلدي" وأرقام سريعة تخليك تقيّم أي موقف في دقيقة: تقدير أحمال، مقاسات، أعداد، وأرقام تفضح التركيب الغلط. دي أرقام <b>استرشادية للتقدير السريع والمراجعة</b>، مش بديل عن التصميم بالكود والحسابات.</p></section>`;
  h += `<div class="toolbar" style="margin-top:16px"><input type="search" class="flt" placeholder="دور على قاعدة… (طن، cfm، رشاش، كابل، مولد)" style="flex:1;max-width:460px"><select id="rcat"><option value="">كل الأقسام</option>${OM.rules.map((c, i) => `<option value="${i}">${c.title}</option>`).join("")}</select><span class="muted small cnt"></span><a class="btn ghost" href="#/calc">🧮 الحاسبات</a></div>`;
  OM.rules.forEach((c, ci) => {
    h += `<div class="rcat" data-c="${ci}"><h3 style="margin:22px 0 8px">${c.icon || "📐"} ${c.title}</h3><div class="grid">`;
    c.items.forEach((r, i) => {
      h += `<div class="card rule">${star({ id: "rules" }, "rule" + ci, i, r.t)}<h3 style="font-size:16px">${inline(r.t)}</h3>
        <div class="call rule" style="margin:6px 0"><div><b>${inline(r.v)}</b></div></div>${r.why ? `<span class="label">ليه / منين جه الرقم</span>${md(r.why)}` : ""}${r.ex ? `<span class="label">مثال</span>${md(r.ex)}` : ""}${r.warn ? `<div class="call warn"><div>${md(r.warn)}</div></div>` : ""}</div>`;
    });
    h += `</div></div>`;
  });
  main.innerHTML = h;
  const run = () => {
    const q = $(".flt").value.trim().toLowerCase(), c = $("#rcat").value; let n = 0, t = 0;
    document.querySelectorAll(".rcat").forEach((cat) => {
      const showCat = !c || cat.dataset.c === c; let any = 0;
      cat.querySelectorAll(".rule").forEach((r) => { t++; const ok = showCat && (!q || r.textContent.toLowerCase().includes(q)); r.style.display = ok ? "" : "none"; n += ok; any += ok; });
      cat.style.display = any ? "" : "none";
    });
    $(".cnt").textContent = `${n} من ${t}`;
  };
  $(".flt").oninput = run; $("#rcat").onchange = run; run();
  bindStars(main, { id: "rules" });
  Speech.attach(main.querySelector(".rcat").parentNode, ".rule");
}

/* ---------- الاختبارات العامة ---------- */
function renderExam(main) {
  const groups = OM.groups.filter(([g]) => OM.systems.some((s) => s.group === g && (s.quiz || []).length));
  let h = `<section class="hero"><h1>🏆 الكويزات والاختبارات <span class="en">Quizzes &amp; Assessments</span></h1><p>اختبر نفسك في نظام واحد، أو في قسم كامل، أو امتحان شامل عشوائي من كل حاجة. الاختيارات بتتلخبط كل مرة، وبعد كل سؤال بيظهر الشرح.</p></section>
  <div class="card" style="margin-top:16px"><div class="toolbar">
   <select id="exScope"><option value="all">امتحان شامل (كل الأنظمة + الاختصارات)</option><option value="rules">الاختصارات العملية والحسابات فقط</option>
   ${groups.map(([g, ic, n]) => `<option value="g:${g}">${ic} ${n}</option>`).join("")}
   ${OM.systems.filter((s) => (s.quiz || []).length).map((s) => `<option value="s:${s.id}">— ${s.title}</option>`).join("")}</select>
   <select id="exN"><option>10</option><option selected>20</option><option>40</option><option value="0">كل الأسئلة</option></select>
   <button class="btn" id="exGo">ابدأ الاختبار</button></div></div><div id="exBox"></div>`;
  h += `<div class="card"><h3>نتايجك</h3><div class="tablewrap"><table><tr><th>الاختبار</th><th>أحسن نتيجة</th></tr>${Object.entries(Store.data.quiz).map(([k, v]) => `<tr><td>${esc(quizName(k))}</td><td class="${v >= 85 ? "ok" : v >= 65 ? "warnc" : "bad"}">${v}%</td></tr>`).join("") || `<tr><td colspan=2 class="muted">لسه مفيش</td></tr>`}</table></div></div>`;
  main.innerHTML = h;
  $("#exGo").onclick = () => {
    const sc = $("#exScope").value, n = +$("#exN").value;
    let pool = [];
    const rulesQ = OM.rules.flatMap((c) => (c.quiz || []).map((q) => ({ ...q, src: "اختصارات: " + c.title })));
    if (sc === "all") pool = OM.systems.flatMap((s) => (s.quiz || []).map((q) => ({ ...q, src: s.title }))).concat(rulesQ);
    else if (sc === "rules") pool = rulesQ;
    else if (sc.startsWith("g:")) pool = OM.systems.filter((s) => s.group === sc.slice(2)).flatMap((s) => (s.quiz || []).map((q) => ({ ...q, src: s.title })));
    else { const s = OM.byId[sc.slice(2)]; pool = s.quiz.map((q) => ({ ...q, src: s.title })); }
    Quiz.start($("#exBox"), pool, "exam:" + sc, "", n || 0);
    $("#exBox").scrollIntoView({ behavior: "smooth" });
  };
}
function quizName(k) {
  const [t, v] = k.split(/:(.+)/);
  if (t === "sys") return "كويز " + (OM.byId[v] ? OM.byId[v].title : v);
  if (v === "all") return "الامتحان الشامل";
  if (v === "rules") return "امتحان الاختصارات";
  if (v.startsWith("g:")) return "امتحان قسم " + ((OM.groups.find((g) => g[0] === v.slice(2)) || [])[2] || v);
  if (v.startsWith("s:")) return "اختبار " + (OM.byId[v.slice(2)] ? OM.byId[v.slice(2)].title : v);
  return k;
}

/* ---------- القاموس ---------- */
function renderGlossary(main) {
  const all = [];
  const seen = new Set();
  OM.glossary.forEach((t) => all.push({ t, src: "عام" }));
  OM.systems.forEach((s) => (s.terms || []).forEach((t) => all.push({ t, src: s.title })));
  const rows = all.filter((x) => { const k = x.t[0].toLowerCase() + "|" + x.t[1].toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.t[0].localeCompare(b.t[0], "en", { sensitivity: "base" }));
  main.innerHTML = `<section class="hero"><h1>🔤 قاموس المصطلحات والاختصارات <span class="en">Glossary &amp; Abbreviations</span></h1><p>${rows.length} مصطلح من كل الأنظمة. اكتب الاختصار أو الكلمة بالعربي أو الإنجليزي.</p></section>
   <div class="pane">${filterBox("دور على مصطلح…")}<div class="tablewrap"><table><thead><tr><th>الاختصار</th><th>بالإنجليزي</th><th>المعنى</th><th>النظام</th></tr></thead><tbody>${rows.map((x) => `<tr class="term"><td><code>${esc(x.t[0])}</code></td><td dir="ltr" style="text-align:right">${esc(x.t[1])}</td><td>${inline(x.t[2] || "")}</td><td class="muted small">${esc(x.src)}</td></tr>`).join("")}</tbody></table></div></div>`;
  bindFilter(main, ".term");
}

/* ---------- المكتبة ---------- */
function renderLibrary(main) {
  let h = `<section class="hero"><h1>📚 مكتبة الكورسات <span class="en">Course Library</span></h1><p>الملفات اللي المحتوى ده اتبنى عليها من فولدر الكورسات عندك، مقسمة حسب النظام. اضغط على أي ملف يفتح لو موجود على الجهاز ده.</p></section><div class="pane">${filterBox("دور على ملف…")}`;
  for (const s of OM.systems) {
    const src = (s.media && s.media.sources) || [];
    if (!src.length) continue;
    h += `<div class="card lib"><h3>${s.icon} ${s.title}</h3><ul>${src.map((p) => `<li><a href="#" data-file="${esc(p)}">${esc(p.split("\\").slice(-2).join(" › "))}</a></li>`).join("")}</ul></div>`;
  }
  main.innerHTML = h + `</div>`;
  bindFilter(main, ".lib");
}

/* ---------- المفضلة ---------- */
function renderFav(main) {
  const favs = Store.data.fav;
  let h = `<section class="hero"><h1>⭐ المفضلة وملاحظاتي</h1><p>أي حاجة تعلّم عليها بالنجمة ★ بتظهر هنا، ومعاها مكان تكتب فيه ملاحظاتك.</p></section><div class="pane">`;
  h += favs.length ? favs.map((f, i) => {
    const [sid, kind] = f.key.split("|");
    const s = OM.byId[sid];
    const link = s ? `#/sys/${sid}/${kind}` : kind.startsWith("rule") ? "#/rules" : "#/home";
    return `<div class="card"><button class="star on" data-unfav="${i}">★</button><h3><a href="${link}">${esc(f.title)}</a></h3><p class="muted small">${s ? s.title : "الاختصارات العملية"}</p></div>`;
  }).join("") : `<div class="empty">لسه مفيش حاجة في المفضلة. اضغط ★ جنب أي كارت.</div>`;
  h += `<div class="card"><h3>📝 ملاحظاتي العامة</h3><textarea id="notes" style="width:100%;min-height:220px;background:var(--bg2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:10px;font-family:inherit;font-size:15px">${esc(Store.data.notes.general || "")}</textarea><p class="muted small">بتتحفظ لوحدها.</p></div></div>`;
  main.innerHTML = h;
  main.querySelectorAll("[data-unfav]").forEach((b) => (b.onclick = () => { favs.splice(+b.dataset.unfav, 1); Store.save(); renderFav(main); }));
  let tm; $("#notes").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { Store.data.notes.general = e.target.value; Store.save(); }, 400); };
}

/* ---------- مسار التعلم ---------- */
function renderPath(main) {
  let h = `<section class="hero"><h1>🗺️ مسار التعلم من الصفر للاحتراف <span class="en">Learning Path</span></h1><p>ترتيب مقترح للمذاكرة لو بادئ من الصفر. كل مرحلة بتبني على اللي قبلها. خلص الأنظمة اللي في المرحلة وحل الكويز بتاعها قبل ما تنقل للي بعدها.</p></section><div class="pane">`;
  OM.paths.forEach((st, i) => {
    h += `<div class="card"><h3>المرحلة ${i + 1}: ${st.h}</h3>${md(st.md)}<div class="linkrow" style="margin-top:8px">${(st.sys || []).filter((id) => OM.byId[id]).map((id) => {
      const s = OM.byId[id], p = sysProgress(s), q = Store.data.quiz["sys:" + id];
      return `<a class="linkbtn" href="#/sys/${id}">${s.icon} ${s.title} <span class="muted small">${p.pct}%${q != null ? " · كويز " + q + "%" : ""}</span></a>`;
    }).join("")}</div></div>`;
  });
  main.innerHTML = h + `</div>`;
}

/* ---------- البحث ---------- */
let SIDX = [];
function strip(t) { return String(t || "").replace(/<[^>]+>/g, " ").replace(/[`*#>|]/g, " "); }
function buildIndex() {
  SIDX = [];
  const add = (title, body, link, where) => SIDX.push({ title: strip(title), body: strip(body), link, where, low: (strip(title) + " " + strip(body)).toLowerCase() });
  for (const s of OM.systems) {
    add(s.title + " " + s.en, s.summary, `#/sys/${s.id}`, "نظام");
    (s.overview || []).forEach((o) => add(o.h, o.md, `#/sys/${s.id}/overview`, s.title + " › الشرح"));
    (s.keypoints || []).forEach((o) => add(o.h, o.md + " " + (o.std || ""), `#/sys/${s.id}/keypoints`, s.title + " › النقاط المهمة"));
    (s.faults || []).forEach((o) => add(o.h, [o.sym, o.causes, o.fix, o.en].flat().join(" "), `#/sys/${s.id}/faults`, s.title + " › الأعطال"));
    (s.mistakes || []).forEach((o) => add(o.h, [o.why, o.avoid, o.fix].flat().join(" "), `#/sys/${s.id}/mistakes`, s.title + " › أخطاء التركيب"));
    (s.mods || []).forEach((o) => add(o.h, [o.when, o.how].flat().join(" "), `#/sys/${s.id}/mods`, s.title + " › تعديلات"));
    (s.testing || []).forEach((o) => add(o.h, [o.steps, o.md].flat().join(" "), `#/sys/${s.id}/testing`, s.title + " › التشغيل والاختبار"));
    (s.params || []).forEach((o) => add(o.p + " " + (o.en || ""), [o.normal, o.alarm, o.means].join(" "), `#/sys/${s.id}/params`, s.title + " › القرايات"));
    (s.interview || []).forEach((o) => add(o.q, o.a, `#/sys/${s.id}/interview`, s.title + " › انترفيو"));
    (s.terms || []).forEach((t) => add(t[0] + " — " + t[1], t[2], `#/sys/${s.id}/terms`, s.title + " › مصطلحات"));
  }
  OM.rules.forEach((c) => c.items.forEach((r) => add(r.t, r.v + " " + (r.why || "") + " " + (r.ex || ""), "#/rules", "اختصارات › " + c.title)));
  OM.glossary.forEach((t) => add(t[0] + " — " + t[1], t[2], "#/glossary", "القاموس"));
}
function setupSearch() {
  const inp = $("#q"), box = $("#results");
  let sel = -1;
  const norm = (t) => t.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  const run = () => {
    const q = inp.value.trim();
    if (q.length < 2) { box.hidden = true; return; }
    const words = norm(q).split(/\s+/);
    const res = SIDX.map((x) => {
      const L = norm(x.low), T = norm(x.title.toLowerCase());
      if (!words.every((w) => L.includes(w))) return null;
      return { x, sc: words.reduce((n, w) => n + (T.includes(w) ? 5 : 1), 0) };
    }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 40);
    const hl = (t) => { let s = esc(t); words.forEach((w) => { if (w.length > 1) s = s.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`); }); return s; };
    box.innerHTML = res.length ? res.map((r, i) => {
      const b = r.x.body, L = norm(b.toLowerCase()), p = Math.max(0, L.indexOf(words[0]) - 50);
      return `<div class="r" data-l="${r.x.link}">${hl(r.x.title)}<small>${esc(r.x.where)} — ${hl(b.slice(p, p + 140))}…</small></div>`;
    }).join("") : `<div class="r muted">مفيش نتايج</div>`;
    box.hidden = false; sel = -1;
    box.querySelectorAll(".r[data-l]").forEach((r) => (r.onclick = () => { location.hash = r.dataset.l; box.hidden = true; }));
  };
  let tm; inp.oninput = () => { clearTimeout(tm); tm = setTimeout(run, 120); };
  inp.onkeydown = (e) => {
    const rs = [...box.querySelectorAll(".r[data-l]")];
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, rs.length - 1); }
    else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); }
    else if (e.key === "Enter" && rs[sel >= 0 ? sel : 0]) { rs[sel >= 0 ? sel : 0].click(); return; }
    else if (e.key === "Escape") { box.hidden = true; return; }
    else return;
    e.preventDefault(); rs.forEach((r, i) => r.classList.toggle("sel", i === sel)); if (rs[sel]) rs[sel].scrollIntoView({ block: "nearest" });
  };
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) box.hidden = true; });
}

/* ---------- الحاسبات ---------- */
OM.calcs = [];
OM.addCalc = (c) => OM.calcs.push(c);
function renderCalc(main) {
  main.innerHTML = `<section class="hero"><h1>🧮 الحاسبات السريعة <span class="en">Quick Field Calculators</span></h1><p>حاسبات بسيطة للتقدير السريع في الموقع وفي المراجعة. كل حاسبة مكتوب تحتها المعادلة اللي بتستخدمها عشان تفهمها وتعرف تحسبها بإيدك.</p></section><div class="pane calc">${OM.calcs.map((c, i) => `<div class="card" data-c="${i}"><h3>${c.icon || "🧮"} ${c.t}</h3>${c.inputs.map((x) => x.opts ? `<label>${x.l}<select data-k="${x.k}">${x.opts.map((o) => `<option value="${o[0]}" ${o[0] == x.v ? "selected" : ""}>${o[1]}</option>`).join("")}</select></label>` : `<label>${x.l}<input type="number" step="any" data-k="${x.k}" value="${x.v}"></label>`).join("")}<div class="out"></div><p class="muted small" style="margin:8px 0 0">${inline(c.f || "")}</p></div>`).join("")}</div>`;
  main.querySelectorAll(".calc .card").forEach((card) => {
    const c = OM.calcs[card.dataset.c];
    const run = () => {
      const v = {};
      card.querySelectorAll("[data-k]").forEach((i) => (v[i.dataset.k] = i.tagName === "SELECT" ? i.value : parseFloat(i.value)));
      try { card.querySelector(".out").innerHTML = c.run(v); } catch (e) { card.querySelector(".out").textContent = "راجع المدخلات"; }
    };
    card.oninput = run; card.onchange = run; run();
  });
}
const fmt = (n, d = 1) => (isFinite(n) ? Number(n).toLocaleString("en-US", { maximumFractionDigits: d }) : "—");
