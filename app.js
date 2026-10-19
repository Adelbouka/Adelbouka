(() => {
  "use strict";

  const STORAGE_KEY = "sanad-plan-v1";
  const num = new Intl.NumberFormat("ar-EG");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const val = (s, fallback = "—") => (String(s ?? "").trim() ? esc(s) : `<span class="empty">${fallback}</span>`);

  const BLOOD = ["", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

  const HAZARDS = [
    { id: "quake", icon: "🌍", name: "زلزال", steps: [
      "انزل – احتمِ – تمسّك: تحت طاولة متينة بعيدًا عن النوافذ والخزائن العالية.",
      "لا تركض للخارج أثناء الاهتزاز، ولا تستخدم المصعد.",
      "بعد التوقف: افصل الغاز والكهرباء، واخرج بحذر إلى نقطة الالتقاء الأولى.",
      "توقّع هزّات ارتدادية، ولا تعد إلى مبنى متصدّع."] },
    { id: "flood", icon: "🌊", name: "فيضان / سيول", steps: [
      "اصعد إلى مكان مرتفع فورًا، ولا تنتظر أوامر الإخلاء إن ارتفع الماء.",
      "لا تقطع الأودية أو الطرق المغمورة سيرًا أو بالسيارة — ٣٠ سم من الماء الجاري تجرف سيارة.",
      "افصل الكهرباء إن وصل الماء إلى المقابس.",
      "اعتبر ماء الصنبور ملوّثًا حتى يُعلن عكس ذلك."] },
    { id: "fire", icon: "🔥", name: "حريق منزلي", steps: [
      "اخرج فورًا وأغلق الأبواب خلفك، ولا تعد لأخذ أي شيء.",
      "ازحف تحت الدخان، وتحسّس الباب بظهر يدك قبل فتحه.",
      "إن اشتعلت ملابسك: قف – انبطح – تدحرج.",
      "التقِ عند نقطة الالتقاء الأولى وعُدّ الأفراد، ثم اتصل بالدفاع المدني."] },
    { id: "heat", icon: "☀️", name: "موجة حر", steps: [
      "ابقَ في الداخل بين ١١ صباحًا و٤ عصرًا، واشرب الماء قبل الشعور بالعطش.",
      "انتبه لكبار السن والرضّع والمرضى — هم الأكثر عرضة لضربة الشمس.",
      "علامات الخطر: حرارة مرتفعة، ارتباك، توقّف التعرّق — اتصل بالإسعاف وبرّد الجسم فورًا.",
      "لا تترك طفلًا أو حيوانًا في سيارة مغلقة ولو لدقائق."] },
    { id: "dust", icon: "🌪️", name: "عاصفة رملية", steps: [
      "أغلق النوافذ وسدّ الفتحات بمناشف مبللة.",
      "جهّز أدوية الربو وأجهزة الاستنشاق، وارتدِ كمامة عند الخروج.",
      "إن كنت تقود: ابتعد عن الطريق وأطفئ الأضواء الخلفية كي لا يتبعك أحد."] },
    { id: "power", icon: "🔌", name: "انقطاع كهرباء طويل", steps: [
      "استخدم المصابيح اليدوية بدل الشموع لتقليل خطر الحريق.",
      "لا تشغّل المولّد أو موقد الفحم داخل البيت — خطر الاختناق بأول أكسيد الكربون.",
      "أبقِ الثلاجة مغلقة: يبقى الطعام باردًا ٤ ساعات تقريبًا، والمجمّد ٢٤ ساعة.",
      "اشحن بنك الطاقة والهواتف مسبقًا وخفّض سطوع الشاشة."] },
    { id: "evac", icon: "🚗", name: "إخلاء / نزوح", steps: [
      "خذ حقيبة الطوارئ والوثائق والأدوية فقط — لا وقت لغيرها.",
      "اترك رسالة على الباب أو أرسل للجهة البعيدة: إلى أين ذهبتم ومتى.",
      "اتبع الطرق التي تحددها السلطات، واتجه إلى نقطة الالتقاء الثالثة.",
      "أبقِ خزان الوقود نصف ممتلئ دائمًا في الأوقات المتوترة."] },
    { id: "storm", icon: "⛈️", name: "عاصفة / إعصار", steps: [
      "ثبّت أو أدخل الأغراض الموجودة على الشرفة والسطح.",
      "ابتعد عن النوافذ، والجأ إلى غرفة داخلية.",
      "لا تخرج في \"هدوء عين العاصفة\" — الرياح ستعود من الاتجاه المعاكس."] },
  ];

  // Kit items; qty(ctx) returns a string or null to hide the item.
  const KIT = [
    { group: "الماء والغذاء", items: [
      { id: "water", name: "ماء الشرب", qty: (c) => `${num.format(c.people * 3 * c.days)} لتر (٣ لتر/شخص/يوم)` },
      { id: "food", name: "طعام لا يحتاج طبخًا (معلبات، تمر، بسكويت)", qty: (c) => `${num.format(c.people * c.days * 3)} وجبة` },
      { id: "opener", name: "فتّاحة علب يدوية وأدوات أكل", qty: () => "" },
      { id: "baby", name: "حليب أطفال، حفاضات، رضّاعة", qty: (c) => c.infants ? `لـ ${num.format(c.infants)} رضيع × ${num.format(c.days)} أيام` : null },
      { id: "pets", name: "طعام وماء للحيوانات الأليفة", qty: (c) => c.pets ? `${num.format(c.days)} أيام` : null },
    ]},
    { group: "الصحة والإسعاف", items: [
      { id: "firstaid", name: "حقيبة إسعافات أولية", qty: () => "" },
      { id: "meds", name: "الأدوية المزمنة للعائلة", qty: (c) => c.medsList.length ? `${num.format(Math.max(14, c.days))} يومًا: ${c.medsList.join("، ")}` : "احتياط أسبوعين" },
      { id: "masks", name: "كمامات ومعقّم يدين", qty: (c) => `${num.format(c.people * 5)} كمامة` },
      { id: "hygiene", name: "مستلزمات نظافة شخصية وفوط صحية", qty: () => "" },
      { id: "elder", name: "نظارات احتياطية، سماعات، عكاز للكبار", qty: (c) => c.elderly ? `لـ ${num.format(c.elderly)} من كبار السن` : null },
    ]},
    { group: "الأدوات", items: [
      { id: "torch", name: "مصباح يدوي + بطاريات احتياطية", qty: (c) => `${num.format(Math.max(2, Math.ceil(c.people / 2)))} مصباح` },
      { id: "radio", name: "راديو بالبطاريات أو بالتعبئة اليدوية", qty: () => "" },
      { id: "powerbank", name: "بنك طاقة مشحون وكوابل", qty: () => "" },
      { id: "whistle", name: "صفّارة لطلب النجدة", qty: (c) => `${num.format(c.people)} صفّارة` },
      { id: "tools", name: "سكين متعددة الاستخدام، شريط لاصق، أكياس قمامة", qty: () => "" },
      { id: "blanket", name: "بطانيات حرارية وملابس احتياطية", qty: (c) => `${num.format(c.people)} طقم` },
    ]},
    { group: "الوثائق والمال", items: [
      { id: "docs", name: "نسخ من الهويات وجوازات السفر وعقود البيت في كيس مقاوم للماء", qty: () => "" },
      { id: "usb", name: "نسخة رقمية مشفّرة على ذاكرة USB", qty: () => "" },
      { id: "cash", name: "نقود ورقية بفئات صغيرة", qty: () => "تكفي لأسبوع على الأقل" },
      { id: "keys", name: "مفاتيح احتياطية للبيت والسيارة", qty: () => "" },
      { id: "planCopy", name: "نسخة مطبوعة من هذه الخطة", qty: () => "" },
      { id: "kids", name: "لعبة صغيرة أو كتاب للأطفال لتهدئتهم", qty: (c) => c.children ? "" : null },
    ]},
  ];

  const STEP_COUNT = 5;

  const blank = () => ({
    step: 0,
    fields: { days: "3" },
    members: [{ name: "", age: "", blood: "", phone: "", allergies: "", meds: "" }],
    contacts: [
      { name: "", relation: "", phone: "", where: "داخل المدينة" },
      { name: "", relation: "", phone: "", where: "خارج المدينة" },
    ],
    hazards: ["fire", "power"],
    kit: {},
    done: false,
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
    } catch (_) { /* storage unavailable or corrupt */ }
    return blank();
  }

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        flash("✓ تم الحفظ على هذا الجهاز");
      } catch (_) {
        flash("تعذّر الحفظ في المتصفح — استخدم «تصدير نسخة»");
      }
    }, 300);
  }

  function flash(msg) {
    const el = $("#savedNote");
    el.textContent = msg;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => (el.textContent = ""), 2200);
  }

  // ---------- Context for computed quantities ----------
  function context() {
    const people = state.members.filter((m) => m.name.trim() || m.age !== "").length || 1;
    const ages = state.members.map((m) => parseInt(m.age, 10)).filter((n) => !isNaN(n));
    return {
      people,
      days: parseInt(state.fields.days, 10) || 3,
      infants: ages.filter((a) => a < 2).length,
      children: ages.filter((a) => a < 13).length,
      elderly: ages.filter((a) => a >= 65).length,
      pets: !!state.fields.hasPets,
      medsList: state.members.filter((m) => m.meds.trim()).map((m) => `${m.name || "فرد"} (${m.meds.trim()})`),
    };
  }

  function kitItems() {
    const c = context();
    return KIT.map((g) => ({
      group: g.group,
      items: g.items.map((it) => ({ ...it, q: it.qty(c) })).filter((it) => it.q !== null),
    }));
  }

  // ---------- Rendering: form ----------
  function renderStepper() {
    const titles = $$(".step").map((s) => s.dataset.title).concat("الخطة");
    $("#stepper").innerHTML = titles
      .map((t, i) => {
        const cur = state.done ? STEP_COUNT : state.step;
        const cls = i === cur ? "active" : i < cur ? "done" : "";
        return `<li class="${cls}" data-go="${i}" tabindex="0" role="button">${t}</li>`;
      })
      .join("");
  }

  function memberRow(m, i) {
    return `<div class="row member" data-i="${i}">
      <button type="button" class="remove" data-remove="member" aria-label="حذف">×</button>
      <label>الاسم<input data-k="name" value="${esc(m.name)}" placeholder="الاسم الأول"></label>
      <label>العمر<input data-k="age" type="number" min="0" max="120" inputmode="numeric" value="${esc(m.age)}"></label>
      <label>فصيلة الدم<select data-k="blood">${BLOOD.map((b) => `<option ${b === m.blood ? "selected" : ""} value="${b}">${b || "—"}</option>`).join("")}</select></label>
      <label>الهاتف<input data-k="phone" inputmode="tel" value="${esc(m.phone)}"></label>
      <label class="wide">الحساسية<input data-k="allergies" value="${esc(m.allergies)}" placeholder="أدوية، أطعمة…"></label>
      <label class="wide">أدوية دائمة / حالة صحية<input data-k="meds" value="${esc(m.meds)}" placeholder="مثال: إنسولين، ضغط"></label>
    </div>`;
  }

  function contactRow(c, i) {
    return `<div class="row contact" data-i="${i}">
      <button type="button" class="remove" data-remove="contact" aria-label="حذف">×</button>
      <label>الاسم<input data-k="name" value="${esc(c.name)}"></label>
      <label>صلة القرابة<input data-k="relation" value="${esc(c.relation)}" placeholder="خال، جار…"></label>
      <label>الهاتف<input data-k="phone" inputmode="tel" value="${esc(c.phone)}"></label>
      <label>المكان<select data-k="where">${["داخل المدينة", "خارج المدينة", "خارج البلد"].map((w) => `<option ${w === c.where ? "selected" : ""}>${w}</option>`).join("")}</select></label>
    </div>`;
  }

  function renderRows() {
    $("#members").innerHTML = state.members.map(memberRow).join("");
    $("#contacts").innerHTML = state.contacts.map(contactRow).join("");
  }

  function renderHazards() {
    $("#hazards").innerHTML = HAZARDS.map(
      (h) => `<label class="chip"><input type="checkbox" value="${h.id}" ${state.hazards.includes(h.id) ? "checked" : ""}><span>${h.icon} ${h.name}</span></label>`
    ).join("");
  }

  function renderKit() {
    $("#kit").innerHTML = kitItems()
      .map((g) => `<h4>${g.group}</h4>` + g.items.map((it) =>
        `<label><input type="checkbox" data-kit="${it.id}" ${state.kit[it.id] ? "checked" : ""}><span>${esc(it.name)}${it.q ? `<em>${esc(it.q)}</em>` : ""}</span></label>`
      ).join(""))
      .join("");
    updateKitProgress();
  }

  function updateKitProgress() {
    const ids = kitItems().flatMap((g) => g.items.map((i) => i.id));
    const pct = ids.length ? Math.round((ids.filter((id) => state.kit[id]).length / ids.length) * 100) : 0;
    $("#kitBar").style.width = pct + "%";
    $("#kitPct").textContent = num.format(pct) + "٪";
    return pct;
  }

  function fillFields() {
    const form = $("#planForm");
    $$("input[name], select[name]", form).forEach((el) => {
      const v = state.fields[el.name];
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = v ?? (el.tagName === "SELECT" ? el.options[0].value : "");
    });
  }

  function showStep() {
    $$(".step").forEach((s, i) => s.classList.toggle("active", i === state.step));
    $("#prevBtn").disabled = state.step === 0;
    $("#nextBtn").textContent = state.step === STEP_COUNT - 1 ? "أنشئ الخطة ✓" : "التالي ←";
    if (state.step === 4) renderKit();
    renderStepper();
  }

  function showForm() {
    state.done = false;
    $("#plan").hidden = true;
    $("#planForm").hidden = false;
    showStep();
  }

  // ---------- Rendering: plan ----------
  function renderPlan() {
    const f = state.fields;
    const c = context();
    const members = state.members.filter((m) => m.name.trim());
    const contacts = state.contacts.filter((x) => x.name.trim() || x.phone.trim());
    const far = contacts.find((x) => x.where !== "داخل المدينة") || contacts[0];
    const hazards = HAZARDS.filter((h) => state.hazards.includes(h.id));
    const today = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
    const review = new Date(Date.now() + 182 * 864e5).toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
    const pct = updateKitProgress();
    const missing = kitItems().flatMap((g) => g.items).filter((i) => !state.kit[i.id]);

    const tips = [];
    if (!far) tips.push("لم تُضف أي جهة اتصال — أضف قريبًا خارج المدينة على الأقل.");
    else if (!contacts.some((x) => x.where !== "داخل المدينة")) tips.push("كل جهات الاتصال داخل المدينة؛ أضف شخصًا خارجها ليكون مركز الأخبار.");
    if (!f.meet1 || !f.meet2) tips.push("حدّد نقطتي الالتقاء الأولى والثانية على الأقل.");
    if (c.children && !f.codeword) tips.push("لديك أطفال: اختر كلمة سر عائلية لحمايتهم.");
    if (pct < 100) tips.push(`حقيبة الطوارئ جاهزة بنسبة ${num.format(pct)}٪ فقط.`);

    $("#planOut").innerHTML = `
      <article class="doc">
        <div class="doc-head">
          <div><h2>خطة طوارئ ${val(f.familyName, "عائلتنا")}</h2><div class="muted">${val(f.city, "")} ${f.address ? "· " + esc(f.address) : ""}</div></div>
          <div class="muted small">أُعدّت في ${today}<br>المراجعة القادمة: ${review}</div>
        </div>

        ${tips.length ? `<section class="warn no-print"><b>لتقوية خطتك:</b><ul>${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}

        <section>
          <h3>أرقام الطوارئ</h3>
          <table><tbody>
            <tr><th>الإسعاف</th><td>${val(f.ambulance)}</td><th>الدفاع المدني</th><td>${val(f.fire)}</td><th>الشرطة</th><td>${val(f.police)}</td></tr>
            <tr><th>الطبيب</th><td colspan="2">${val(f.doctor)}</td><th>المدرسة</th><td colspan="2">${val(f.school)}</td></tr>
          </tbody></table>
        </section>

        <section>
          <h3>جهات الاتصال العائلية</h3>
          ${contacts.length ? `<table><thead><tr><th>الاسم</th><th>الصلة</th><th>الهاتف</th><th>المكان</th></tr></thead><tbody>
            ${contacts.map((x) => `<tr><td>${val(x.name)}${x === far ? " ⭐" : ""}</td><td>${val(x.relation)}</td><td dir="ltr" style="text-align:right">${val(x.phone)}</td><td>${esc(x.where)}</td></tr>`).join("")}
          </tbody></table><p class="muted small">⭐ مركز الأخبار: يتصل به الجميع ويخبرونه بمكانهم. الرسائل النصية تصل غالبًا حين تفشل المكالمات.</p>` : `<p class="empty">لا توجد جهات اتصال.</p>`}
        </section>

        <section>
          <h3>نقاط الالتقاء</h3>
          <div class="meet">
            <div><small>١ — قرب البيت</small>${val(f.meet1)}</div>
            <div><small>٢ — خارج الحي</small>${val(f.meet2)}</div>
            <div><small>٣ — خارج المدينة</small>${val(f.meet3)}</div>
          </div>
          <p class="small">من يأخذ الأطفال من المدرسة: <b>${val(f.pickup)}</b> · كلمة السر: <b>${f.codeword ? "محفوظة لدى العائلة (لا تُطبع)" : "—"}</b></p>
        </section>

        <section>
          <h3>أفراد العائلة والمعلومات الطبية</h3>
          ${members.length ? `<table><thead><tr><th>الاسم</th><th>العمر</th><th>الدم</th><th>الهاتف</th><th>الحساسية</th><th>أدوية / حالة</th></tr></thead><tbody>
            ${members.map((m) => `<tr><td><b>${esc(m.name)}</b></td><td>${val(m.age)}</td><td>${val(m.blood)}</td><td dir="ltr" style="text-align:right">${val(m.phone)}</td><td>${val(m.allergies, "لا يوجد")}</td><td>${val(m.meds, "لا يوجد")}</td></tr>`).join("")}
          </tbody></table>` : `<p class="empty">لم يُضف أفراد بعد.</p>`}
        </section>

        <section class="two">
          <div>
            <h3>في البيت</h3>
            <ul>
              <li>قاطع الكهرباء: <b>${val(f.breaker)}</b></li>
              <li>الماء / الغاز: <b>${val(f.valves)}</b></li>
              <li>حقيبة الطوارئ: <b>${val(f.kitPlace)}</b></li>
            </ul>
          </div>
          <div>
            <h3>حقيبة الطوارئ (${num.format(c.days)} أيام، ${num.format(c.people)} أفراد)</h3>
            <p>الجاهزية: <b>${num.format(pct)}٪</b></p>
            ${missing.length ? `<p class="small">ينقصها:</p><ul class="small">${missing.map((i) => `<li>${esc(i.name)}${i.q ? ` — ${esc(i.q)}` : ""}</li>`).join("")}</ul>` : "<p>✓ الحقيبة مكتملة.</p>"}
          </div>
        </section>

        <section>
          <h3>ماذا نفعل في حالة…</h3>
          ${hazards.length ? hazards.map((h) => `<div class="hazard"><b>${h.icon} ${h.name}</b><ul>${h.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`).join("") : `<p class="empty">لم تُحدَّد مخاطر.</p>`}
        </section>

        ${members.length ? `<section class="cards-page">
          <h3>بطاقات الجيب — قصّها وضعها في المحفظة أو الحقيبة المدرسية</h3>
          <div class="cards">
            ${members.map((m) => `<div class="pcard">
              <div class="ph"><span style="color:inherit">${esc(m.name)}</span><span>سَنَد 🛡</span></div>
              <div><span>نلتقي عند</span><b>${val(f.meet1)}</b></div>
              <div><span>وإلا</span><b>${val(f.meet2)}</b></div>
              ${far ? `<div><span>اتصل بـ</span><b>${esc(far.name || far.relation)} <bdi dir="ltr">${esc(far.phone)}</bdi></b></div>` : ""}
              <div><span>الإسعاف</span><b>${val(f.ambulance)}</b></div>
              <div><span>فصيلة الدم</span><b>${val(m.blood)}</b></div>
              ${m.allergies ? `<div><span>حساسية</span><b>${esc(m.allergies)}</b></div>` : ""}
              ${m.meds ? `<div><span>صحة</span><b>${esc(m.meds)}</b></div>` : ""}
            </div>`).join("")}
          </div>
        </section>` : ""}
      </article>`;
  }

  function showPlan(scroll = true) {
    state.done = true;
    renderPlan();
    $("#planForm").hidden = true;
    $("#plan").hidden = false;
    renderStepper();
    save();
    if (scroll) $("#builder").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- Events ----------
  function bind() {
    const form = $("#planForm");

    form.addEventListener("input", (e) => {
      const el = e.target;
      if (el.name) {
        state.fields[el.name] = el.type === "checkbox" ? el.checked : el.value;
      } else if (el.dataset.k) {
        const row = el.closest(".row");
        const list = row.classList.contains("member") ? state.members : state.contacts;
        list[+row.dataset.i][el.dataset.k] = el.value;
      } else if (el.closest("#hazards")) {
        state.hazards = $$("#hazards input:checked").map((i) => i.value);
      } else if (el.dataset.kit) {
        state.kit[el.dataset.kit] = el.checked;
        updateKitProgress();
      }
      if (el.name === "days") renderKit();
      save();
    });

    form.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      const rm = e.target.closest("[data-remove]");
      if (add) {
        if (add.dataset.add === "member") state.members.push({ name: "", age: "", blood: "", phone: "", allergies: "", meds: "" });
        else state.contacts.push({ name: "", relation: "", phone: "", where: "داخل المدينة" });
        renderRows();
        const rows = $$(add.dataset.add === "member" ? "#members .row" : "#contacts .row");
        rows[rows.length - 1].querySelector("input").focus();
        save();
      } else if (rm) {
        const list = rm.dataset.remove === "member" ? state.members : state.contacts;
        list.splice(+rm.closest(".row").dataset.i, 1);
        renderRows();
        save();
      }
    });

    $("#nextBtn").addEventListener("click", () => {
      if (state.step < STEP_COUNT - 1) { state.step++; showStep(); save(); $("#builder").scrollIntoView({ behavior: "smooth" }); }
      else showPlan();
    });
    $("#prevBtn").addEventListener("click", () => { if (state.step > 0) { state.step--; showStep(); save(); } });

    const go = (e) => {
      const li = e.target.closest("[data-go]");
      if (!li) return;
      const i = +li.dataset.go;
      if (i === STEP_COUNT) showPlan();
      else { state.step = i; showForm(); save(); }
    };
    $("#stepper").addEventListener("click", go);
    $("#stepper").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); } });

    $("#printBtn").addEventListener("click", () => window.print());
    $("#editBtn").addEventListener("click", () => { state.step = 0; showForm(); save(); });

    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sanad-plan-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    $("#importFile").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || !Array.isArray(data.members)) throw new Error("bad");
        state = Object.assign(blank(), data);
        refreshAll();
        showPlan();
      } catch (_) {
        alert("الملف غير صالح. اختر ملفًا صدّرته من سند.");
      }
      e.target.value = "";
    });

    $("#resetBtn").addEventListener("click", () => {
      if (!confirm("سيتم حذف خطتك من هذا الجهاز. هل أنت متأكد؟")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      state = blank();
      refreshAll();
      showForm();
    });

    $("#themeToggle").addEventListener("click", () => {
      const root = document.documentElement;
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("sanad-theme", root.dataset.theme); } catch (_) {}
    });
  }

  function refreshAll() {
    fillFields();
    renderRows();
    renderHazards();
    renderKit();
  }

  try {
    const t = localStorage.getItem("sanad-theme");
    if (t) document.documentElement.dataset.theme = t;
  } catch (_) {}

  bind();
  refreshAll();
  if (state.done) showPlan(false); else showForm();
})();
