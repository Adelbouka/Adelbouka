(() => {
  "use strict";

  const CHECKED = "2026-10-19";
  const COUNTRIES = { dz: "🇩🇿 من الجزائر", ma: "🇲🇦 من المغرب", tn: "🇹🇳 من تونس" };

  // status: "ok" = confirmed from an official source; "check" = conflicting or dated sources.
  // links[0] is the primary action; only official embassy / provider domains belong here.
  const CENTERS = [
    // ---------- Algeria ----------
    { c: "dz", dest: "🇫🇷 فرنسا", provider: "Capago", status: "ok",
      cities: ["الجزائر العاصمة", "وهران", "عنابة", "قسنطينة"],
      info: "قدّم الطلب أولًا على France-Visas، ثم احجز الموعد على موقع Capago. <b>الموعد لا يُثبَّت إلا بعد دفع رسوم الخدمة خلال ٧٢ ساعة.</b> الإيداع من الأحد إلى الخميس، مع خدمة مدفوعة \"Prime Time\" خارج الأوقات العادية.",
      links: [["حجز الموعد — Capago", "https://fr-dz.capago.eu/"], ["France-Visas — الجزائر", "https://france-visas.gouv.fr/fr/algerie"]] },
    { c: "dz", dest: "🇪🇸 إسبانيا", provider: "BLS International", status: "ok",
      cities: ["الجزائر العاصمة", "وهران"],
      info: "مركزان فقط. تابع صفحة الإعلانات في الموقع الرسمي: تغييرات في أصناف التأشيرات وقواعد مواعيد الأطفال أقل من ١٢ سنة أُعلنت في ٢٠٢٦.",
      links: [["حجز الموعد — BLS الجزائر", "https://algeria.blsspainvisa.com/"]] },
    { c: "dz", dest: "🇮🇹 إيطاليا", provider: "VFS Global", status: "check",
      cities: ["الجزائر العاصمة", "وهران", "قسنطينة", "عنابة", "أدرار"],
      info: "السفارة الإيطالية تعتمد VFS Global. قائمة المدن من مصادر غير مؤرخة — تحقق قبل التنقل.",
      links: [["VFS Global — إيطاليا من الجزائر", "https://visa.vfsglobal.com/dza/fr/ita"]] },
    { c: "dz", dest: "🇩🇪 ألمانيا", provider: "VFS Global (حسب المصادر)", status: "check",
      cities: ["الجزائر العاصمة"],
      info: "مصادر غير رسمية تشير إلى VFS Global. ابدأ من موقع السفارة الألمانية فهو يحيلك إلى الجهة الصحيحة حسب نوع التأشيرة.",
      links: [["السفارة الألمانية في الجزائر", "https://algier.diplo.de/dz-en"]] },

    // ---------- Morocco ----------
    { c: "ma", dest: "🇫🇷 فرنسا", provider: "TLScontact", status: "ok",
      cities: ["الدار البيضاء", "الرباط", "طنجة", "فاس", "مراكش", "أكادير", "وجدة"],
      info: "قدّم الطلب على France-Visas، ثم احجز في مركز TLScontact التابع لمدينتك عبر الرابط الذي تعطيك إياه المنصة.",
      links: [["France-Visas — المغرب", "https://france-visas.gouv.fr/fr/maroc"]] },
    { c: "ma", dest: "🇪🇸 إسبانيا", provider: "BLS International", status: "ok",
      cities: ["الدار البيضاء", "الرباط", "طنجة", "تطوان", "الناظور", "أكادير"],
      info: "<b>BLS تنشر جدول فتح المواعيد مسبقًا على موقعها</b>، وبعض المدن تُفتح أسبوعيًا وتنفد بسرعة. يجب التقديم في المركز التابع لمنطقة سكنك. لا وجود لمواعيد \"مستعجلة دون حجز\" — هذه إشاعات نصب.",
      links: [["حجز الموعد — BLS المغرب", "https://blsspainmorocco.com/"]] },
    { c: "ma", dest: "🇮🇹 إيطاليا", provider: "VFS Global", status: "ok",
      cities: ["الدار البيضاء", "الرباط", "مراكش", "بني ملال", "طنجة"],
      info: "حسب قنصلية الدار البيضاء: الحجز عبر الإنترنت فقط على موقع VFS. تأشيرات العمل لدائرة الرباط تُودع في الدار البيضاء أو بني ملال أو مراكش منذ يونيو ٢٠٢٤.",
      links: [["حجز الموعد — VFS إيطاليا", "https://visa.vfsglobal.com/mar/fr/ita/login"]] },
    { c: "ma", dest: "🇩🇪 ألمانيا", provider: "TLScontact (حسب المصادر)", status: "check",
      cities: ["الرباط", "الدار البيضاء"],
      info: "المصادر متضاربة بين TLScontact وVFS حسب نوع التأشيرة. ابدأ من موقع السفارة الألمانية في الرباط.",
      links: [["السفارة الألمانية في الرباط", "https://rabat.diplo.de/"]] },

    // ---------- Tunisia ----------
    { c: "tn", dest: "🇫🇷 فرنسا", provider: "TLScontact", status: "ok",
      cities: ["تونس العاصمة", "صفاقس"],
      info: "مركز صفاقس خاص بفرنسا ويغطي الجنوب التونسي. قدّم الطلب على France-Visas ثم احجز في TLScontact.",
      links: [["France-Visas — تونس", "https://france-visas.gouv.fr/fr/tunisie"]] },
    { c: "tn", dest: "🇪🇸 إسبانيا", provider: "BLS International", status: "ok",
      cities: ["تونس العاصمة"],
      info: "<b>⏰ حسب BLS: تُفتح المواعيد أول أحد من كل شهر، وتخص النصف الثاني من ذلك الشهر.</b> تأكد من الإعلان الأحدث على الموقع.",
      links: [["حجز الموعد — BLS تونس", "https://tunisia.blsspainvisa.com/"]] },
    { c: "tn", dest: "🇮🇹 إيطاليا", provider: "Almaviva (AVS)", status: "ok",
      cities: ["تونس العاصمة — 8 Rue Alphonse Laveran"],
      info: "السفارة لا تستقبل طلبات المواعيد بالبريد الإلكتروني. الحجز عبر AVS على الإنترنت أو بالهاتف. أوقات العمل المذكورة رسميًا: ٩ إلى ١٧ في أيام الأسبوع، و٩ إلى ١٣ يوم السبت.",
      links: [["السفارة الإيطالية — أين أطلب التأشيرة", "https://ambtunisi.esteri.it/fr/servizi-consolari-e-visti/servizi-per-il-cittadino-straniero/visti/dove-chiedere-un-visto/"]] },
    { c: "tn", dest: "🇩🇪 ألمانيا", provider: "TLScontact", status: "ok",
      cities: ["تونس العاصمة"],
      info: "مركز TLScontact في تونس مخصص لتأشيرات ألمانيا. بعض المواقع الأخرى تذكر VFS — اعتمد على الموقع الرسمي.",
      links: [["حجز الموعد — TLScontact ألمانيا", "https://visas-de.tlscontact.com/en-us/country/tn"]] },
  ];

  const $ = (s) => document.querySelector(s);
  let country = "all";
  try { country = localStorage.getItem("dawri-centers-country") || "all"; } catch (_) {}

  const host = (u) => new URL(u).hostname.replace(/^www\./, "");

  function render() {
    const q = $("#q").value.trim().toLowerCase();
    const rows = CENTERS.filter((x) => (country === "all" || x.c === country) &&
      (!q || [x.dest, x.provider, x.cities.join(" "), COUNTRIES[x.c]].join(" ").toLowerCase().includes(q)));
    $("#grid").innerHTML = rows.length ? rows.map((x) => `
      <article class="center">
        <header>
          <div><div class="from">${COUNTRIES[x.c]}</div><h2>${x.dest}</h2></div>
          <span class="badge ${x.status}">${x.status === "ok" ? "✓ مؤكد" : "تحقّق"}</span>
        </header>
        <div>الشركة المعتمدة: <span class="provider">${x.provider}</span></div>
        <div class="cities">${x.cities.map((c) => `<span>${c}</span>`).join("")}</div>
        <p class="info">${x.info}</p>
        <div class="links">${x.links.map(([label, url], i) =>
          `<a class="btn ${i === 0 ? "primary" : "ghost"}" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗<small>${host(url)}</small></a>`).join("")}</div>
      </article>`).join("") : `<p class="none">لا توجد نتائج.</p>`;
    document.querySelectorAll("[data-country]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.country === country)));
  }

  document.querySelectorAll("[data-country]").forEach((b) => b.addEventListener("click", () => {
    country = b.dataset.country;
    try { localStorage.setItem("dawri-centers-country", country); } catch (_) {}
    render();
  }));
  $("#q").addEventListener("input", render);
  $("#checked").textContent = new Date(CHECKED).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("sanad-theme", root.dataset.theme); } catch (_) {}
  });
  try { const t = localStorage.getItem("sanad-theme"); if (t) document.documentElement.dataset.theme = t; } catch (_) {}

  render();
})();
