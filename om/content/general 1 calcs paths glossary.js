/* الحاسبات + مسار التعلم + القاموس العام */
(function () {
  const b = (x, d = 1, u = "") => `<b>${fmt(x, d)}${u ? " " + u : ""}</b>`;
  const C = OM.addCalc;
  C({ icon: "❄️", t: "تقدير حمل التكييف من المساحة", inputs: [{ k: "a", l: "المساحة (م²)", v: 100 }, { k: "t", l: "نوع المكان", v: "12", opts: [["14", "سكني/مكاتب عادية"], ["10", "واجهات زجاج/محلات"], ["7", "مطاعم/قاعات/مساجد مزدحمة"]] }],
    run: (v) => { const tr = v.a / +v.t; return `الحمل التقريبي: ${b(tr, 1, "طن")} = ${b(tr * 12000, 0, "BTU/h")} = ${b(tr * 3.517, 1, "kW")}<br>الهوا: ${b(tr * 400, 0, "cfm")} · الكهربا (DX إنفرتر ≈ 1.2): ${b(tr * 1.2, 1, "kW")}`; },
    f: "طن لكل 10-15 م² (حسب نوع المكان)، والهوا 400 cfm/طن. للتقدير بس." });
  C({ icon: "🌬️", t: "سعة جهاز من قياس الهوا والحرارة", inputs: [{ k: "cfm", l: "الهوا (cfm)", v: 800 }, { k: "ti", l: "الراجع °C", v: 26 }, { k: "to", l: "الطالع °C", v: 13 }],
    run: (v) => { const dT = (v.ti - v.to) * 1.8; const s = 1.08 * v.cfm * dT; return `حمل محسوس ≈ ${b(s, 0, "BTU/h")} = ${b(s / 12000, 2, "طن")} (من غير الكامن)<br>الكلي غالباً أعلى بـ 20-35% حسب الرطوبة`; },
    f: "Q = 1.08 × cfm × ΔT°F" });
  C({ icon: "💧", t: "فلو المية المثلجة والمكثف", inputs: [{ k: "tr", l: "أطنان التبريد", v: 300 }, { k: "dt", l: "ΔT (°F)", v: 10 }],
    run: (v) => `مية مثلجة: ${b(24 * v.tr / v.dt, 0, "gpm")} = ${b(24 * v.tr / v.dt * 0.0631, 1, "L/s")}<br>مية مكثف: ${b(30 * v.tr / v.dt, 0, "gpm")} = ${b(30 * v.tr / v.dt * 0.0631, 1, "L/s")}`,
    f: "GPM = 24 × TR ÷ ΔT (مثلجة) و30 × TR ÷ ΔT (مكثف)" });
  C({ icon: "⚙️", t: "قدرة الطلمبة", inputs: [{ k: "q", l: "الفلو (م³/ساعة)", v: 100 }, { k: "h", l: "الضغط (م)", v: 30 }, { k: "e", l: "كفاءة الطلمبة %", v: 75 }, { k: "m", l: "كفاءة الموتور %", v: 92 }],
    run: (v) => { const sh = v.q * v.h / (367 * v.e / 100); return `قدرة العمود: ${b(sh, 2, "kW")} · كهربا داخلة: ${b(sh / (v.m / 100), 2, "kW")}<br>اختار موتور أكبر قياسي (هامش 10-20%)`; },
    f: "P = Q × H ÷ (367 × η)" });
  C({ icon: "🔄", t: "قوانين التشابه (VFD)", inputs: [{ k: "n", l: "السرعة الجديدة %", v: 80 }],
    run: (v) => { const r = v.n / 100; return `الفلو ${b(r * 100, 0)}% · الضغط ${b(r * r * 100, 0)}% · القدرة ${b(r ** 3 * 100, 0)}% (توفير ${b(100 - r ** 3 * 100, 0)}%)`; },
    f: "Q ∝ N · H ∝ N² · P ∝ N³" });
  C({ icon: "📏", t: "مقاس الدكت من الهوا والسرعة", inputs: [{ k: "cfm", l: "الهوا (cfm)", v: 2000 }, { k: "vel", l: "السرعة (م/ث)", v: 6 }, { k: "w", l: "عرض مقترح (مم)", v: 600 }],
    run: (v) => { const A = v.cfm / 2119 / v.vel; const d = Math.sqrt(4 * A / Math.PI) * 1000; const h = A / (v.w / 1000) * 1000; return `المساحة: ${b(A, 3, "م²")} · دايري: Ø ${b(d, 0, "مم")} · مستطيل: ${b(v.w, 0)} × ${b(h, 0, "مم")}`; },
    f: "A = Q ÷ V (والمستطيل نسبته الأحسن ≤ 1:4)" });
  C({ icon: "🚰", t: "قطر ماسورة مية من الفلو والسرعة", inputs: [{ k: "q", l: "الفلو (L/s)", v: 5 }, { k: "v", l: "السرعة (م/ث)", v: 1.5 }],
    run: (v) => { const d = Math.sqrt(4 * (v.q / 1000) / (Math.PI * v.v)) * 1000; return `القطر الداخلي ≈ ${b(d, 0, "مم")} (${b(d / 25.4, 2)} بوصة) → اختار المقاس القياسي اللي أكبر`; },
    f: "d = √(4Q ÷ πV)" });
  C({ icon: "🔥", t: "عدد الرشاشات التقريبي", inputs: [{ k: "a", l: "المساحة (م²)", v: 500 }, { k: "h", l: "الخطورة", v: "20.9", opts: [["20.9", "خفيفة (20.9 م²)"], ["12.1", "عادية (12.1 م²)"], ["9.3", "عالية (9.3 م²)"]] }],
    run: (v) => `أقل عدد ≈ ${b(Math.ceil(v.a / +v.h), 0)} رشاش (عملياً أكتر حسب الأبعاد والعوائق)`, f: "المساحة ÷ أقصى تغطية (NFPA 13)" });
  C({ icon: "🛢️", t: "حجم خزان الحريق", inputs: [{ k: "g", l: "فلو الطلمبة (gpm)", v: 750 }, { k: "m", l: "المدة (دقيقة)", v: 60 }],
    run: (v) => `الحجم ≈ ${b(v.g * v.m * 3.785 / 1000, 1, "م³")}`, f: "م³ = gpm × دقايق × 3.785 ÷ 1000" });
  C({ icon: "⚡", t: "تيار حمل 3 فاز أو 1 فاز", inputs: [{ k: "p", l: "القدرة (kW)", v: 15 }, { k: "ph", l: "النوع", v: "3", opts: [["3", "3 فاز 415V"], ["1", "1 فاز 240V"]] }, { k: "pf", l: "PF", v: 0.85 }, { k: "e", l: "الكفاءة (للموتور)", v: 0.9 }],
    run: (v) => { const I = v.ph === "3" ? v.p * 1000 / (1.732 * 415 * v.pf * v.e) : v.p * 1000 / (240 * v.pf * v.e); return `التيار ≈ ${b(I, 1, "A")}`; },
    f: "3φ: I = P ÷ (√3 × V × PF × η) · 1φ: I = P ÷ (V × PF × η)" });
  C({ icon: "🔌", t: "هبوط الجهد لكابل نحاس", inputs: [{ k: "i", l: "التيار (A)", v: 50 }, { k: "l", l: "الطول (م)", v: 80 }, { k: "s", l: "المقطع (مم²)", v: 16 }, { k: "ph", l: "النوع", v: "3", opts: [["3", "3 فاز"], ["1", "1 فاز"]] }],
    run: (v) => { const r = 0.0225 / v.s; const vd = v.ph === "3" ? 1.732 * v.i * v.l * r * 0.85 : 2 * v.i * v.l * r * 0.85; const pct = vd / (v.ph === "3" ? 415 : 240) * 100; return `الهبوط ≈ ${b(vd, 1, "V")} = ${b(pct, 2)}% ${pct > 4 ? '<span class="bad">(أكبر من 4%: كبّر الكابل)</span>' : '<span class="ok">✓</span>'}`; },
    f: "تقريبي بمقاومة النحاس 0.0225 Ω·مم²/م عند الحرارة وcosφ 0.85، ومن غير المفاعلة" });
  C({ icon: "🔋", t: "مكثفات تحسين معامل القدرة", inputs: [{ k: "p", l: "الحمل (kW)", v: 500 }, { k: "a", l: "PF الحالي", v: 0.8 }, { k: "t", l: "PF المطلوب", v: 0.95 }],
    run: (v) => { const k = v.p * (Math.tan(Math.acos(v.a)) - Math.tan(Math.acos(v.t))); return `المطلوب ≈ ${b(k, 0, "kVAR")}`; }, f: "kVAR = kW × (tan φ1 − tan φ2)" });
  C({ icon: "⛽", t: "مولد: kVA والتيار والوقود", inputs: [{ k: "kva", l: "قدرة المولد (kVA)", v: 500 }, { k: "ld", l: "التحميل %", v: 75 }],
    run: (v) => { const kw = v.kva * 0.8; return `kW = ${b(kw, 0)} · التيار الكامل ≈ ${b(v.kva * 1.39, 0, "A")} · الوقود على ${v.ld}% ≈ ${b(kw * v.ld / 100 * 0.27, 0, "لتر/ساعة")}`; }, f: "kW = kVA × 0.8 · I ≈ 1.39 × kVA · ≈ 0.27 L/kWh" });
  C({ icon: "🔋", t: "زمن بطارية UPS التقريبي", inputs: [{ k: "w", l: "الحمل (W)", v: 10000 }, { k: "n", l: "عدد البلوكات 12V", v: 32 }, { k: "ah", l: "سعة البلوك (Ah)", v: 40 }],
    run: (v) => { const wh = v.n * 12 * v.ah * 0.8 * 0.9; return `≈ ${b(wh / v.w * 60 * 0.7, 0, "دقيقة")} (تقريبي جداً، والتفريغ السريع بيقلل السعة؛ استخدم جدول الشركة)`; }, f: "Wh × عمق تفريغ × كفاءة × معامل معدل التفريغ ÷ الحمل" });
  C({ icon: "🗼", t: "مية البرج (تبخير وصرف وتعويض)", inputs: [{ k: "g", l: "الفلو (gpm)", v: 1500 }, { k: "r", l: "Range (°F)", v: 10 }, { k: "c", l: "COC", v: 4 }],
    run: (v) => { const e = 0.00085 * v.g * v.r; const bd = e / (v.c - 1); return `تبخير ${b(e, 1, "gpm")} · صرف ${b(bd, 1, "gpm")} · تعويض ≈ ${b(e + bd, 1, "gpm")} ≈ ${b((e + bd) * 0.227 * 24, 0, "م³/يوم")}`; }, f: "E = 0.00085 × gpm × Range · B = E ÷ (COC − 1)" });
  C({ icon: "📊", t: "MTBF / MTTR / Availability", inputs: [{ k: "h", l: "ساعات التشغيل", v: 4000 }, { k: "n", l: "عدد الأعطال", v: 4 }, { k: "r", l: "إجمالي ساعات الإصلاح", v: 20 }],
    run: (v) => { const mtbf = v.h / v.n, mttr = v.r / v.n; return `MTBF = ${b(mtbf, 0, "س")} · MTTR = ${b(mttr, 1, "س")} · Availability = ${b(mtbf / (mtbf + mttr) * 100, 2)}%`; }, f: "A = MTBF ÷ (MTBF + MTTR)" });
  C({ icon: "🌡️", t: "سوبرهيت وسبكول", inputs: [{ k: "st", l: "تشبع السكشن °C (من الضغط)", v: 5 }, { k: "sl", l: "حرارة خط السكشن °C", v: 12 }, { k: "ct", l: "تشبع التكثيف °C", v: 60 }, { k: "ll", l: "حرارة خط السائل °C", v: 55 }],
    run: (v) => { const sh = v.sl - v.st, sc = v.ct - v.ll; const c = (x, lo, hi) => x < lo ? '<span class="bad">واطي</span>' : x > hi ? '<span class="bad">عالي</span>' : '<span class="ok">طبيعي</span>'; return `السوبرهيت = ${b(sh)}°C ${c(sh, 4, 9)} · السبكول = ${b(sc)}°C ${c(sc, 3, 8)}`; }, f: "SH = خط السكشن − التشبع · SC = التشبع − خط السائل (نظام TXV)" });
})();

OM.addPath({ h: "الأساسيات (أسبوعين)", md: `- اقرا **أساسيات مهندس التشغيل والصيانة** كاملة، واحفظ التحويلات.\n- اقرا **أساسيات الكهربا من الصفر**، وطبّق على ملتيميتر حقيقي.\n- حل كويز الاتنين لحد ما توصل 85%.`, sys: ["om-basics", "elec-basics"] });
OM.addPath({ h: "التكييف (شهر)", md: `- ابدأ بالسبليت (دورة التبريد والسوبرهيت والسبكول)، وبعدين الـ VRF.\n- بعدين التشلرات والمياه المثلجة، والـ AHU والدكت، والأبراج، والتهوية.\n- **طبّق:** اقرا قرايات تشلر حقيقي واحسب الـ Approach.`, sys: ["split-dx", "vrf", "chillers", "ahu-fcu", "cooling-towers", "ventilation"] });
OM.addPath({ h: "الطلمبات والمعدات الدوارة (أسبوعين)", md: `- الطلمبات أهم معدة بعد التكييف: المنحنى والـ NPSH والسيل.\n- بعدين الاهتزازات والمحاذاة، والضواغط.`, sys: ["pumps", "vibration", "compressors"] });
OM.addPath({ h: "الصحي والحريق (3 أسابيع)", md: `- التغذية والصرف.\n- الرشاشات وطلمبات الحريق والإنذار والغازات. **ركّز على أرقام NFPA و KFD** لأنها بتتسأل.`, sys: ["water-supply", "drainage", "sprinklers", "fire-pumps", "fire-alarm", "clean-agent"] });
OM.addPath({ h: "الكهربا والطاقة (شهر)", md: `- اللوحات والكابلات، والمحولات، والمولدات والـ ATS، والـ UPS، والتأريض، والموتورات والـ VFD، والسولار.\n- **طبّق:** اقرا SLD لمبنى، واحسب تيار موتور وكابله.`, sys: ["lv-panels", "transformers", "generators", "ups", "earthing", "motors-vfd", "solar-pv"] });
OM.addPath({ h: "التحكم والتيار الخفيف والنقل الرأسي (أسبوعين)", md: `- الـ BMS (افهم الـ Trends)، وأنظمة التيار الخفيف، والمصاعد.`, sys: ["bms", "elv", "elevators"] });
OM.addPath({ h: "الإدارة: من مهندس لمدير (مستمر)", md: `- إدارة المرافق والصيانة: KPIs وCMMS والعقود والسلامة.\n- **الهدف النهائي:** تقدر تستلم مبنى، وتعمل خطة صيانة، وتدير فريق ومقاولين، وتقدم تقرير شهري بالأرقام.\n- **اختبر نفسك:** الامتحان الشامل في تاب الكويزات، لحد ما توصل 85%.`, sys: ["fm-management"] });
OM.addPath({ h: "اختياري: الصيانة المنزلية", md: `- الأجهزة المنزلية والصحي والكهربا والمدني والنجارة في البيت.`, sys: ["home-washer", "home-fridge", "home-stove", "home-oven", "home-microwave", "home-tv", "home-small", "home-plumbing", "home-electrical", "home-civil", "home-carpentry"] });

OM.addGlossary([
  ["ASHRAE", "American Society of Heating, Refrigerating & Air-Conditioning Engineers", "الجمعية الأمريكية لمهندسي التكييف"],
  ["NFPA", "National Fire Protection Association", "الجمعية الوطنية للحماية من الحريق (أمريكا)"],
  ["IEC", "International Electrotechnical Commission", "اللجنة الكهروتقنية الدولية"],
  ["SMACNA", "Sheet Metal & Air Conditioning Contractors' National Association", "مرجع الدكت"],
  ["MEW", "Ministry of Electricity & Water (Kuwait)", "وزارة الكهرباء والماء والطاقة المتجددة"],
  ["KFD", "Kuwait Fire Force (General Fire Directorate)", "قوة الإطفاء العام"],
  ["CAPT", "Central Agency for Public Tenders", "الجهاز المركزي للمناقصات العامة"],
  ["BOQ", "Bill of Quantities", "جدول الكميات"], ["Spec", "Specifications", "المواصفات"], ["Submittal", "Material / Shop drawing submittal", "تقديم للاعتماد"],
  ["T&C", "Testing & Commissioning", "الاختبار والتشغيل"], ["ITP", "Inspection & Test Plan", "خطة الفحص والاختبار"], ["QCP", "Quality Control Procedure", "إجراء ضبط الجودة"],
  ["RFI", "Request For Information", "طلب استيضاح"], ["NCR", "Non-Conformance Report", "تقرير عدم مطابقة"], ["Snag list", "Punch list", "قائمة النواقص"],
  ["O&M manual", "Operation & Maintenance manual", "دليل التشغيل والصيانة"], ["DLP", "Defects Liability Period", "فترة الضمان"], ["Warranty", "Warranty", "ضمان"],
  ["OEM", "Original Equipment Manufacturer", "الشركة المصنعة"], ["Spare parts", "Spares", "قطع الغيار"], ["Nameplate", "Rating plate", "لوحة البيانات"],
  ["Duty / Standby", "Duty / Standby equipment", "شغال / احتياطي"], ["N+1", "Redundancy", "وحدة احتياطية زيادة"], ["Lead / Lag", "Lead / Lag", "الأساسي / التابع"],
  ["Interlock", "Interlock", "ربط حماية"], ["Setpoint", "Setpoint", "القيمة المضبوطة"], ["Trip", "Trip", "فصل حماية"], ["Reset", "Reset", "إعادة ضبط"],
  ["Commissioning", "Commissioning", "التشغيل والاستلام"], ["Handover", "Handover", "التسليم"], ["Mobilization", "Mobilization", "التجهيز وبدء العقد"],
  ["Manpower", "Manpower", "العمالة"], ["Shift", "Shift", "وردية"], ["Call-out", "Emergency call-out", "استدعاء طارئ"],
]);
