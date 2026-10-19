(() => {
  "use strict";

  const STORAGE_KEY = "dawri-v1";
  const DAY = 864e5;
  const num = new Intl.NumberFormat("ar-EG");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Dates are handled as whole UTC day numbers to avoid timezone drift.
  const toDay = (iso) => (iso ? Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY) : null);
  const todayDay = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
  const fmtDay = (n, opts = { day: "numeric", month: "long", year: "numeric" }) => new Date(n * DAY).toLocaleDateString("ar-EG", { ...opts, timeZone: "UTC" });

  // ---------- Documents ----------
  // `when(s)` decides whether an item applies to the current selection.
  const DOCS = [
    { group: "الأساسيات", items: [
      { id: "passport", name: "جواز سفر صالح ٣ أشهر على الأقل بعد تاريخ العودة، صادر خلال آخر ١٠ سنوات، وفيه صفحتان فارغتان" },
      { id: "oldpass", name: "الجوازات القديمة ونسخ التأشيرات السابقة", note: "سجل سفر نظيف يقوّي ملفك كثيرًا" },
      { id: "form", name: "استمارة طلب التأشيرة معبّأة وموقّعة" },
      { id: "photo", name: "صورتان حديثتان ٣٥×٤٥ مم بخلفية فاتحة" },
      { id: "idcopy", name: "نسخة من بطاقة التعريف الوطنية البيومترية" },
      { id: "s12", name: "شهادة الميلاد الأصلية S12" },
      { id: "residence", name: "شهادة الإقامة حديثة" },
      { id: "apptconf", name: "رسالة تأكيد الموعد مطبوعة" },
      { id: "fee", name: "رسوم التأشيرة ورسوم الخدمة", note: "شنغن: ٩٠ € للبالغ، ٤٥ € للطفل ٦–١٢ سنة، مجانًا تحت ٦ سنوات — تُدفع بالدينار. رسوم الخدمة تُدفع غالبًا على الإنترنت عند الحجز" },
    ]},
    { group: "الرحلة والإقامة", items: [
      { id: "insurance", name: "تأمين سفر يغطي ٣٠٬٠٠٠ € على الأقل، لكل دول شنغن وكامل مدة الإقامة" },
      { id: "flight", name: "حجز طيران ذهاب وعودة", note: "يكفي غالبًا حجز مؤكد دون شراء التذكرة" },
      { id: "hotel", name: "حجز فندق يغطي كل الليالي", when: (s) => s.type !== "family" && s.type !== "study" },
      { id: "itinerary", name: "برنامج الرحلة يومًا بيوم", when: (s) => s.type === "tourism" },
      { id: "invite", name: "شهادة استقبال / دعوة من المضيف مصادق عليها", when: (s) => s.type === "family" },
      { id: "hostid", name: "نسخة من هوية المضيف أو بطاقة إقامته", when: (s) => s.type === "family" },
      { id: "kinship", name: "إثبات القرابة مع المضيف (الدفتر العائلي، شهادات الميلاد S12)", when: (s) => s.type === "family" },
      { id: "housing", name: "إثبات السكن في بلد الدراسة", when: (s) => s.type === "study" },
    ]},
    { group: "الوضع المالي والمهني", items: [
      { id: "bank", name: "كشف حساب بنكي أو بريدي (CCP) لآخر ٣ أشهر، مختوم", note: "اطلبه قبل الموعد بأيام قليلة ليكون حديثًا", when: (s) => s.status !== "none" },
      { id: "work", name: "شهادة عمل (Attestation de travail) حديثة — أقل من شهر", when: (s) => s.status === "employee" },
      { id: "payslips", name: "آخر ٣ كشوف رواتب (Fiches de paie)", when: (s) => s.status === "employee" },
      { id: "leave", name: "إذن بالعطلة موقّع من المشغّل يغطي تواريخ السفر", when: (s) => s.status === "employee" },
      { id: "cnas", name: "شهادة الانتساب للضمان الاجتماعي (CNAS)", when: (s) => s.status === "employee" },
      { id: "rc", name: "السجل التجاري، مستخرج الضرائب، وشهادة الانتساب لـ CASNOS", when: (s) => s.status === "self" },
      { id: "bizbank", name: "كشف حساب الشركة أو النشاط", when: (s) => s.status === "self" },
      { id: "school", name: "شهادة مدرسية / جامعية حديثة", when: (s) => s.status === "student" },
      { id: "absence", name: "إذن بالغياب من المؤسسة التعليمية (إن كان السفر خارج العطل)", when: (s) => s.status === "student" },
      { id: "pension", name: "شهادة التقاعد وآخر كشوف المعاش (CNR)", when: (s) => s.status === "retired" },
      { id: "sponsor", name: "تعهّد بالتكفّل موقّع من الكفيل", when: (s) => s.status === "none" || s.status === "student" },
      { id: "sponsordocs", name: "وثائق دخل الكفيل: شهادة عمل، كشوف رواتب، كشف حساب", when: (s) => s.status === "none" || s.status === "student" },
      { id: "ties", name: "ما يثبت ارتباطك ببلدك: عقد سكن، ملكية، عائلة", note: "أهم ما تبحث عنه القنصلية: أنك ستعود" },
    ]},
    { group: "خاص بنوع التأشيرة", items: [
      { id: "bizinvite", name: "دعوة من الشركة المضيفة تذكر سبب الزيارة ومدتها", when: (s) => s.type === "business" },
      { id: "mission", name: "أمر بالمهمة من شركتك", when: (s) => s.type === "business" },
      { id: "admission", name: "قبول نهائي من المؤسسة التعليمية", when: (s) => s.type === "study" },
      { id: "funds", name: "إثبات التمويل للدراسة (منحة، حساب مجمّد، كفالة)", when: (s) => s.type === "study" },
      { id: "diplomas", name: "الشهادات وكشوف النقاط مترجمة (ترجمة رسمية معتمدة)", when: (s) => s.type === "study" },
      { id: "studynote", name: "تحقّقت من أن الدراسة الطويلة تحتاج تأشيرة وطنية (D) وإجراءات خاصة بكل بلد", when: (s) => s.type === "study" },
      { id: "medreport", name: "تقرير طبي مفصّل من طبيبك", when: (s) => s.type === "medical" },
      { id: "hospital", name: "قبول أو موعد من المستشفى في بلد العلاج", when: (s) => s.type === "medical" },
      { id: "medpay", name: "إثبات دفع تكاليف العلاج أو التكفل بها", when: (s) => s.type === "medical" },
    ]},
    { group: "للقاصرين", items: [
      { id: "birth", name: "شهادة ميلاد القاصر", when: (s) => s.who === "minor" },
      { id: "parental", name: "ترخيص أبوي بالسفر مصادق عليه في البلدية", when: (s) => s.who === "minor" },
      { id: "parentsid", name: "نسخ هويات الوالدين", when: (s) => s.who === "minor" },
    ]},
  ];

  const QA = [
    ["ما سبب زيارتك؟", "جواب واحد واضح يطابق نوع التأشيرة ووثائقك. لا تذكر أسبابًا إضافية لا دليل عليها."],
    ["كم ستبقى؟ ومتى تعود؟", "اذكر التواريخ نفسها الموجودة في حجز الطيران والتأمين بالضبط."],
    ["أين ستقيم؟", "اسم الفندق أو عنوان المضيف كما في الوثائق. احفظه قبل الموعد."],
    ["ما عملك؟ وكم دخلك؟", "أجب بدقة ودون مبالغة. سيُقارن جوابك بكشف الراتب وكشف الحساب."],
    ["من سيدفع تكاليف الرحلة؟", "أنت أو كفيلك — وأظهر الوثيقة التي تثبت ذلك."],
    ["لماذا ستعود إلى بلدك؟", "أهم سؤال. تحدّث عن عملك، دراستك، عائلتك، ممتلكاتك — كل ما يربطك ببلدك."],
    ["هل لديك أقارب في هذا البلد؟", "قل الحقيقة دائمًا. إخفاء قريب ثم اكتشافه سبب شائع للرفض."],
    ["هل سافرت إلى أوروبا من قبل؟", "اذكر سفراتك السابقة، وأحضر الجوازات القديمة كدليل على احترامك لمدد الإقامة."],
  ];

  // ---------- State ----------
  const blank = () => ({ tab: "docs", type: "tourism", status: "employee", who: "adult", checked: {}, apptDate: "", apptTime: "", tripDate: "", apptPlace: "", stays: [{ in: "", out: "" }], planIn: "", planOut: "" });
  let state = (() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return Object.assign(blank(), JSON.parse(raw)); } catch (_) {}
    return blank();
  })();
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} };

  // ---------- Tabs ----------
  function showTab(tab) {
    state.tab = tab;
    $$("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    $$(".tool").forEach((t) => t.classList.toggle("active", t.id === "tool-" + tab));
    save();
  }

  // ---------- Documents ----------
  function activeDocs() {
    return DOCS.map((g) => ({ group: g.group, items: g.items.filter((i) => !i.when || i.when(state)) })).filter((g) => g.items.length);
  }

  function renderDocs() {
    $("#docList").innerHTML = activeDocs().map((g) => `<h4>${g.group}</h4>` + g.items.map((i) =>
      `<label><input type="checkbox" data-doc="${i.id}" ${state.checked[i.id] ? "checked" : ""}><span>${esc(i.name)}${i.note ? `<span class="doc-note">${esc(i.note)}</span>` : ""}</span></label>`
    ).join("")).join("");
    updateDocProgress();
  }

  function updateDocProgress() {
    const ids = activeDocs().flatMap((g) => g.items.map((i) => i.id));
    const pct = Math.round((ids.filter((id) => state.checked[id]).length / ids.length) * 100);
    $("#docBar").style.width = pct + "%";
    $("#docPct").textContent = num.format(pct) + "٪";
  }

  // ---------- Appointment ----------
  const STEPS = [
    [-21, "اطلب شهادة العمل وكشوف الراتب أو وثائق نشاطك — بعض الإدارات تتأخر."],
    [-14, "احجز الطيران والفندق بحجوزات قابلة للإلغاء، وجهّز برنامج الرحلة."],
    [-7, "اشترِ تأمين السفر، والتقط الصور بالمقاس المطلوب."],
    [-5, "اطلب كشف الحساب البنكي المختوم ليكون حديثًا يوم الموعد."],
    [-3, "املأ الاستمارة ووقّعها، ورتّب الملف بترتيب قائمة الوثائق مع نسخة من كل وثيقة."],
    [-1, "اطبع تأكيد الموعد، راجع الملف مرة أخيرة، وتأكد من الطريق ووقت الوصول."],
    [0, "احضر قبل الموعد بـ ٢٠ دقيقة بالأصول والنسخ. لا تحمل أجهزة غير ضرورية."],
    [15, "مدة المعالجة المعتادة حوالي ١٥ يومًا، وقد تمتد إلى ٤٥ يومًا. تابع ملفك برقم الطلب."],
  ];

  function renderAppt() {
    const out = $("#apptOut");
    const appt = toDay(state.apptDate);
    if (appt === null) { out.innerHTML = `<p class="empty">أدخل تاريخ موعدك لعرض العدّاد والخطة.</p>`; return; }
    const today = todayDay();
    const left = appt - today;
    const trip = toDay(state.tripDate);
    const warns = [];
    if (trip !== null) {
      const gap = trip - appt;
      if (gap < 0) warns.push("تاريخ السفر قبل الموعد! راجع التواريخ.");
      else if (gap < 15) warns.push(`بين الموعد والسفر ${num.format(gap)} يومًا فقط — أقل من مدة المعالجة المعتادة (١٥ يومًا). احجز تذاكر قابلة للتعديل.`);
      if (gap > 183) warns.push("لا يمكن عادةً تقديم طلب شنغن قبل أكثر من ٦ أشهر من السفر.");
    }

    const nowIdx = STEPS.findIndex(([off]) => appt + off >= today);

    out.innerHTML = `
      <div class="result">
        ${left > 0 ? `<div class="countdown">
            <div><b>${num.format(left)}</b>يومًا</div>
            ${left >= 14 ? `<div><b>${num.format(Math.floor(left / 7))}</b>أسابيع</div>` : ""}
          </div>
          <p style="margin:12px 0 0">موعدك يوم <b>${fmtDay(appt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b>${state.apptTime ? ` الساعة <b>${esc(state.apptTime)}</b>` : ""}${state.apptPlace ? ` في <b>${esc(state.apptPlace)}</b>` : ""}.</p>`
        : left === 0 ? `<div class="big">اليوم موعدك! بالتوفيق 🤞</div>` : `<div class="big">مرّ الموعد منذ ${num.format(-left)} يومًا</div>`}
      </div>
      ${warns.map((w) => `<div class="warn" style="margin-top:12px">${esc(w)}</div>`).join("")}
      <ol class="timeline">
        ${STEPS.map(([off, text], i) => {
          const d = appt + off;
          const cls = d < today ? "past" : i === nowIdx ? "now" : "";
          return `<li class="${cls}"><time>${off === 0 ? "يوم الموعد" : off < 0 ? `قبل ${num.format(-off)} يوم` : `بعد ${num.format(off)} يومًا`}<br>${fmtDay(d, { day: "numeric", month: "short" })}</time><span>${cls === "now" ? "<b>الآن ← </b>" : ""}${esc(text)}</span></li>`;
        }).join("")}
      </ol>`;
  }

  // ---------- 90/180 ----------
  function renderStays() {
    $("#stays").innerHTML = state.stays.map((s, i) => `<div class="stay" data-i="${i}">
      <label>الدخول<input type="date" data-k="in" value="${esc(s.in)}"></label>
      <label>الخروج<input type="date" data-k="out" value="${esc(s.out)}"></label>
      <button type="button" class="remove" data-remove aria-label="حذف">×</button>
    </div>`).join("");
  }

  function computeCalc() {
    const out = $("#calcOut");
    const days = new Set();
    let invalid = false;
    for (const s of state.stays) {
      const a = toDay(s.in), b = toDay(s.out);
      if (a === null || b === null) continue;
      if (b < a) { invalid = true; continue; }
      for (let d = a; d <= b; d++) days.add(d);
    }
    const usedOn = (D, set) => { let n = 0; for (const d of set) if (d <= D && d > D - 180) n++; return n; };

    const pin = toDay(state.planIn), pout = toDay(state.planOut);
    const today = todayDay();
    let html = invalid ? `<div class="warn" style="margin-top:12px">في إحدى الإقامات تاريخ الخروج قبل الدخول — تم تجاهلها.</div>` : "";

    if (pin === null) {
      const used = usedOn(today, days);
      html += `<div class="result ${used > 90 ? "bad" : ""}"><div class="big">${num.format(Math.max(0, 90 - used))} يومًا</div>
        <p style="margin:6px 0 0">متبقية لك اليوم. استهلكت <b>${num.format(used)}</b> يومًا من ٩٠ خلال آخر ١٨٠ يومًا. أدخل رحلتك المقبلة لمعرفة أقصى مدة مسموحة.</p></div>`;
      out.innerHTML = html;
      return;
    }

    // Longest stay starting at pin that never exceeds 90 days in any rolling window.
    const trial = new Set(days);
    let maxLen = 0;
    for (let d = pin; d < pin + 90; d++) {
      trial.add(d);
      if (usedOn(d, trial) > 90) break;
      maxLen++;
    }

    if (maxLen === 0) {
      html += `<div class="result bad"><div class="big">لا يمكنك الدخول</div><p style="margin:6px 0 0">في ${fmtDay(pin)} تكون قد استهلكت ٩٠ يومًا بالفعل. جرّب تاريخًا لاحقًا.</p></div>`;
    } else {
      const lastOk = pin + maxLen - 1;
      html += `<div class="result"><div class="big">${num.format(maxLen)} يومًا</div>
        <p style="margin:6px 0 0">أقصى مدة يمكنك البقاء فيها إن دخلت يوم ${fmtDay(pin)} — آخر يوم مسموح: <b>${fmtDay(lastOk)}</b>.</p></div>`;
      if (pout !== null) {
        if (pout < pin) html += `<div class="warn" style="margin-top:12px">تاريخ الخروج قبل تاريخ الدخول.</div>`;
        else if (pout <= lastOk) html += `<div class="result" style="margin-top:12px">✓ رحلتك (${num.format(pout - pin + 1)} يومًا) ضمن المسموح.</div>`;
        else html += `<div class="result bad" style="margin-top:12px">✗ رحلتك (${num.format(pout - pin + 1)} يومًا) تتجاوز المسموح بـ ${num.format(pout - lastOk)} يومًا. تجاوز المدة قد يعرّضك لغرامة أو منع من الدخول.</div>`;
      }
    }
    out.innerHTML = html;
  }

  // ---------- Bind ----------
  function bind() {
    $$("[data-tab]").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

    ["vType", "vStatus", "vWho"].forEach((id, i) => {
      const key = ["type", "status", "who"][i];
      $("#" + id).value = state[key];
      $("#" + id).addEventListener("change", (e) => { state[key] = e.target.value; renderDocs(); save(); });
    });
    $("#docList").addEventListener("change", (e) => {
      if (!e.target.dataset.doc) return;
      state.checked[e.target.dataset.doc] = e.target.checked;
      updateDocProgress(); save();
    });

    ["apptDate", "apptTime", "tripDate", "apptPlace"].forEach((id) => {
      $("#" + id).value = state[id];
      $("#" + id).addEventListener("input", (e) => { state[id] = e.target.value; renderAppt(); save(); });
    });

    ["planIn", "planOut"].forEach((id) => {
      $("#" + id).value = state[id];
      $("#" + id).addEventListener("input", (e) => { state[id] = e.target.value; computeCalc(); save(); });
    });
    $("#stays").addEventListener("input", (e) => {
      const row = e.target.closest(".stay");
      if (!row || !e.target.dataset.k) return;
      state.stays[+row.dataset.i][e.target.dataset.k] = e.target.value;
      computeCalc(); save();
    });
    $("#stays").addEventListener("click", (e) => {
      if (!e.target.closest("[data-remove]")) return;
      state.stays.splice(+e.target.closest(".stay").dataset.i, 1);
      if (!state.stays.length) state.stays.push({ in: "", out: "" });
      renderStays(); computeCalc(); save();
    });
    $("#addStay").addEventListener("click", () => { state.stays.push({ in: "", out: "" }); renderStays(); save(); });

    $("#qaList").innerHTML = QA.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");

    $("#themeToggle").addEventListener("click", () => {
      const root = document.documentElement;
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("sanad-theme", root.dataset.theme); } catch (_) {}
    });
  }

  try { const t = localStorage.getItem("sanad-theme"); if (t) document.documentElement.dataset.theme = t; } catch (_) {}

  bind();
  renderDocs();
  renderAppt();
  renderStays();
  computeCalc();
  showTab(state.tab);
})();
